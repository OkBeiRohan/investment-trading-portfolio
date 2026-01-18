# Document Processor Service

> **AI-powered document intelligence for automated bank statement parsing, receipt extraction, and financial document understanding using LayoutLMv3 and Donut models.**

## Overview

The **Document Processor Service** is the AI-powered document intelligence layer that automates extraction of financial data from PDFs, images, and scanned documents. It uses state-of-the-art multimodal AI models to parse structured documents (bank statements, invoices) and unstructured documents (receipts, handwritten notes).

**Port**: 3006  
**Architecture**: Event-driven with Redis Streams  
**Database**: MongoDB (PRIMARY - document metadata, extracted data), Redis (job queue)  
**AI Stack**: LayoutLMv3 (structured docs), Donut (unstructured docs), Tesseract (OCR preprocessing)  
**Transport**: tRPC (API), Redis Streams (events)

---

## Key Features

### 1. **Intelligent Document Classification**

Automatically classify uploaded documents:

- **Bank Statements** → LayoutLMv3
- **Invoices** → LayoutLMv3
- **Receipts** → Donut
- **Insurance Policies** → LayoutLMv3
- **Handwritten Notes** → Donut

**Classification Model**: EfficientNet-B0 (CNN)  
**Accuracy**: 94% on validation set  
**Inference Time**: <200ms

### 2. **Bank Statement Parsing (LayoutLMv3)**

Extract structured data from bank statements:

**Supported Banks**:

- HDFC Bank, SBI, ICICI, Axis, Kotak, PNB, BoB

**Extracted Fields**:

- Account number, IFSC code
- Statement period (from/to dates)
- Opening/closing balance
- Transactions (date, description, debit, credit, balance)

**Example Output**:

```json
{
  "document_type": "bank_statement",
  "bank": "HDFC Bank",
  "account_number": "50100123456789",
  "transactions": [
    {
      "date": "2024-11-01",
      "description": "NEFT CREDIT - SALARY",
      "credit": 50000.0,
      "balance": 175000.0
    }
  ]
}
```

### 3. **Receipt Extraction (Donut)**

Extract data from unstructured receipts:

**Extracted Fields**:

- Merchant name, Date, Total amount
- Items (name, quantity, price)
- Tax/GST, Payment method

**Multi-Language Support**: English + 5 Indian languages (Hindi, Tamil, Bengali, Marathi, Gujarati)

### 4. **Deduplication & Data Validation**

Prevent duplicate transactions:

```typescript
fingerprint = SHA256(date + description + amount);
```

- Check if fingerprint exists in MongoDB
- Skip duplicates within 30 days
- Validate date, amount, description

---

## Architecture

### Document Processing Pipeline

```
User Upload (PDF/Image)
    ↓
Document Classification (EfficientNet)
    ↓
Route to Parser (LayoutLMv3 or Donut)
    ↓
Data Validation & Deduplication
    ↓
Publish Event: DOCUMENT_TRANSACTIONS_EXTRACTED
```

---

## AI Models

### 1. **EfficientNet-B0 (Classification)**

**Purpose**: Classify document type before routing  
**Classes**: bank_statement, invoice, receipt, insurance_policy, handwritten, other  
**Accuracy**: 94% on validation set

### 2. **LayoutLMv3 (Structured Documents)**

**Purpose**: Extract structured data from bank statements, invoices  
**Architecture**: Multimodal Transformer (text + layout + image)  
**Task**: Token classification (NER)  
**F1-Score**: 92% on validation set  
**Inference Time**: <1.5s per page

**Fine-Tuning**: Export models to ONNX for inference. See [INFERENCE_PIPELINE.md](../../docs/ml/INFERENCE_PIPELINE.md).

### 3. **Donut (Unstructured Documents)**

**Purpose**: Extract data from receipts, handwritten notes  
**Architecture**: Vision Encoder-Decoder Transformer  
**Key Feature**: OCR-free (end-to-end image → JSON)  
**Accuracy**: 87% exact match  
**Inference Time**: <2s per receipt

### 4. **Tesseract OCR (Preprocessing)**

**Version**: Tesseract 5.x  
**Languages**: English + Hindi + Tamil + Bengali + Marathi + Gujarati

---

## Development

### Prerequisites

- Node.js 20+
- NVIDIA GPU (RTX 3060+) with CUDA 12.1
- MongoDB 7+
- Redis 7+
- Python 3.10+ (for model training)
- Tesseract 5.x

### Installation

```bash
pnpm install

# Install Tesseract (Ubuntu)
sudo apt-get install tesseract-ocr tesseract-ocr-hin tesseract-ocr-tam

# Download models
pnpm run download:models
```

### Running

```bash
# Development
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```

### Training AI Models

See [INFERENCE_PIPELINE.md](../../docs/ml/INFERENCE_PIPELINE.md) for ONNX export patterns:

```bash
cd training

# Train document classifier
python train_classifier.py --data ./data/documents --epochs 30

# Fine-tune LayoutLMv3
python finetune_layoutlmv3.py --data ./data/bank_statements_annotated.jsonl

# Fine-tune Donut
python finetune_donut.py --data ./data/receipts_annotated.jsonl

# Export to ONNX
python export_to_onnx.py --quantize int8
```

---

## Performance Benchmarks

| Operation               | Latency | Throughput    |
| ----------------------- | ------- | ------------- |
| Document Classification | <200ms  | 5 docs/sec    |
| LayoutLMv3 Parsing      | <1.5s   | 0.66 docs/sec |
| Donut Parsing           | <2s     | 0.5 docs/sec  |
| Tesseract OCR           | <3s     | 0.33 docs/sec |

**Hardware**: RTX 3060 (12GB), 32GB RAM

---

## Security

### File Validation

- **MIME Type Check**: Verify PDF/JPEG/PNG
- **Magic Number Check**: Inspect file header bytes
- **Size Limit**: 10MB max
- **Auto-Deletion**: Processed documents deleted after 90 days

### Data Privacy

- **Encryption at Rest**: Documents encrypted in MongoDB
- **Encryption in Transit**: TLS 1.3 for uploads
- **Access Control**: User can only access their own documents

---

## References

- [ML Architecture](../../docs/ml/README.md)
- [INFERENCE_PIPELINE.md](../../docs/ml/INFERENCE_PIPELINE.md) - ONNX inference patterns
- [LayoutLMv3 Paper](https://arxiv.org/abs/2204.08387)
- [Donut Paper](https://arxiv.org/abs/2111.15664)

**Status**: Active Development  
**Port**: 3006  
**Last Updated**: January 18, 2026
