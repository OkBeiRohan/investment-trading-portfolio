# src/training_pipeline/pipelines/train_ensemble/models/xgboost_trainer.py
import xgboost as xgb
import mlflow
from sklearn.metrics import roc_auc_score, accuracy_score
from typing import Dict, Any


def train_xgboost_model(
    train_features: pd.DataFrame,
    train_labels: pd.Series,
    val_features: pd.DataFrame,
    val_labels: pd.Series,
    parameters: Dict[str, Any],
) -> xgb.XGBClassifier:
    """
    Train XGBoost classifier with MLflow tracking
    """
    # Start MLflow run
    with mlflow.start_run(run_name="xgboost_training"):
        # Log parameters
        mlflow.log_params(parameters)

        # Create model
        model = xgb.XGBClassifier(
            max_depth=parameters["max_depth"],
            learning_rate=parameters["learning_rate"],
            n_estimators=parameters["n_estimators"],
            subsample=parameters["subsample"],
            colsample_bytree=parameters["colsample_bytree"],
            objective=parameters["objective"],
            eval_metric=parameters["eval_metric"],
            early_stopping_rounds=parameters["early_stopping_rounds"],
            random_state=42,
            use_label_encoder=False,
            tree_method="gpu_hist",  # GPU acceleration
            gpu_id=0,
        )

        # Train with validation
        model.fit(
            train_features,
            train_labels,
            eval_set=[(val_features, val_labels)],
            verbose=100,
        )

        # Evaluate
        val_preds = model.predict(val_features)
        val_proba = model.predict_proba(val_features)[:, 1]

        accuracy = accuracy_score(val_labels, val_preds)
        auc = roc_auc_score(val_labels, val_proba)

        # Log metrics
        mlflow.log_metric("accuracy", accuracy)
        mlflow.log_metric("auc", auc)

        # Log feature importance
        importance_dict = {
            f"feature_{i}": imp for i, imp in enumerate(model.feature_importances_)
        }
        mlflow.log_dict(importance_dict, "feature_importance.json")

        # Log model
        mlflow.xgboost.log_model(model, "model")

        print(f"✅ XGBoost trained - Accuracy: {accuracy:.4f}, AUC: {auc:.4f}")

        return model
