#!/usr/bin/env node

const fs = require("fs");
const { Transform } = require("stream");
const path = require("path");

const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile + ".formatted";

if (!inputFile) {
  console.error("Usage: node format-large-json.js <input-file> [output-file]");
  process.exit(1);
}

console.log(`Formatting ${inputFile}...`);
console.log(`Output: ${outputFile}`);

let buffer = "";
let depth = 0;
let inString = false;
let escaped = false;
let arrayItemCount = 0;

const formatStream = new Transform({
  transform(chunk, encoding, callback) {
    buffer += chunk.toString();

    // Process buffer character by character
    let output = "";
    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i];
      const prevChar = buffer[i - 1];

      // Handle escape sequences
      if (escaped) {
        output += char;
        escaped = false;
        continue;
      }

      if (char === "\\" && inString) {
        escaped = true;
        output += char;
        continue;
      }

      // Track if we're inside a string
      if (char === '"' && !escaped) {
        inString = !inString;
        output += char;
        continue;
      }

      // Skip formatting inside strings
      if (inString) {
        output += char;
        continue;
      }

      // Format based on character
      switch (char) {
        case "{":
        case "[":
          depth++;
          output += char + "\n" + "  ".repeat(depth);
          arrayItemCount = 0;
          break;

        case "}":
        case "]":
          depth--;
          output += "\n" + "  ".repeat(depth) + char;
          break;

        case ",":
          output += char;
          arrayItemCount++;
          // Add newline after comma (unless we want compact arrays)
          output += "\n" + "  ".repeat(depth);
          break;

        case ":":
          output += ": ";
          break;

        case " ":
        case "\t":
        case "\n":
        case "\r":
          // Skip extra whitespace outside strings
          break;

        default:
          output += char;
      }
    }

    buffer = "";
    callback(null, output);
  },
});

const readStream = fs.createReadStream(inputFile, {
  encoding: "utf8",
  highWaterMark: 1024 * 1024,
});
const writeStream = fs.createWriteStream(outputFile, { encoding: "utf8" });

readStream
  .pipe(formatStream)
  .pipe(writeStream)
  .on("finish", () => {
    console.log("✅ Formatting complete!");
    console.log(`File saved to: ${outputFile}`);

    // Get file sizes
    const inputSize = fs.statSync(inputFile).size;
    const outputSize = fs.statSync(outputFile).size;
    console.log(`Input size: ${(inputSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Output size: ${(outputSize / 1024 / 1024).toFixed(2)} MB`);
  })
  .on("error", (err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });

readStream.on("error", (err) => {
  console.error("❌ Read error:", err.message);
  process.exit(1);
});
