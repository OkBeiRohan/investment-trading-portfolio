"""
LOB Informed Transformer (LiT) Trainer (PLACEHOLDER)

TIER 2 - Conditional (Activated in high-liquidity regimes)

TODO: Implement LiT when compute-engine provides LOB tensors
- Requires 60 LOB snapshots × 80 price levels
- Limit order book dynamics modeling
- High-frequency microstructure signals
"""

import logging

import pandas as pd

logger = logging.getLogger(__name__)


class LiTTrainer:
    """
    LiT trainer for index options trading (PLACEHOLDER)

    TODO: Implement when LOB tensor schema finalized in compute-engine
    """

    def __init__(self) -> None:
        logger.warning(
            "LiT trainer is a placeholder - requires LOB tensors from compute-engine"
        )
        pass

    def train(self, features: pd.DataFrame, labels: pd.Series) -> None:
        """Train LiT model (PLACEHOLDER)"""
        raise NotImplementedError(
            "LiT trainer not yet implemented - "
            "@repo/compute-engine must first define LOB tensor schema"
        )
