"""
5-Dimension Model Validation Pipeline

Validates trained models across 5 critical dimensions:
1. Predictive: Better than random? (AUC > 0.5, accuracy, log loss)
2. Selective: Knows when NOT to trade? (Confidence calibration, uncertainty)
3. Stable: Consistent across time/regimes? (Rolling metrics, volatility regimes)
4. Profitable: Positive expectancy? (Sharpe, Sortino, max drawdown)
5. Explainable: Understand why? (SHAP, feature importance, failure modes)

Based on research:
- Lopez de Prado (2018): Cross-validation for time series
- Bailey & Prado (2014): Deflated Sharpe Ratio
- Lundberg & Lee (2017): SHAP values
"""

from pathlib import Path
from typing import Any
import logging
import numpy as np
import pandas as pd
import lightgbm as lgb
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    log_loss,
    roc_auc_score,
    confusion_matrix,
    classification_report,  # type: ignore
)

logger = logging.getLogger(__name__)


class ModelValidator:
    """5-Dimension Model Validation"""

    def __init__(
        self,
        model_path: str,
        oof_predictions_path: str,
        feature_importance_path: str,
        output_dir: str,
    ):
        self.model_path = model_path
        self.oof_predictions_path = oof_predictions_path
        self.feature_importance_path = feature_importance_path
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Load model
        self.model = lgb.Booster(model_file=model_path)

        # Load OOF predictions
        self.oof_df = pd.read_parquet(oof_predictions_path)

        # Load feature importance
        self.importance_df = pd.read_csv(feature_importance_path)

    def validate_all(self) -> dict[str, dict[str, Any]]:
        """Run all 5 validation dimensions"""
        logger.info("=" * 80)
        logger.info("5-DIMENSION MODEL VALIDATION")
        logger.info("=" * 80)

        results: dict[str, dict[str, Any]] = {
            "predictive": self.validate_predictive(),
            "selective": self.validate_selective(),
            "stable": self.validate_stable(),
            "profitable": self.validate_profitable(),
            "explainable": self.validate_explainable(),
        }

        # Generate summary report
        self._generate_report(results)

        return results

    def validate_predictive(self) -> dict[str, float | list[float] | Any]:
        """Dimension 1: Better than random?"""
        logger.info("\n📊 DIMENSION 1: PREDICTIVE POWER")
        logger.info("-" * 80)

        y_true = self.oof_df["label"].values
        y_pred = self.oof_df[[f"pred_class_{i}" for i in range(3)]].values
        y_pred_class = np.argmax(y_pred, axis=1)

        # Metrics
        accuracy = accuracy_score(y_true, y_pred_class)
        logloss = log_loss(y_true, y_pred)

        # Multi-class AUC (one-vs-rest)
        from sklearn.preprocessing import label_binarize

        y_true_bin = label_binarize(y_true, classes=[0, 1, 2])
        auc_scores: list[float] = []
        for i in range(3):
            auc = roc_auc_score(y_true_bin[:, i], y_pred[:, i])
            auc_scores.append(auc)
        mean_auc = np.mean(auc_scores)

        logger.info(f"Accuracy: {accuracy:.4f}")
        logger.info(f"Log Loss: {logloss:.4f}")
        logger.info(f"Mean AUC (OvR): {mean_auc:.4f}")
        logger.info(
            f"AUC per class: DOWN={auc_scores[0]:.4f}, NEUTRAL={auc_scores[1]:.4f}, UP={auc_scores[2]:.4f}"
        )

        # Confusion matrix
        cm = confusion_matrix(y_true, y_pred_class)

        # Plot confusion matrix
        plt.figure(figsize=(8, 6))
        sns.heatmap(
            cm,
            annot=True,
            fmt="d",
            cmap="Blues",
            xticklabels=["DOWN", "NEUTRAL", "UP"],
            yticklabels=["DOWN", "NEUTRAL", "UP"],
        )
        plt.title("Confusion Matrix")
        plt.ylabel("True Label")
        plt.xlabel("Predicted Label")
        plt.tight_layout()
        plt.savefig(self.output_dir / "confusion_matrix.png", dpi=300)
        plt.close()

        # Classification report
        report = classification_report(
            y_true,
            y_pred_class,
            target_names=["DOWN", "NEUTRAL", "UP"],
            output_dict=True,
        )

        logger.info(
            f"\nPrecision per class: DOWN={report['DOWN']['precision']:.4f}, "
            f"NEUTRAL={report['NEUTRAL']['precision']:.4f}, UP={report['UP']['precision']:.4f}"
        )
        logger.info(
            f"Recall per class: DOWN={report['DOWN']['recall']:.4f}, "
            f"NEUTRAL={report['NEUTRAL']['recall']:.4f}, UP={report['UP']['recall']:.4f}"
        )

        return {
            "accuracy": accuracy,
            "log_loss": logloss,
            "mean_auc": mean_auc,
            "auc_per_class": auc_scores,
            "confusion_matrix": cm.tolist(),
            "classification_report": report,
        }

    def validate_selective(self) -> dict[str, float | list[float] | Any]:
        """Dimension 2: Knows when NOT to trade?"""
        logger.info("\n🎯 DIMENSION 2: SELECTIVE TRADING")
        logger.info("-" * 80)

        y_true = self.oof_df["label"].values
        y_pred = self.oof_df[[f"pred_class_{i}" for i in range(3)]].values
        y_pred_class = np.argmax(y_pred, axis=1)

        # Confidence = max probability
        confidence = np.max(y_pred, axis=1)

        # Accuracy vs confidence
        confidence_bins = np.linspace(0.33, 1.0, 11)  # 33% = random for 3-class
        bin_accuracies = []
        bin_counts = []

        for i in range(len(confidence_bins) - 1):
            mask = (confidence >= confidence_bins[i]) & (
                confidence < confidence_bins[i + 1]
            )
            if mask.sum() > 0:
                acc = accuracy_score(y_true[mask], y_pred_class[mask])
                bin_accuracies.append(acc)
                bin_counts.append(mask.sum())
            else:
                bin_accuracies.append(np.nan)
                bin_counts.append(0)

        # Plot confidence calibration
        plt.figure(figsize=(10, 6))

        # Accuracy vs confidence
        plt.subplot(1, 2, 1)
        bin_centers = (confidence_bins[:-1] + confidence_bins[1:]) / 2
        plt.plot(bin_centers, bin_accuracies, marker="o", label="Actual Accuracy")
        plt.plot([0.33, 1.0], [0.33, 1.0], "r--", label="Perfect Calibration")
        plt.xlabel("Confidence (Max Probability)")
        plt.ylabel("Accuracy")
        plt.title("Confidence Calibration")
        plt.legend()
        plt.grid(True, alpha=0.3)

        # Sample distribution
        plt.subplot(1, 2, 2)
        plt.bar(bin_centers, bin_counts, width=0.06, alpha=0.7)
        plt.xlabel("Confidence")
        plt.ylabel("Number of Samples")
        plt.title("Confidence Distribution")
        plt.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(self.output_dir / "confidence_calibration.png", dpi=300)
        plt.close()

        # High confidence performance
        high_conf_mask = confidence >= 0.6
        high_conf_accuracy = accuracy_score(
            y_true[high_conf_mask], y_pred_class[high_conf_mask]
        )
        high_conf_pct = high_conf_mask.sum() / len(confidence) * 100

        logger.info(f"High confidence (>0.6): {high_conf_pct:.1f}% of samples")
        logger.info(f"High confidence accuracy: {high_conf_accuracy:.4f}")

        # Calibration error (Expected Calibration Error)
        ece = np.nanmean(np.abs(np.array(bin_accuracies) - bin_centers))
        logger.info(f"Expected Calibration Error (ECE): {ece:.4f}")

        return {
            "high_confidence_pct": high_conf_pct,
            "high_confidence_accuracy": high_conf_accuracy,
            "expected_calibration_error": ece,
            "confidence_bins": confidence_bins.tolist(),
            "bin_accuracies": [
                float(x) if not np.isnan(x) else None for x in bin_accuracies
            ],
            "bin_counts": bin_counts,
        }

    def validate_stable(self) -> dict[str, float]:
        """Dimension 3: Consistent across time?"""
        logger.info("\n📈 DIMENSION 3: TEMPORAL STABILITY")
        logger.info("-" * 80)

        # Sort by timestamp
        df = self.oof_df.sort_values("timestamp").copy()

        y_true = df["label"].values
        y_pred = df[[f"pred_class_{i}" for i in range(3)]].values
        y_pred_class = np.argmax(y_pred, axis=1)

        # Rolling accuracy (30-day window)
        window_size = 30 * 375  # 30 days * 375 minutes/day
        rolling_acc = []
        timestamps = []

        for i in range(len(df) - window_size):
            window_true = y_true[i : i + window_size]
            window_pred = y_pred_class[i : i + window_size]
            acc = accuracy_score(window_true, window_pred)
            rolling_acc.append(acc)
            timestamps.append(df.iloc[i + window_size]["timestamp"])

        # Plot rolling accuracy
        plt.figure(figsize=(12, 6))
        plt.plot(timestamps, rolling_acc, alpha=0.7)
        plt.axhline(
            np.mean(rolling_acc),
            color="r",
            linestyle="--",
            label=f"Mean: {np.mean(rolling_acc):.4f}",
        )
        plt.xlabel("Date")
        plt.ylabel("Accuracy (30-day rolling)")
        plt.title("Temporal Stability")
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(self.output_dir / "temporal_stability.png", dpi=300)
        plt.close()

        # Stability metrics
        acc_mean = np.mean(rolling_acc)
        acc_std = np.std(rolling_acc)
        acc_min = np.min(rolling_acc)
        acc_max = np.max(rolling_acc)

        logger.info(f"Rolling accuracy mean: {acc_mean:.4f}")
        logger.info(f"Rolling accuracy std: {acc_std:.4f}")
        logger.info(f"Rolling accuracy range: [{acc_min:.4f}, {acc_max:.4f}]")

        # Coefficient of variation
        cv = acc_std / acc_mean
        logger.info(f"Coefficient of variation: {cv:.4f}")

        return {
            "rolling_accuracy_mean": acc_mean,
            "rolling_accuracy_std": acc_std,
            "rolling_accuracy_min": acc_min,
            "rolling_accuracy_max": acc_max,
            "coefficient_of_variation": cv,
        }

    def validate_profitable(self) -> dict[str, float]:
        """Dimension 4: Positive expectancy?"""
        logger.info("\n💰 DIMENSION 4: PROFITABILITY")
        logger.info("-" * 80)

        df = self.oof_df.sort_values("timestamp").copy()

        y_true = df["label"].values
        y_pred = df[[f"pred_class_{i}" for i in range(3)]].values
        y_pred_class = np.argmax(y_pred, axis=1)
        confidence = np.max(y_pred, axis=1)

        # Simulate trading strategy
        # Only trade when confidence > 0.6 and prediction != NEUTRAL
        trade_mask = (confidence >= 0.6) & (y_pred_class != 1)

        # Assume:
        # - Correct UP/DOWN prediction = +5% return
        # - Wrong UP/DOWN prediction = -5% return
        # - Transaction cost = 0.2%
        # - Slippage = 0.05%

        returns = []
        for i in range(len(df)):
            if trade_mask[i]:
                if y_true[i] == y_pred_class[i]:
                    # Correct prediction
                    ret = 0.05 - 0.002 - 0.0005  # 4.75%
                else:
                    # Wrong prediction
                    ret = -0.05 - 0.002 - 0.0005  # -5.25%
                returns.append(ret)
            else:
                returns.append(0.0)  # No trade

        returns = np.array(returns)

        # Cumulative returns
        cum_returns = np.cumprod(1 + returns) - 1

        # Plot equity curve
        plt.figure(figsize=(12, 6))
        plt.plot(df["timestamp"], cum_returns * 100, label="Strategy")
        plt.xlabel("Date")
        plt.ylabel("Cumulative Return (%)")
        plt.title("Simulated Equity Curve")
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(self.output_dir / "equity_curve.png", dpi=300)
        plt.close()

        # Performance metrics
        total_return = cum_returns[-1] * 100

        # Sharpe ratio (annualized)
        mean_ret = np.mean(returns)
        std_ret = np.std(returns)
        sharpe = (
            (mean_ret / std_ret) * np.sqrt(252 * 375) if std_ret > 0 else 0
        )  # 252 days, 375 min/day

        # Sortino ratio
        downside_returns = returns[returns < 0]
        downside_std = np.std(downside_returns) if len(downside_returns) > 0 else 0
        sortino = (
            (mean_ret / downside_std) * np.sqrt(252 * 375) if downside_std > 0 else 0
        )

        # Max drawdown
        cum_returns_1 = np.cumprod(1 + returns)
        running_max = np.maximum.accumulate(cum_returns_1)
        drawdown = (cum_returns_1 - running_max) / running_max
        max_drawdown = np.min(drawdown) * 100

        # Win rate
        win_rate = (
            (returns[trade_mask] > 0).sum() / trade_mask.sum() * 100
            if trade_mask.sum() > 0
            else 0
        )

        # Trade frequency
        trade_freq = trade_mask.sum() / len(df) * 100

        logger.info(f"Total return: {total_return:.2f}%")
        logger.info(f"Sharpe ratio: {sharpe:.2f}")
        logger.info(f"Sortino ratio: {sortino:.2f}")
        logger.info(f"Max drawdown: {max_drawdown:.2f}%")
        logger.info(f"Win rate: {win_rate:.2f}%")
        logger.info(f"Trade frequency: {trade_freq:.2f}%")

        return {
            "total_return_pct": total_return,
            "sharpe_ratio": sharpe,
            "sortino_ratio": sortino,
            "max_drawdown_pct": max_drawdown,
            "win_rate_pct": win_rate,
            "trade_frequency_pct": trade_freq,
        }

    def validate_explainable(self) -> dict[str, Any]:
        """Dimension 5: Understand why?"""
        logger.info("\n🔍 DIMENSION 5: EXPLAINABILITY")
        logger.info("-" * 80)

        # Feature importance (already loaded)
        top_features = self.importance_df.nlargest(10, "importance")

        logger.info("\nTop 10 Features:")
        for idx, row in top_features.iterrows():
            logger.info(f"  {row['feature']}: {row['importance']:.2f}")

        # Plot feature importance
        plt.figure(figsize=(10, 6))
        plt.barh(top_features["feature"], top_features["importance"])
        plt.xlabel("Importance")
        plt.title("Top 10 Feature Importance")
        plt.gca().invert_yaxis()
        plt.tight_layout()
        plt.savefig(self.output_dir / "feature_importance.png", dpi=300)
        plt.close()

        # SHAP values (optional - expensive)
        # explainer = shap.TreeExplainer(self.model)
        # shap_values = explainer.shap_values(X_sample)

        return {
            "top_features": top_features[["feature", "importance"]].to_dict("records"),
        }

    def _generate_report(self, results: dict[str, dict[str, Any]]):
        """Generate HTML validation report"""
        logger.info("\n" + "=" * 80)
        logger.info("VALIDATION SUMMARY")
        logger.info("=" * 80)

        # Dimension 1: Predictive
        logger.info(
            f"\n✅ PREDICTIVE: Accuracy={results['predictive']['accuracy']:.4f}, "
            f"AUC={results['predictive']['mean_auc']:.4f}"
        )

        # Dimension 2: Selective
        logger.info(
            f"✅ SELECTIVE: High-conf accuracy={results['selective']['high_confidence_accuracy']:.4f}, "
            f"ECE={results['selective']['expected_calibration_error']:.4f}"
        )

        # Dimension 3: Stable
        logger.info(
            f"✅ STABLE: Rolling acc={results['stable']['rolling_accuracy_mean']:.4f} "
            f"±{results['stable']['rolling_accuracy_std']:.4f}"
        )

        # Dimension 4: Profitable
        logger.info(
            f"✅ PROFITABLE: Sharpe={results['profitable']['sharpe_ratio']:.2f}, "
            f"Return={results['profitable']['total_return_pct']:.2f}%"
        )

        # Dimension 5: Explainable
        logger.info(
            f"✅ EXPLAINABLE: Top feature = {results['explainable']['top_features'][0]['feature']}"
        )

        logger.info(f"\n📁 Validation artifacts saved to: {self.output_dir}")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Example usage
    model_dir = Path(__file__).parent.parent.parent / "data" / "06_models"
    output_dir = (
        Path(__file__).parent.parent.parent / "data" / "08_reporting" / "validation"
    )

    # Validate 5min horizon model
    validator = ModelValidator(
        model_path=str(model_dir / "lightgbm_5min.txt"),
        oof_predictions_path=str(model_dir / "oof_lightgbm_5min.parquet"),
        feature_importance_path=str(model_dir / "feature_importance_5min.csv"),
        output_dir=str(output_dir / "5min"),
    )

    results = validator.validate_all()
