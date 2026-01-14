#!/usr/bin/env python3
"""Format large JSON files with proper indentation for searchability."""

import json
import sys
from pathlib import Path


def format_json_file(input_path: str, output_path: str | None = None, indent: int = 2):
    """
    Format a JSON file with indentation.

    Args:
        input_path: Path to input JSON file
        output_path: Path to output file (optional, defaults to input_path.formatted)
        indent: Number of spaces for indentation (default: 2)
    """
    input_file = Path(input_path)

    if not input_file.exists():
        print(f"❌ Error: File not found: {input_path}")
        sys.exit(1)

    if output_path is None:
        output_file = (
            input_file.parent / f"{input_file.stem}-formatted{input_file.suffix}"
        )
    else:
        output_file = Path(output_path)

    print(f"📖 Reading {input_file}...")
    input_size_mb = input_file.stat().st_size / 1024 / 1024
    print(f"   Input size: {input_size_mb:.2f} MB")

    try:
        # Load JSON (Python handles large files efficiently)
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"✍️  Formatting and writing to {output_file}...")

        # Write formatted JSON
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=indent, ensure_ascii=False)

        output_size_mb = output_file.stat().st_size / 1024 / 1024
        print(f"✅ Complete!")
        print(f"   Output size: {output_size_mb:.2f} MB")
        print(f"   Size increase: {output_size_mb - input_size_mb:+.2f} MB")

    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        sys.exit(1)
    except MemoryError:
        print(f"❌ Out of memory! File too large to format.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python format-large-json.py <input-file> [output-file] [indent]")
        print("Example: python format-large-json.py data.json data-formatted.json 2")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    indent = int(sys.argv[3]) if len(sys.argv) > 3 else 2

    format_json_file(input_file, output_file, indent)
