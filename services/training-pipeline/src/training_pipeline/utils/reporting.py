"""
Training report generation — JSON summary, HTML dashboard, per-tier
evaluation artifacts, and MLflow artifact logging.

Reports are saved to ``data/08_reporting/`` and logged as MLflow
artifacts for UI access.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

import mlflow

logger = logging.getLogger(__name__)

REPORT_DIR = "data/08_reporting"

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Training Report — {timestamp}</title>
<style>
  body {{ font-family: system-ui, sans-serif; margin: 2rem; background: #fafafa; color: #222; }}
  h1 {{ border-bottom: 2px solid #2563eb; padding-bottom: .5rem; }}
  h2 {{ color: #2563eb; margin-top: 2rem; }}
  table {{ border-collapse: collapse; width: 100%; margin: 1rem 0; }}
  th, td {{ border: 1px solid #ddd; padding: .5rem .75rem; text-align: left; }}
  th {{ background: #f1f5f9; font-weight: 600; }}
  tr:nth-child(even) {{ background: #f8fafc; }}
  .pass {{ color: #16a34a; font-weight: bold; }}
  .fail {{ color: #dc2626; font-weight: bold; }}
  .metric-value {{ font-family: monospace; }}
  .section {{ background: white; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; box-shadow: 0 1px 3px rgba(0,0,0,.1); }}
  .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }}
  .summary-card {{ background: #eff6ff; border-radius: 6px; padding: 1rem; text-align: center; }}
  .summary-card .value {{ font-size: 1.5rem; font-weight: bold; color: #1d4ed8; }}
  .summary-card .label {{ font-size: .85rem; color: #64748b; }}
</style>
</head>
<body>
<h1>Training Pipeline Report</h1>
<p>Generated: {timestamp} UTC</p>

<div class="section">
<h2>Summary</h2>
<div class="summary-grid">
{summary_cards}
</div>
</div>

<div class="section">
<h2>Tier Metrics</h2>
{tier_tables}
</div>

<div class="section">
<h2>Artifacts</h2>
<table>
<tr><th>Name</th><th>Path</th></tr>
{artifact_rows}
</table>
</div>

<div class="section">
<h2>Quality Gate</h2>
<p>Status: <span class="{gate_class}">{gate_status}</span></p>
{gate_details}
</div>

</body>
</html>
"""


def generate_report(
    all_metrics: dict[str, Any],
    artifact_paths: dict[str, str],
    report_dir: str = REPORT_DIR,
    gate_passed: Optional[bool] = None,
    gate_reason: Optional[str] = None,
    evaluation_results: Optional[dict[str, Any]] = None,
) -> dict:
    """
    Write a consolidated JSON + HTML report and log as MLflow artifacts.

    Parameters
    ----------
    all_metrics : dict
        Nested or flat metrics from all tiers + meta-learner.
    artifact_paths : dict
        Logical-name -> file-path mapping of all produced artifacts.
    report_dir : str
        Directory to write reports to.
    gate_passed : bool, optional
        Quality gate result.
    gate_reason : str, optional
        Quality gate failure reason.
    evaluation_results : dict, optional
        Per-tier evaluation result summaries from model_evaluator.

    Returns
    -------
    dict with ``report_path``, ``html_path`` and summary info.
    """
    os.makedirs(report_dir, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    report = {
        "generated_at": ts,
        "metrics": _serialise(all_metrics),
        "artifacts": artifact_paths,
        "summary": _build_summary(all_metrics),
        "quality_gate": {"passed": gate_passed, "reason": gate_reason},
    }
    if evaluation_results:
        report["evaluation"] = _serialise(evaluation_results)

    json_path = os.path.join(report_dir, f"training_report_{ts}.json")
    with open(json_path, "w") as f:
        json.dump(report, f, indent=2, default=str)

    html_path = os.path.join(report_dir, f"training_report_{ts}.html")
    html_content = _render_html(ts, all_metrics, artifact_paths, gate_passed, gate_reason)
    with open(html_path, "w") as f:
        f.write(html_content)

    try:
        if mlflow.active_run():
            mlflow.log_artifact(json_path, artifact_path="reports")
            mlflow.log_artifact(html_path, artifact_path="reports")
            mlflow.log_dict(report["summary"], "report_summary.json")
            logger.info("Reports logged as MLflow artifacts")
    except Exception as e:
        logger.warning("Could not log reports to MLflow: %s", e)

    logger.info("Training report written to %s and %s", json_path, html_path)
    return {
        "report_path": json_path,
        "html_path": html_path,
        "summary": report["summary"],
    }


def _render_html(
    ts: str,
    all_metrics: dict,
    artifact_paths: dict,
    gate_passed: Optional[bool],
    gate_reason: Optional[str],
) -> str:
    """Render the HTML report from metrics and artifacts."""
    summary = _build_summary(all_metrics)
    summary_cards = ""
    for key, value in summary.items():
        if isinstance(value, (int, float)):
            display = f"{value:.4f}" if isinstance(value, float) else str(value)
            label = key.replace("_", " ").title()
            summary_cards += (
                f'<div class="summary-card">'
                f'<div class="value">{display}</div>'
                f'<div class="label">{label}</div>'
                f'</div>\n'
            )

    tier_tables = ""
    for tier_key, tier_metrics in all_metrics.items():
        if not isinstance(tier_metrics, dict):
            continue
        tier_tables += f"<h3>{tier_key}</h3>\n<table>\n<tr><th>Metric</th><th>Value</th></tr>\n"
        for mk, mv in tier_metrics.items():
            if isinstance(mv, (int, float)):
                display = f"{mv:.6f}" if isinstance(mv, float) else str(mv)
                tier_tables += f'<tr><td>{mk}</td><td class="metric-value">{display}</td></tr>\n'
        tier_tables += "</table>\n"

    artifact_rows = ""
    for name, path in artifact_paths.items():
        artifact_rows += f"<tr><td>{name}</td><td>{path}</td></tr>\n"

    gate_class = "pass" if gate_passed else "fail"
    gate_status = "PASSED" if gate_passed else ("FAILED" if gate_passed is False else "N/A")
    gate_details = f"<p>{gate_reason or ''}</p>"

    return HTML_TEMPLATE.format(
        timestamp=ts,
        summary_cards=summary_cards,
        tier_tables=tier_tables,
        artifact_rows=artifact_rows,
        gate_class=gate_class,
        gate_status=gate_status,
        gate_details=gate_details,
    )


def _build_summary(metrics: dict) -> dict:
    """Extract the most important headline numbers."""
    summary: dict[str, Any] = {}
    flat = _flatten(metrics)

    for key in [
        "tier_0_direction_accuracy", "direction_accuracy",
        "tier_0_mae", "mae",
        "tier_1_hmm_avg_persistence_days", "hmm_avg_persistence_days",
        "tier_1_patchtst_avg_mse", "patchtst_avg_mse",
        "tier_2_auc_5m", "auc_5m",
        "tier_2_auc_std_5m", "auc_std_5m",
        "tier_3_lit_direction_accuracy", "lit_direction_accuracy",
        "meta_val_loss", "meta_meta_val_loss",
    ]:
        if key in flat:
            summary[key] = flat[key]

    shap_keys = [k for k in flat if "shap" in k.lower()]
    for k in shap_keys[:3]:
        summary[k] = flat[k]

    return summary


def _flatten(d: dict, prefix: str = "") -> dict:
    out: dict = {}
    for k, v in d.items():
        key = f"{prefix}_{k}" if prefix else k
        if isinstance(v, dict):
            out.update(_flatten(v, key))
        else:
            out[key] = v
    return out


def _serialise(obj: Any) -> Any:
    """Make an object JSON-safe."""
    if isinstance(obj, dict):
        return {k: _serialise(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_serialise(i) for i in obj]
    if isinstance(obj, float):
        if obj != obj:  # NaN
            return None
        return round(obj, 6)
    return obj
