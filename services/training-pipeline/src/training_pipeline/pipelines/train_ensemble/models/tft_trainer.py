"""
Temporal Fusion Transformer (TFT) Trainer (PLACEHOLDER)

TIER 2 - Conditional (Activated in high-volatility regimes)

TODO: Implement TFT when compute-engine provides TFT features
- Requires 120 timesteps × 15 temporal features
- Multi-horizon forecasting
- Variable selection networks
"""

import logging

import pandas as pd

logger = logging.getLogger(__name__)


class TFTTrainer:
    """
    TFT trainer for index options trading (PLACEHOLDER)

    TODO: Implement when TFT feature schema finalized in compute-engine
    """

    def __init__(self) -> None:
        logger.warning(
            "TFT trainer is a placeholder - requires TFT features from compute-engine"
        )
        pass

    def train(self, features: pd.DataFrame, labels: pd.Series) -> None:
        """Train TFT model (PLACEHOLDER)"""
        raise NotImplementedError(
            "TFT trainer not yet implemented - "
            "compute-engine must first define TFT feature schema"
        )
