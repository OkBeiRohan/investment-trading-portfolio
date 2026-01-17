"""
Test batch data loader functionality.

Run this to verify batch loading works correctly.
"""

import pytest
import pandas as pd
from datetime import datetime
from unittest.mock import Mock, MagicMock


def test_batch_loader_date_ranges():
    """Test date range generation."""
    from training_pipeline.utils import get_date_ranges

    ranges = get_date_ranges("2023-01-01", "2023-03-01", batch_days=30)

    assert len(ranges) == 2
    assert ranges[0][0] == "2023-01-01 00:00:00"
    assert ranges[0][1] == "2023-01-31 00:00:00"
    assert ranges[1][0] == "2023-01-31 00:00:00"
    assert ranges[1][1] == "2023-03-01 00:00:00"


def test_batch_loader_iteration():
    """Test batch loader iteration."""
    from training_pipeline.utils import BatchDataLoader

    # Mock catalog
    mock_catalog = MagicMock()
    mock_catalog._datasets = {
        "features_batch": Mock(
            _describe=lambda: {"filepath": "test.sql", "credentials": "test_creds"}
        ),
        "labels_batch": Mock(
            _describe=lambda: {"filepath": "test.sql", "credentials": "test_creds"}
        ),
    }
    mock_catalog._credentials = {"test_creds": {"con": "test"}}

    # Create mock data for two batches
    batch1_features = pd.DataFrame(
        {
            "timestamp": pd.date_range("2023-01-01", periods=100, freq="1min"),
            "feature1": range(100),
        }
    )
    batch1_labels = pd.DataFrame(
        {
            "timestamp": pd.date_range("2023-01-01", periods=100, freq="1min"),
            "target": [0, 1] * 50,
        }
    )

    batch2_features = pd.DataFrame(
        {
            "timestamp": pd.date_range("2023-01-31", periods=100, freq="1min"),
            "feature1": range(100),
        }
    )
    batch2_labels = pd.DataFrame(
        {
            "timestamp": pd.date_range("2023-01-31", periods=100, freq="1min"),
            "target": [1, 0] * 50,
        }
    )

    # Mock dataset loading
    def mock_load_dataset(name, start, end):
        if "2023-01-01" in start.strftime("%Y-%m-%d"):
            return batch1_features if "features" in name else batch1_labels
        else:
            return batch2_features if "features" in name else batch2_labels

    loader = BatchDataLoader(
        catalog=mock_catalog,
        start_date="2023-01-01",
        end_date="2023-02-28",
        batch_days=30,
    )

    # Patch _load_dataset
    loader._load_dataset = mock_load_dataset

    batches = list(loader)

    assert len(batches) == 2
    assert all(isinstance(b[0], pd.DataFrame) for b in batches)
    assert all(isinstance(b[1], pd.DataFrame) for b in batches)


def test_sql_query_named_parameters():
    """
    Test that SQL query uses named parameters correctly.

    This verifies the fix for the 'undefined bind variable' error.
    """
    import re

    # Read the SQL file
    with open("packages/schema/sql/market-state/get-by-time-range.sql") as f:
        sql = f.read()

    # Check for named parameters (not positional)
    assert ":training_start" in sql, "SQL should use :training_start"
    assert ":training_end" in sql, "SQL should use :training_end"
    assert "$1" not in sql, "SQL should NOT use $1 (positional param)"
    assert "$2" not in sql, "SQL should NOT use $2 (positional param)"

    # Same for labels
    with open("packages/schema/sql/training-labels/get-all-horizons.sql") as f:
        sql = f.read()

    assert ":training_start" in sql
    assert ":training_end" in sql
    assert "$1" not in sql
    assert "$2" not in sql


if __name__ == "__main__":
    # Quick manual test
    test_sql_query_named_parameters()
    print("✅ SQL parameter fix verified!")

    test_batch_loader_date_ranges()
    print("✅ Date range generation works!")

    print("\n🎉 All tests passed! You can now run:")
    print("   kedro run --pipeline batch_training")
