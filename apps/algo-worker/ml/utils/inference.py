#!/usr/bin/env python3
"""
ML Model Inference Script
Called by Node.js to run predictions on joblib models
Usage: python inference.py <model_path> <features_json>
"""

import sys
import json
import joblib
import numpy as np


def main():
    if len(sys.argv) != 3:
        print(
            json.dumps(
                {"error": "Usage: python inference.py <model_path> <features_json>"}
            ),
            file=sys.stderr,
        )
        sys.exit(1)

    model_path = sys.argv[1]
    features_json = sys.argv[2]

    try:
        # Load model
        model = joblib.load(model_path)

        # Parse features
        features_dict = json.loads(features_json)

        # Convert to feature array (maintain order)
        feature_names = [
            "realizedVol5d",
            "realizedVol10d",
            "realizedVol20d",
            "rsi14",
            "macdValue",
            "macdSignal",
            "macdHistogram",
            "sma20",
            "sma50",
            "ema12",
            "ema26",
            "indiaVix",
            "indiaVixMA5",
            "pcrVolume",
            "pcrOI",
            "maxPain",
            "atmIV",
            "volSkew",
            "termStructure",
            "callIVSpread",
            "putIVSpread",
            "hour",
            "dayOfWeek",
            "isMarketOpen",
        ]

        # Build feature vector
        features = []
        for name in feature_names:
            value = features_dict.get(name, 0.0)
            features.append(float(value))

        X = np.array(features).reshape(1, -1)

        # Run inference
        prediction = int(model.predict(X)[0])

        # Get probability if available
        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(X)[0].tolist()
            probability = float(probabilities[1])  # Probability of class 1
        else:
            # For models without predict_proba (e.g., some SVMs)
            if hasattr(model, "decision_function"):
                decision = model.decision_function(X)[0]
                # Convert decision function to probability-like score (0-1)
                probability = float(1 / (1 + np.exp(-decision)))
                probabilities = [1 - probability, probability]
            else:
                # Fallback
                probability = float(prediction)
                probabilities = [1 - probability, probability]

        # Output result as JSON
        result = {
            "prediction": prediction,
            "probability": probability,
            "probabilities": probabilities,
        }

        print(json.dumps(result))
        sys.exit(0)

    except FileNotFoundError:
        print(
            json.dumps({"error": f"Model file not found: {model_path}"}),
            file=sys.stderr,
        )
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(
            json.dumps({"error": f"Invalid JSON features: {str(e)}"}), file=sys.stderr
        )
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Inference error: {str(e)}"}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
