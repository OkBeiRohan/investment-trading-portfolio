"""
Hyperparameter tuning via Optuna with MLflow nested run tracking.

Each tier defines a search space and a lightweight objective function
that trains with a candidate param set and returns the optimisation
metric.  Trials are logged as nested child runs so they appear grouped
in the MLflow UI.
"""

import logging
from typing import Any, Callable, Optional

import mlflow
import optuna
from optuna.samplers import TPESampler

from .mlflow_tracking import hpo_study_run, hpo_trial_run, log_model_params

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Search-space definitions per tier
# ---------------------------------------------------------------------------

TIER0_SEARCH_SPACE = {
    "max_depth": ("int", 2, 8),
    "learning_rate": ("float_log", 0.01, 0.3),
    "n_estimators": ("int", 100, 500),
    "min_child_weight": ("int", 1, 10),
    "subsample": ("float", 0.5, 1.0),
    "colsample_bytree": ("float", 0.5, 1.0),
    "gamma": ("float", 0.0, 5.0),
    "reg_alpha": ("float_log", 1e-3, 10.0),
    "reg_lambda": ("float_log", 1e-3, 10.0),
}

TIER1_SEARCH_SPACE = {
    "d_model": ("int_step", 32, 128, 16),
    "n_heads": ("categorical", [2, 4, 8]),
    "e_layers": ("int", 1, 4),
    "learning_rate": ("float_log", 1e-4, 1e-2),
    "patch_length": ("int", 3, 10),
    "dropout": ("float", 0.0, 0.3),
    "batch_size": ("categorical", [32, 64, 128]),
    "epochs": ("int", 5, 20),
}

TIER2_SEARCH_SPACE = {
    "num_leaves": ("int", 15, 63),
    "learning_rate": ("float_log", 0.005, 0.1),
    "feature_fraction": ("float", 0.5, 1.0),
    "bagging_fraction": ("float", 0.5, 1.0),
    "bagging_freq": ("int", 1, 10),
    "max_depth": ("int", 3, 10),
    "min_data_in_leaf": ("int", 10, 50),
    "num_boost_round": ("int", 200, 1000),
    "early_stopping_rounds": ("int", 20, 60),
}

TIER3_SEARCH_SPACE = {
    "d_model": ("int_step", 16, 64, 16),
    "n_layers": ("int", 1, 4),
    "learning_rate": ("float_log", 1e-4, 1e-2),
    "batch_size": ("categorical", [64, 128, 256, 512]),
    "epochs": ("int", 3, 10),
    "sequence_length": ("int", 10, 30),
}

META_SEARCH_SPACE = {
    "hidden_size": ("int_step", 16, 64, 16),
    "learning_rate": ("float_log", 5e-4, 5e-3),
    "regime_penalty": ("float", 1.0, 5.0),
    "temporal_weight": ("float_log", 0.01, 0.5),
    "epochs": ("int", 10, 40),
    "batch_size": ("categorical", [64, 128, 256]),
    "dropout": ("float", 0.05, 0.3),
}

SEARCH_SPACES: dict[int | str, dict] = {
    0: TIER0_SEARCH_SPACE,
    1: TIER1_SEARCH_SPACE,
    2: TIER2_SEARCH_SPACE,
    3: TIER3_SEARCH_SPACE,
    "meta": META_SEARCH_SPACE,
}


def _suggest_param(trial: optuna.Trial, name: str, spec: tuple) -> Any:
    """Convert a spec tuple into an Optuna suggest call."""
    kind = spec[0]
    if kind == "int":
        return trial.suggest_int(name, spec[1], spec[2])
    elif kind == "int_step":
        return trial.suggest_int(name, spec[1], spec[2], step=spec[3])
    elif kind == "float":
        return trial.suggest_float(name, spec[1], spec[2])
    elif kind == "float_log":
        return trial.suggest_float(name, spec[1], spec[2], log=True)
    elif kind == "categorical":
        return trial.suggest_categorical(name, spec[1])
    else:
        raise ValueError(f"Unknown param type: {kind}")


def sample_params(trial: optuna.Trial, tier: int | str) -> dict[str, Any]:
    """Sample a full parameter dict from the tier's search space."""
    space = SEARCH_SPACES.get(tier, {})
    return {name: _suggest_param(trial, name, spec) for name, spec in space.items()}


def run_hpo_study(
    tier: int | str,
    objective_fn: Callable[[dict[str, Any]], float],
    n_trials: int = 30,
    direction: str = "minimize",
    base_config: Optional[dict[str, Any]] = None,
    timeout: Optional[int] = None,
) -> dict[str, Any]:
    """
    Run an Optuna hyperparameter study for the given tier.

    Parameters
    ----------
    tier : int | str
        Which tier's search space to use.
    objective_fn : callable
        Accepts a merged config dict (base_config + trial params) and
        returns the metric to optimise (e.g. validation loss).
    n_trials : int
        Number of Optuna trials.
    direction : str
        ``"minimize"`` or ``"maximize"``.
    base_config : dict, optional
        Fixed config keys that are merged with sampled params.
    timeout : int, optional
        Maximum wall-clock seconds for the study.

    Returns
    -------
    dict with ``best_params``, ``best_value``, ``study_summary``,
    ``best_trial_run_id``.
    """
    base = dict(base_config or {})

    with hpo_study_run(tier=tier, n_trials=n_trials) as study_run:
        study_run_id = study_run.info.run_id

        def _objective(trial: optuna.Trial) -> float:
            params = sample_params(trial, tier)

            with hpo_trial_run(trial_number=trial.number) as child_run:
                merged = {**base, **params}
                log_model_params(params, prefix=f"hpo_tier{tier}")

                metric_value = objective_fn(merged)

                mlflow.log_metric("objective_value", metric_value)
                trial.set_user_attr("run_id", child_run.info.run_id)
                return metric_value

        sampler = TPESampler(seed=42, n_startup_trials=min(10, n_trials // 3))
        study = optuna.create_study(
            direction=direction,
            sampler=sampler,
            study_name=f"tier_{tier}_hpo",
        )

        optuna.logging.set_verbosity(optuna.logging.WARNING)
        study.optimize(_objective, n_trials=n_trials, timeout=timeout)

        mlflow.log_params({f"best_{k}": v for k, v in study.best_params.items()})
        mlflow.log_metric("best_objective_value", study.best_value)
        mlflow.log_metric("n_completed_trials", len(study.trials))

        importance = _compute_param_importance(study)
        if importance:
            mlflow.log_dict(importance, "param_importance.json")

        summary = _build_study_summary(study)
        mlflow.log_dict(summary, "study_summary.json")

        best_run_id = study.best_trial.user_attrs.get("run_id")
        if best_run_id:
            mlflow.log_param("best_child_run_id", best_run_id)

        logger.info(
            "HPO study for tier %s complete: best_value=%.6f after %d trials",
            tier, study.best_value, len(study.trials),
        )

    return {
        "best_params": study.best_params,
        "best_value": study.best_value,
        "best_trial_run_id": best_run_id,
        "study_run_id": study_run_id,
        "study_summary": summary,
        "n_trials_completed": len(study.trials),
    }


def _compute_param_importance(study: optuna.Study) -> dict:
    """Compute parameter importance using fANOVA if enough trials exist."""
    try:
        if len(study.trials) < 5:
            return {}
        importance = optuna.importance.get_param_importances(study)
        return {k: round(v, 6) for k, v in importance.items()}
    except Exception as e:
        logger.warning("Could not compute param importance: %s", e)
        return {}


def _build_study_summary(study: optuna.Study) -> dict:
    """Build a JSON-serialisable summary of all trials."""
    trials = []
    for t in study.trials:
        trials.append({
            "number": t.number,
            "value": t.value,
            "params": t.params,
            "state": str(t.state),
            "duration_seconds": (
                (t.datetime_complete - t.datetime_start).total_seconds()
                if t.datetime_complete and t.datetime_start
                else None
            ),
        })

    return {
        "best_trial": study.best_trial.number,
        "best_value": study.best_value,
        "best_params": study.best_params,
        "n_trials": len(study.trials),
        "trials": trials,
    }
