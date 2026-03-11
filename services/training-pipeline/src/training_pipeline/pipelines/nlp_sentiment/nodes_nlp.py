"""
Nodes for NLP Sentiment Extraction (Phase 9)
"""

import logging
import pandas as pd
import torch
# We wrap transformers import to prevent crashing in environments where it's not strictly needed
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch.nn.functional as F
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

from typing import Dict, Any

logger = logging.getLogger(__name__)

def extract_financial_sentiment(news_df: pd.DataFrame, parameters: Dict[str, Any]) -> pd.DataFrame:
    """
    Parses a dataframe of raw text (financial news, earnings call transcripts)
    and scores it using ProsusAI/finbert. Aggregates scores into a daily alpha feature.
    """
    logger.info("Starting NLP Sentiment Extraction using FinBERT...")
    
    if not TRANSFORMERS_AVAILABLE:
        logger.error("HuggingFace 'transformers' library not installed. Cannot run NLP module.")
        # Return a dummy empty dataframe to not break the pipeline DAG entirely
        return pd.DataFrame(columns=['date', 'sentiment_index'])
    
    nlp_params = parameters.get("nlp", {})
    model_name = nlp_params.get("model_name", "ProsusAI/finbert")
    batch_size = nlp_params.get("batch_size", 16)
    
    if news_df.empty:
        logger.warning("Empty news_df provided. Generating mock NLP sentiment for pipeline progression.")
        # Mock index for consecutive Kedro runs without real news data setup
        dates = pd.date_range('2023-01-01', periods=10, freq='D')
        return pd.DataFrame({
            'date': dates,
            'sentiment_index': [0.1, -0.2, 0.4, 0.05, -0.6, 0.8, -0.1, 0.0, 0.2, -0.3]
        })
        
    try:
        logger.info(f"Loading tokenizer and model: {model_name}")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSequenceClassification.from_pretrained(model_name)
        
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model.to(device)
        model.eval()
        
        # Assume news_df has columns: 'date' and 'text'
        texts = news_df['text'].tolist()
        dates = news_df['date'].tolist()
        
        sentiment_scores = []
        
        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i+batch_size]
                inputs = tokenizer(batch_texts, padding=True, truncation=True, return_tensors="pt").to(device)
                
                outputs = model(**inputs)
                
                # FinBERT outputs: [positive, negative, neutral] probabilities
                probs = F.softmax(outputs.logits, dim=-1)
                
                # Composite score: Positive_Prob - Negative_Prob (ignores neutral to create a directional [-1, 1] scalar)
                composite_score = (probs[:, 0] - probs[:, 1]).cpu().numpy()
                sentiment_scores.extend(composite_score)
                
        # Combine back
        results_df = pd.DataFrame({
            'date': pd.to_datetime(dates),
            'raw_sentiment': sentiment_scores
        })
        
        # Aggregate to daily sentiment index
        daily_sentiment = results_df.groupby(results_df['date'].dt.date)['raw_sentiment'].mean().reset_index()
        daily_sentiment.columns = ['date', 'sentiment_index']
        daily_sentiment['date'] = pd.to_datetime(daily_sentiment['date'])
        
        logger.info(f"Generated {len(daily_sentiment)} daily NLP sentiment features.")
        return daily_sentiment
        
    except Exception as e:
        logger.error(f"Failed to extract NLP sentiment: {e}", exc_info=True)
        return pd.DataFrame(columns=['date', 'sentiment_index'])
