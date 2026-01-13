"""
Train Ensemble Pipeline

Orchestrates training of all Level-0 models with walk-forward validation
"""

from typing import Any

from kedro.pipeline import Pipeline, node  # type: ignore

from .nodes import (
    load_training_data,
    train_lightgbm,
    train_xgboost,
    train_cnn_lstm,
    train_ginn,
    train_svm,
    train_transformer,
)


def create_pipeline(**kwargs: Any) -> Pipeline:  # type: ignore[misc]  # type: ignore
    """
    Create train_ensemble pipeline

    Flow:
    1. Load pre-computed features from QuestDB
    2. Train Level-0 models (TIER 1: 6 core + TIER 2: 2 conditional)
    3. Save models and OOF predictions for meta-learner
    """
    return Pipeline(
        [
            # ================================================================
            # Data Loading
            # ================================================================
            node(
                func=load_training_data,
                inputs={
                    "questdb_connection": "params:questdb_connection",
                    "training_period_days": "params:training_period_days",
                    "symbol": "params:symbol",
                },
                outputs="training_data",
                name="load_training_data",
            ),
            # ================================================================
            # TIER 1 - Core Models (Always-On)
            # ================================================================
            # 1. LightGBM (IMPLEMENTED)
            node(
                func=train_lightgbm,
                inputs={
                    "lightgbm_data": "training_data.lightgbm_data",
                    "training_config": "params:training_config",
                    "lightgbm_config": "params:lightgbm_config",
                    "labeling_config": "params:labeling_config",
                },
                outputs="lightgbm_result",
                name="train_lightgbm",
            ),
            # 2. XGBoost (PLACEHOLDER)
            node(
                func=train_xgboost,
                inputs={
                    "lightgbm_data": "training_data.lightgbm_data",
                    "training_config": "params:training_config",
                },
                outputs="xgboost_result",
                name="train_xgboost",
            ),
            # 3. CNN-LSTM (PLACEHOLDER)
            node(
                func=train_cnn_lstm,
                inputs={
                    "lightgbm_data": "training_data.lightgbm_data",
                    "training_config": "params:training_config",
                },
                outputs="cnn_lstm_result",
                name="train_cnn_lstm",
            ),
            # 4. GINN (PLACEHOLDER)
            node(
                func=train_ginn,
                inputs={
                    "lightgbm_data": "training_data.lightgbm_data",
                    "training_config": "params:training_config",
                },
                outputs="ginn_result",
                name="train_ginn",
            ),
            # 5. SVM (PLACEHOLDER)
            node(
                func=train_svm,
                inputs={
                    "lightgbm_data": "training_data.lightgbm_data",
                    "training_config": "params:training_config",
                },
                outputs="svm_result",
                name="train_svm",
            ),
            # 6. Transformer (PLACEHOLDER)
            node(
                func=train_transformer,
                inputs={
                    "lightgbm_data": "training_data.lightgbm_data",
                    "training_config": "params:training_config",
                },
                outputs="transformer_result",
                name="train_transformer",
            ),
            # ================================================================
            # TIER 2 - Conditional Models (Regime-Activated)
            # ================================================================
            # 7. TFT (PLACEHOLDER - requires TFT features)
            # node(
            #     func=train_tft,
            #     inputs={
            #         "tft_data": "training_data.tft_data",
            #         "training_config": "params:training_config",
            #     },
            #     outputs="tft_result",
            #     name="train_tft",
            # ),
            # 8. LiT (PLACEHOLDER - requires LOB tensors)
            # node(
            #     func=train_lit,
            #     inputs={
            #         "lit_data": "training_data.lit_data",
            #         "training_config": "params:training_config",
            #     },
            #     outputs="lit_result",
            #     name="train_lit",
            # ),
        ]
    )
