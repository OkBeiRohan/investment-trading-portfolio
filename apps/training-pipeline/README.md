```bash
# 1. Setup environment
poetry install

# 2. Activate environment
poetry shell

# 3. Fetch historical data (run data-processor)
cd ../data-processor
npm run job:export-training-data

# 4. Return to training pipeline
cd ../training-pipeline

# 5. Run feature engineering
kedro run --pipeline feature_engineering

# 6. Train feature extractors
kedro run --pipeline train_feature_extractor

# 7. Train ensemble models
kedro run --pipeline train_ensemble

# 8. Train meta-learner
kedro run --pipeline train_meta_learner

# 9. (Optional) Train RL agent
kedro run --pipeline train_rl_agent

# 10. Export all models to ONNX
kedro run --pipeline export_onnx

# 11. View results in MLflow
mlflow ui

# 12. Copy models to algo-worker
cp onnx/*.onnx ../algo-worker/models/

# 13. Test inference in algo-worker
cd ../algo-worker
npm run test:inference
```
