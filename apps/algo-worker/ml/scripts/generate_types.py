#!/usr/bin/env python3
"""
Generate Pydantic models from JSON Schema
Run after TypeScript JSON Schema generation
"""

import subprocess
import sys
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
ML_DIR = SCRIPT_DIR.parent
SCHEMA_PKG = ML_DIR.parent.parent.parent / "packages" / "schema"
JSON_SCHEMA_DIR = SCHEMA_PKG / "generated"
OUTPUT_DIR = ML_DIR / "types"


def generate_pydantic_models():
    """Generate Pydantic models from JSON Schema files"""

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Generate from combined schema file
    schema_file = JSON_SCHEMA_DIR / "schemas.json"
    output_file = OUTPUT_DIR / "feature_types.py"

    if not schema_file.exists():
        print(f"❌ JSON Schema not found: {schema_file}")
        print("Run: cd packages/schema && pnpm generate-json-schema")
        sys.exit(1)

    print(f"📥 Reading JSON Schema: {schema_file}")

    # Run datamodel-code-generator
    cmd = [
        "datamodel-codegen",
        "--input",
        str(schema_file),
        "--output",
        str(output_file),
        "--input-file-type",
        "jsonschema",
        "--output-model-type",
        "pydantic_v2.BaseModel",
        "--use-standard-collections",
        "--use-schema-description",
        "--field-constraints",
        "--use-double-quotes",
        "--target-python-version",
        "3.13",
        "--use-annotated",
        "--use-generic-container-types",
        "--enable-faux-immutability",
    ]

    try:
        subprocess.run(cmd, check=True)
        print(f"✅ Generated Pydantic models: {output_file}")

        # Create __init__.py for easy imports
        init_file = OUTPUT_DIR / "__init__.py"
        init_file.write_text(
            '"""Auto-generated Pydantic models from TypeScript Zod schemas"""\n'
            "from .feature_types import *\n"
        )
        print(f"✅ Created {init_file}")

        print("\n🎉 Python type generation complete!")
        print(f"\nImport in your training scripts:")
        print(f"  from types import FeatureSnapshot, Features, MACD, TradingSignal")

    except subprocess.CalledProcessError as e:
        print(f"❌ Error generating Pydantic models: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ datamodel-code-generator not found")
        print("Install: pip install datamodel-code-generator")
        sys.exit(1)


if __name__ == "__main__":
    generate_pydantic_models()
