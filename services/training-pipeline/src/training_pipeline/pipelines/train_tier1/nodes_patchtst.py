"""
Nodes for Tier 1: Macro Director (PatchTST)
"""

import logging
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from typing import Dict, Any

logger = logging.getLogger(__name__)

class SimplePatchTST(nn.Module):
    """
    Simplified implementation of Patch Time Series Transformer
    """
    def __init__(self, sequence_length: int, patch_length: int, num_features: int, d_model: int=64, n_heads: int=4, e_layers: int=2, forecast_horizon: int=5):
        super().__init__()
        self.patch_length = patch_length
        self.num_patches = sequence_length // patch_length
        
        # Patching layer
        self.patch_embedding = nn.Linear(patch_length * num_features, d_model)
        
        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(d_model=d_model, nhead=n_heads, batch_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=e_layers)
        
        # Flatten and forecast
        self.head = nn.Linear(self.num_patches * d_model, forecast_horizon)

    def forward(self, x):
        # x shape: [batch_size, sequence_length, num_features]
        batch_size = x.size(0)
        
        # Patching: [batch_size, num_patches, patch_length * num_features]
        x = x.view(batch_size, self.num_patches, -1)
        
        # Embedding: [batch_size, num_patches, d_model]
        x = self.patch_embedding(x)
        
        # Transformer: [batch_size, num_patches, d_model]
        x = self.transformer(x)
        
        # Flatten: [batch_size, num_patches * d_model]
        x = x.view(batch_size, -1)
        
        # Forecast: [batch_size, forecast_horizon]
        out = self.head(x)
        return out


def train_patchtst_model(
    train_data: pd.DataFrame, parameters: Dict[str, Any]
) -> nn.Module:
    """
    Trains the PyTorch PatchTST model to forecast multiple return horizons.
    """
    logger.info("Training Tier 1 PatchTST PyTorch Model...")
    
    tier1_params = parameters.get("tier1", {})
    patch_params = tier1_params.get("patchtst", {})
    features = tier1_params.get("features", [])
    
    seq_len = patch_params.get("sequence_length", 60)
    patch_len = patch_params.get("patch_length", 5)
    epochs = patch_params.get("epochs", 10)
    batch_size = patch_params.get("batch_size", 32)
    lr = patch_params.get("learning_rate", 1e-3)
    forecast_horizon = patch_params.get("forecast_horizon", 5)
    
    if len(train_data) < seq_len * 2:
        logger.warning("Not enough data for PatchTST sequence chunking.")
        # Return naive initialized model if no data
        return SimplePatchTST(seq_len, patch_len, len(features), forecast_horizon=forecast_horizon)
        
    # Extremely basic sliding window for illustration
    X_vals = train_data[features].fillna(0).values
    
    X_chunks = []
    y_chunks = []
    
    # We will predict next 5 days of cumulative returns 
    target_idx = features.index('return1d') if 'return1d' in features else 0
    
    for i in range(len(X_vals) - seq_len - forecast_horizon):
        X_chunks.append(X_vals[i:i+seq_len])
        # Naive target: sum of future 1d returns
        y_chunks.append(X_vals[i+seq_len : i+seq_len+forecast_horizon, target_idx])
        
    X_tensor = torch.tensor(X_chunks, dtype=torch.float32)
    y_tensor = torch.tensor(y_chunks, dtype=torch.float32)
    
    dataset = TensorDataset(X_tensor, y_tensor)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = SimplePatchTST(
        sequence_length=seq_len, 
        patch_length=patch_len, 
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
            
        logger.info(f"PatchTST Epoch {epoch+1}/{epochs} - Loss: {total_loss/len(loader):.4f}")
        
    logger.info("PatchTST training complete.")
    return model
