"""
Nodes for Tier 3: Microstructure Scalper (Linear Transformer)
"""

import logging
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from typing import Dict, Any

logger = logging.getLogger(__name__)

class SimpleLinearTransformer(nn.Module):
    """
    Simplified Linear Transformer (LiT) for high-frequency tick data.
    Uses linear attention or highly simplified MLPs to replace O(N^2) softmax attention 
    for ultra-low latency inference in Rust later.
    """
    def __init__(self, num_features: int, d_model: int=32, n_layers: int=2, forecast_horizon: int=1):
        super().__init__()
        
        self.encoder = nn.Linear(num_features, d_model)
        
        # Simplified "Linear" block - using standard GRU or MLP for illustration
        # since true Linear Attention requires custom CUDA kernels or Performer math
        self.recurrent_block = nn.GRU(d_model, d_model, num_layers=n_layers, batch_first=True)
        
        self.decoder = nn.Linear(d_model, forecast_horizon)

    def forward(self, x):
        # x shape: [batch_size, sequence_length, num_features]
        x = self.encoder(x)
        out, _ = self.recurrent_block(x)
        # Take the last valid sequence output
        out = out[:, -1, :] 
        return self.decoder(out)


def train_lit_model(
    train_data: pd.DataFrame, parameters: Dict[str, Any]
) -> nn.Module:
    """
    Trains the PyTorch Linear Transformer model on live tick features
    for order flow imbalance and microstructure scalping.
    """
    logger.info("Training Tier 3 Linear Transformer (LiT) Model...")
    
    tier3_params = parameters.get("tier3", {})
    lit_params = tier3_params.get("lit", {})
    features = tier3_params.get("features", [])
    
    seq_len = lit_params.get("sequence_length", 20)
    epochs = lit_params.get("epochs", 5)
    batch_size = lit_params.get("batch_size", 256)
    lr = lit_params.get("learning_rate", 1e-3)
    forecast_horizon = lit_params.get("forecast_horizon", 1) # Next tick/second direction
    
    if len(train_data) < seq_len * 2:
        logger.warning("Not enough tick data for LiT sequence chunking.")
        return SimpleLinearTransformer(len(features), forecast_horizon=forecast_horizon)
        
    X_vals = train_data[features].fillna(0).values
    
    X_chunks = []
    y_chunks = []
    
    # Example target: predicting if the bid_ask_spread will tighten or widen in next N ticks
    target_idx = features.index('bidAskSpreadBps') if 'bidAskSpreadBps' in features else 0
    
    for i in range(len(X_vals) - seq_len - forecast_horizon):
        X_chunks.append(X_vals[i:i+seq_len])
        # Regression on next tick parameter
        y_chunks.append(X_vals[i+seq_len : i+seq_len+forecast_horizon, target_idx])
        
    X_tensor = torch.tensor(X_chunks, dtype=torch.float32)
    y_tensor = torch.tensor(y_chunks, dtype=torch.float32)
    
    dataset = TensorDataset(X_tensor, y_tensor)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = SimpleLinearTransformer(
        num_features=len(features),
        forecast_horizon=forecast_horizon
    ).to(device)
    
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.MSELoss()
    
    model.train()
    for epoch in range(epochs):
        total_loss = 0
        for batch_x, batch_y in loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            
            optimizer.zero_grad()
            predictions = model(batch_x)
            loss = criterion(predictions, batch_y)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            
        logger.info(f"LiT Epoch {epoch+1}/{epochs} - Tick Loss: {total_loss/len(loader):.4f}")
        
    logger.info("LiT training complete.")
    return model
