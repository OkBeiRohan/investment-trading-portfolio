"""
QuestDB Query Loader for Python Training Pipeline

Loads SQL queries from @repo/schema/sql/ directory to ensure
TypeScript services and Python training pipeline use identical queries.
"""

from pathlib import Path
from typing import Optional


class SQLQueryLoader:
    """
    Loader for SQL queries from @repo/schema/sql/ directory.

    Usage:
        loader = SQLQueryLoader()
        sql = loader.load('candles/select-by-time-range')
    """

    def __init__(self, schema_root: Optional[Path] = None):
        """
        Initialize SQL query loader.

        Args:
            schema_root: Path to @repo/schema package root.
                        If None, auto-detects from monorepo structure.
        """
        if schema_root is None:
            # Auto-detect schema root (assumes training-pipeline is in apps/)
            current_file = Path(__file__)
            monorepo_root = current_file.parent.parent.parent.parent
            schema_root = monorepo_root / "packages" / "schema"

        self.sql_dir = schema_root / "sql"

        if not self.sql_dir.exists():
            raise FileNotFoundError(
                f"SQL directory not found: {self.sql_dir}. "
                "Ensure @repo/schema package is properly set up."
            )

        # Cache for loaded queries (performance optimization)
        self._cache: dict[str, str] = {}

    def load(self, query_path: str, use_cache: bool = True) -> str:
        """
        Load SQL query from @repo/schema/sql/

        Args:
            query_path: Path relative to sql/ directory
                       (e.g., 'candles/select-by-time-range')
            use_cache: Whether to use cached queries

        Returns:
            SQL query string

        Example:
            sql = loader.load('candles/select-by-time-range')
        """
        if use_cache and query_path in self._cache:
            return self._cache[query_path]

        sql_file = self.sql_dir / f"{query_path}.sql"

        if not sql_file.exists():
            raise FileNotFoundError(
                f"SQL query not found: {sql_file}. "
                f"Available queries: {self.list_queries()}"
            )

        with open(sql_file, "r", encoding="utf-8") as f:
            sql = f.read()

        if use_cache:
            self._cache[query_path] = sql

        return sql

    def list_queries(self) -> list[str]:
        """
        List all available SQL queries.

        Returns:
            List of query paths (e.g., ['candles/select-by-time-range', ...])
        """
        queries = []
        for sql_file in self.sql_dir.rglob("*.sql"):
            # Convert to relative path and remove .sql extension
            rel_path = sql_file.relative_to(self.sql_dir)
            query_path = str(rel_path.with_suffix(""))
            queries.append(query_path.replace("\\", "/"))  # Normalize path separators
        return sorted(queries)

    def clear_cache(self) -> None:
        """Clear the query cache (useful for hot-reloading in development)."""
        self._cache.clear()


# Singleton instance for convenience
_default_loader: Optional[SQLQueryLoader] = None


def get_sql_loader() -> SQLQueryLoader:
    """
    Get the default SQL query loader instance.

    Returns:
        Singleton SQLQueryLoader instance
    """
    global _default_loader
    if _default_loader is None:
        _default_loader = SQLQueryLoader()
    return _default_loader


def load_sql(query_path: str) -> str:
    """
    Convenience function to load SQL query.

    Args:
        query_path: Path relative to sql/ directory
                   (e.g., 'candles/select-by-time-range')

    Returns:
        SQL query string

    Example:
        from training_pipeline.utils.sql_loader import load_sql

        sql = load_sql('candles/select-by-time-range')
        cursor.execute(sql, [instrument_key, interval, start_time, end_time])
    """
    return get_sql_loader().load(query_path)
