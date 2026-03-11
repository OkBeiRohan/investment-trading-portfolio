"""
Kedro pipeline for 'nlp_sentiment'
"""

from kedro.pipeline import Pipeline, node
from .nodes_nlp import extract_financial_sentiment

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline(
        [
            node(
                func=extract_financial_sentiment,
                inputs={"news_df": "raw_financial_news", "parameters": "params:nlp"},
                outputs="sentiment_index_daily",
                name="finbert_extract_sentiment_node",
            ),
        ],
        namespace="nlp_sentiment",
        tags=["nlp", "finbert", "alpha"],
    )
