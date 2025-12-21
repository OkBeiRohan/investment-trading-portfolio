# AI Model Training Guide - Wealth Management System

> **Comprehensive guide for training and deploying AI models used in wealth-analyzer and document-processor services**

## Overview

The wealth management system uses three key AI models:

1. **Phi-3** (3.8B parameters) - Local LLM for natural language queries and financial insights
2. **LayoutLMv3** - Document understanding for structured documents (bank statements, invoices)
3. **Donut** - End-to-end document parsing for unstructured documents (receipts, handwritten notes)

**Training Infrastructure**:

- **Location**: Local GPU (RTX 3060/4090 or better)
- **Framework**: PyTorch, Hugging Face Transformers, Unsloth (QLoRA fine-tuning)
- **Deployment**: ONNX models for production inference (services/wealth-analyzer, services/document-processor)

---

## Table of Contents

1. [Phi-3 Fine-Tuning for Financial Domain](#phi-3-fine-tuning)
2. [LayoutLMv3 Fine-Tuning for Bank Statements](#layoutlmv3-fine-tuning)
3. [Donut Fine-Tuning for Receipts](#donut-fine-tuning)
4. [Dataset Preparation](#dataset-preparation)
5. [Training Environment Setup](#training-environment-setup)
6. [Evaluation Metrics](#evaluation-metrics)
7. [ONNX Conversion & Deployment](#onnx-conversion)
8. [Production Deployment](#production-deployment)

---

## 1. Phi-3 Fine-Tuning for Financial Domain {#phi-3-fine-tuning}

### Overview

Phi-3 (microsoft/Phi-3-mini-4k-instruct) is a 3.8B parameter LLM optimized for edge devices. We fine-tune it on financial Q&A data for domain-specific performance.

### Why Phi-3?

- **Small Size**: 3.8B parameters (vs 7B/13B models)
- **Fast Inference**: <500ms on RTX 3060
- **Local Deployment**: No cloud API costs
- **Good Performance**: Matches GPT-3.5 on many tasks

### Fine-Tuning with Unsloth + QLoRA

**QLoRA (Quantized Low-Rank Adaptation)**:

- Quantize base model to 4-bit (reduces memory 4x)
- Train only LoRA adapters (1-2% of params)
- Merge adapters back to full precision

```python
# services/wealth-analyzer/training/finetune_phi3.py
from unsloth import FastLanguageModel
from unsloth.chat_templates import get_chat_template
from trl import SFTTrainer
from transformers import TrainingArguments
import torch

# 1. Load Phi-3 with 4-bit quantization
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="microsoft/Phi-3-mini-4k-instruct",
    max_seq_length=2048,
    dtype=torch.float16,
    load_in_4bit=True,  # Quantization
)

# 2. Add LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=16,  # LoRA rank (higher = more parameters)
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
    lora_alpha=16,
    lora_dropout=0.05,
    bias="none",
    use_gradient_checkpointing=True,
    random_state=42,
)

# 3. Prepare dataset
dataset = load_dataset("json", data_files="data/financial_qa.jsonl")

# Format: {"instruction": "...", "response": "..."}
# Example:
# {
#   "instruction": "How much did I spend on groceries last month?",
#   "response": "You spent ₹12,450 on groceries last month across 8 transactions."
# }

def formatting_prompts_func(examples):
    instructions = examples["instruction"]
    responses = examples["response"]
    texts = []
    for instruction, response in zip(instructions, responses):
        text = f"""<|user|>
{instruction}<|end|>
<|assistant|>
{response}<|end|>"""
        texts.append(text)
    return {"text": texts}

dataset = dataset.map(
    formatting_prompts_func,
    batched=True
)

# 4. Training arguments
training_args = TrainingArguments(
    output_dir="./models/phi3-finance-finetuned",
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,  # Effective batch size = 16
    warmup_steps=100,
    num_train_epochs=3,
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    save_strategy="epoch",
    optim="adamw_8bit"  # 8-bit AdamW (memory efficient)
)

# 5. Trainer
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset["train"],
    dataset_text_field="text",
    max_seq_length=2048,
    args=training_args
)

# 6. Train
trainer.train()

# 7. Save merged model
model.save_pretrained_merged(
    "./models/phi3-finance-finetuned",
    tokenizer=tokenizer,
    save_method="merged_16bit"  # Merge LoRA back to FP16
)
```

### Training Time & Resources

- **GPU**: RTX 3060 (12GB VRAM)
- **Training Time**: ~2-3 hours for 10K samples, 3 epochs
- **Memory**: ~8GB VRAM (with 4-bit quantization + gradient checkpointing)
- **Dataset Size**: 10K-50K Q&A pairs (financial domain)

### Dataset Format

```jsonl
{"instruction": "What is my current net worth?", "response": "Your current net worth is ₹35,00,000, which includes ₹50,00,000 in assets and ₹15,00,000 in liabilities."}
{"instruction": "How much did I spend on groceries last month?", "response": "You spent ₹12,450 on groceries last month across 8 transactions."}
{"instruction": "Am I on track to meet my retirement goal?", "response": "Yes, you are on track. At your current SIP rate of ₹25,000/month, you will reach your goal of ₹2 crores in 18 years."}
```

**Dataset Sources**:

- Synthetic data generated from templates
- User queries (anonymized)
- Financial Q&A from Reddit, Quora (scraped with permission)

### Evaluation

```python
# Evaluate on test set
from sklearn.metrics import accuracy_score
import numpy as np

# Generate responses
test_prompts = ["How much did I spend on utilities last month?", ...]
generated_responses = []

for prompt in test_prompts:
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    outputs = model.generate(**inputs, max_new_tokens=128)
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    generated_responses.append(response)

# Human evaluation (gold labels)
# Compute metrics: BLEU, ROUGE, BERTScore
```

---

## 2. LayoutLMv3 Fine-Tuning for Bank Statements {#layoutlmv3-fine-tuning}

### Overview

LayoutLMv3 is a multimodal Transformer for document understanding. It combines visual, textual, and spatial (bounding box) information.

### Why LayoutLMv3?

- **Multimodal**: Understands document layout + text
- **Table Extraction**: Extracts tables from bank statements
- **Key-Value Pairs**: Extracts account number, IFSC, dates
- **State-of-the-Art**: Best performance on DocVQA, FUNSD benchmarks

### Fine-Tuning Pipeline

```python
# services/document-processor/training/finetune_layoutlmv3.py
from transformers import (
    LayoutLMv3Processor,
    LayoutLMv3ForTokenClassification,
    Trainer,
    TrainingArguments
)
from datasets import load_dataset

# 1. Load base model
model = LayoutLMv3ForTokenClassification.from_pretrained(
    "microsoft/layoutlmv3-base",
    num_labels=len(label2id)  # Entity labels
)

processor = LayoutLMv3Processor.from_pretrained(
    "microsoft/layoutlmv3-base",
    apply_ocr=False  # We provide pre-extracted OCR
)

# 2. Prepare dataset
# Format: Image + OCR + Bounding Boxes + Entity Labels
# Example annotation:
# {
#   "image": "statement_001.png",
#   "words": ["Account", "Number:", "50100123456", ...],
#   "bbox": [[10, 20, 50, 30], [55, 20, 90, 30], ...],  # [x0, y0, x1, y1]
#   "labels": [0, 0, 1, ...]  # 0=O, 1=ACCOUNT_NUMBER, 2=IFSC, etc.
# }

label2id = {
    "O": 0,
    "ACCOUNT_NUMBER": 1,
    "IFSC": 2,
    "OPENING_BALANCE": 3,
    "CLOSING_BALANCE": 4,
    "TXN_DATE": 5,
    "TXN_DESC": 6,
    "AMOUNT": 7,
    "TYPE": 8,
    "BALANCE": 9
}

dataset = load_dataset("json", data_files="data/bank_statements_annotated.jsonl")

# Preprocessing
def preprocess_data(examples):
    images = [Image.open(path).convert("RGB") for path in examples["image"]]
    words = examples["words"]
    boxes = examples["bbox"]
    labels = examples["labels"]

    encoding = processor(
        images,
        words,
        boxes=boxes,
        word_labels=labels,
        truncation=True,
        padding="max_length",
        max_length=512
    )

    return encoding

train_dataset = dataset["train"].map(
    preprocess_data,
    batched=True,
    remove_columns=dataset["train"].column_names
)

# 3. Training arguments
training_args = TrainingArguments(
    output_dir="./models/layoutlmv3-bank-finetuned",
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    num_train_epochs=20,
    learning_rate=5e-5,
    warmup_steps=500,
    fp16=True,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1"
)

# 4. Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=dataset["validation"],
    compute_metrics=compute_seqeval_metrics
)

# 5. Train
trainer.train()

# 6. Save model
model.save_pretrained("./models/layoutlmv3-bank-finetuned")
processor.save_pretrained("./models/layoutlmv3-bank-finetuned")
```

### Training Time & Resources

- **GPU**: RTX 3060 (12GB VRAM) or better
- **Training Time**: ~5-8 hours for 1000 annotated statements, 20 epochs
- **Memory**: ~10GB VRAM
- **Dataset Size**: 500-2000 annotated bank statements

### Dataset Annotation

Use Label Studio or similar tool:

```bash
# Install Label Studio
pip install label-studio

# Start server
label-studio start

# Import bank statement images
# Annotate with token classification labels
# Export as JSON
```

**Annotation Example**:

```json
{
  "image": "hdfc_statement_001.png",
  "words": ["Account", "Number:", "50100123456", "IFSC:", "HDFC0001234"],
  "bbox": [
    [10, 20, 80, 35],
    [85, 20, 150, 35],
    [155, 20, 280, 35],
    [10, 40, 60, 55],
    [65, 40, 180, 55]
  ],
  "labels": [0, 0, 1, 0, 2]
}
```

### Evaluation Metrics

```python
from seqeval.metrics import classification_report, f1_score

def compute_seqeval_metrics(p):
    predictions, labels = p
    predictions = np.argmax(predictions, axis=2)

    # Convert to label names
    true_labels = [[id2label[l] for l in label if l != -100] for label in labels]
    true_predictions = [
        [id2label[p] for (p, l) in zip(prediction, label) if l != -100]
        for prediction, label in zip(predictions, labels)
    ]

    return {
        "f1": f1_score(true_labels, true_predictions),
        "classification_report": classification_report(true_labels, true_predictions)
    }
```

---

## 3. Donut Fine-Tuning for Receipts {#donut-fine-tuning}

### Overview

Donut (Document Understanding Transformer) is an OCR-free end-to-end model that directly predicts structured output from images.

### Why Donut?

- **OCR-Free**: No separate OCR step (handles low-quality images)
- **Unstructured Docs**: Works on receipts, handwritten notes
- **JSON Output**: Directly generates structured JSON
- **Multi-Language**: Supports 100+ languages

### Fine-Tuning Pipeline

```python
# services/document-processor/training/finetune_donut.py
from transformers import (
    VisionEncoderDecoderModel,
    DonutProcessor,
    Trainer,
    TrainingArguments
)
from datasets import load_dataset

# 1. Load base model
model = VisionEncoderDecoderModel.from_pretrained("naver-clova-ix/donut-base")
processor = DonutProcessor.from_pretrained("naver-clova-ix/donut-base")

# 2. Configure for receipt parsing
model.config.decoder_start_token_id = processor.tokenizer.convert_tokens_to_ids(['<s>'])[0]
model.config.pad_token_id = processor.tokenizer.pad_token_id
model.config.vocab_size = model.config.decoder.vocab_size

# 3. Prepare dataset
# Format: Image + JSON output
# Example:
# {
#   "image": "receipt_001.jpg",
#   "ground_truth": {
#     "merchant_name": "Big Bazaar",
#     "date": "2024-11-05",
#     "total": 2500.0,
#     "items": [
#       {"name": "Rice 10kg", "quantity": 1, "price": 850.0},
#       {"name": "Flour 5kg", "quantity": 2, "price": 300.0}
#     ],
#     "tax": 200.0
#   }
# }

dataset = load_dataset("json", data_files="data/receipts_annotated.jsonl")

def preprocess_data(examples):
    images = [Image.open(path).convert("RGB") for path in examples["image"]]

    # Convert ground truth to JSON string
    target_sequences = [json.dumps(gt) for gt in examples["ground_truth"]]

    pixel_values = processor(images, return_tensors="pt").pixel_values
    labels = processor.tokenizer(
        target_sequences,
        padding="max_length",
        max_length=512,
        truncation=True,
        return_tensors="pt"
    ).input_ids

    # Replace padding token id's with -100 (ignore in loss)
    labels[labels == processor.tokenizer.pad_token_id] = -100

    return {"pixel_values": pixel_values, "labels": labels}

train_dataset = dataset["train"].map(preprocess_data, batched=True)

# 4. Training arguments
training_args = TrainingArguments(
    output_dir="./models/donut-receipts-finetuned",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,  # Effective batch size = 16
    num_train_epochs=30,
    learning_rate=3e-5,
    warmup_steps=300,
    fp16=True,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True
)

# 5. Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=dataset["validation"]
)

# 6. Train
trainer.train()

# 7. Save model
model.save_pretrained("./models/donut-receipts-finetuned")
processor.save_pretrained("./models/donut-receipts-finetuned")
```

### Training Time & Resources

- **GPU**: RTX 3060 (12GB VRAM) or better
- **Training Time**: ~8-12 hours for 2000 receipts, 30 epochs
- **Memory**: ~11GB VRAM
- **Dataset Size**: 1000-5000 annotated receipts

### Dataset Annotation

Use CVAT or Label Studio:

```json
{
  "image": "receipt_001.jpg",
  "ground_truth": {
    "merchant_name": "DMart",
    "date": "2024-11-12",
    "total": 1800.0,
    "items": [
      { "name": "Tomatoes", "quantity": 2, "price": 60.0 },
      { "name": "Onions", "quantity": 3, "price": 90.0 }
    ],
    "payment_method": "UPI",
    "tax": 150.0
  }
}
```

---

## 4. Dataset Preparation {#dataset-preparation}

### Financial Q&A Dataset (Phi-3)

**Sources**:

1. **Synthetic Data**: Generate from templates
2. **User Queries**: Anonymized real user queries
3. **Public Datasets**: Reddit r/IndiaInvestments, Quora Finance

**Template-Based Generation**:

```python
import random

templates = [
    {
        "instruction": "How much did I spend on {category} last month?",
        "response": "You spent ₹{amount} on {category} last month across {count} transactions."
    },
    {
        "instruction": "What is my current net worth?",
        "response": "Your current net worth is ₹{net_worth}, which includes ₹{assets} in assets and ₹{liabilities} in liabilities."
    },
    # ... more templates
]

categories = ["groceries", "utilities", "entertainment", "transport", "healthcare"]

# Generate 10K samples
samples = []
for _ in range(10000):
    template = random.choice(templates)
    instruction = template["instruction"].format(
        category=random.choice(categories),
        amount=random.randint(5000, 50000),
        count=random.randint(5, 30)
    )
    response = template["response"].format(
        category=random.choice(categories),
        amount=random.randint(5000, 50000),
        count=random.randint(5, 30),
        net_worth=random.randint(1000000, 10000000),
        assets=random.randint(2000000, 12000000),
        liabilities=random.randint(500000, 5000000)
    )
    samples.append({"instruction": instruction, "response": response})

# Save
with open("data/financial_qa.jsonl", "w") as f:
    for sample in samples:
        f.write(json.dumps(sample) + "\n")
```

### Bank Statement Dataset (LayoutLMv3)

**Sources**:

1. **Real Statements**: Collect from users (anonymized)
2. **Synthetic Statements**: Generate using templates
3. **Public Datasets**: SROIE, FUNSD (adapt to bank statements)

**Annotation Tool**: Label Studio

```bash
# Install Label Studio
pip install label-studio

# Start server
label-studio start myproject --init

# Import images, annotate, export JSON
```

### Receipt Dataset (Donut)

**Sources**:

1. **SROIE Dataset**: 1000 annotated receipts
2. **User Uploads**: Anonymized receipts
3. **Web Scraping**: Google Images (with permission)

---

## 5. Training Environment Setup {#training-environment-setup}

### GPU Requirements

**Minimum**:

- NVIDIA RTX 3060 (12GB VRAM)
- 32GB RAM
- 500GB SSD

**Recommended**:

- NVIDIA RTX 4090 (24GB VRAM)
- 64GB RAM
- 1TB NVMe SSD

### Software Setup

```bash
# 1. Install CUDA 12.1
wget https://developer.download.nvidia.com/compute/cuda/12.1.0/local_installers/cuda_12.1.0_530.30.02_linux.run
sudo sh cuda_12.1.0_530.30.02_linux.run

# 2. Create virtual environment
conda create -n wealth-ml python=3.10
conda activate wealth-ml

# 3. Install PyTorch with CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 4. Install Hugging Face libraries
pip install transformers datasets accelerate evaluate
pip install unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git

# 5. Install document processing libraries
pip install layoutparser layoutlmv3 donut-python
pip install tesseract pillow opencv-python

# 6. Install ONNX tools
pip install onnx onnxruntime-gpu optimum
```

---

## 6. Evaluation Metrics {#evaluation-metrics}

### Phi-3 (LLM)

- **BLEU**: Measures n-gram overlap
- **ROUGE**: Measures recall of n-grams
- **BERTScore**: Semantic similarity
- **Human Evaluation**: Accuracy, helpfulness, factuality

### LayoutLMv3 (NER)

- **F1-Score**: Harmonic mean of precision and recall
- **Precision**: Correct entities / predicted entities
- **Recall**: Correct entities / ground truth entities
- **Per-Entity F1**: F1 for each entity type (ACCOUNT_NUMBER, IFSC, etc.)

### Donut (Document Parsing)

- **Exact Match**: JSON output matches ground truth exactly
- **Field Accuracy**: Per-field accuracy (merchant_name, date, total, etc.)
- **Tree Edit Distance**: Measures structural similarity of JSON

---

## 7. ONNX Conversion & Deployment {#onnx-conversion}

### Phi-3 to ONNX

```python
from optimum.onnxruntime import ORTModelForCausalLM

# Load fine-tuned model
model = ORTModelForCausalLM.from_pretrained(
    "./models/phi3-finance-finetuned",
    export=True,
    provider="CUDAExecutionProvider"
)

# Save ONNX model
model.save_pretrained("./models/phi3-finance-finetuned-onnx")
```

### LayoutLMv3 to ONNX

```python
from optimum.onnxruntime import ORTModelForTokenClassification

# Export to ONNX
ort_model = ORTModelForTokenClassification.from_pretrained(
    "./models/layoutlmv3-bank-finetuned",
    export=True
)

# Quantize to INT8 (4x smaller, 2x faster)
from optimum.onnxruntime.configuration import OptimizationConfig, AutoQuantizationConfig

optimization_config = OptimizationConfig(optimization_level=99)
quantization_config = AutoQuantizationConfig.avx512_vnni(is_static=False, per_channel=True)

ort_model = ORTModelForTokenClassification.from_pretrained(
    "./models/layoutlmv3-bank-finetuned",
    export=True
)

ort_model.quantize(
    save_directory="./models/layoutlmv3-bank-finetuned-onnx-int8",
    quantization_config=quantization_config,
    optimization_config=optimization_config
)
```

---

## 8. Production Deployment {#production-deployment}

### Copy Models to Apps

```bash
# Phi-3 for wealth-analyzer
cp models/phi3-finance-finetuned-onnx/* services/wealth-analyzer/models/

# LayoutLMv3 for document-processor
cp models/layoutlmv3-bank-finetuned-onnx-int8/* services/document-processor/models/

# Donut for document-processor
cp models/donut-receipts-finetuned/* services/document-processor/models/
```

### Model Loading in NestJS

```typescript
// services/wealth-analyzer/src/phi3/phi3.service.ts
import * as ort from "onnxruntime-node";

@Injectable()
export class Phi3Service implements OnModuleInit {
  private session: ort.InferenceSession;

  async onModuleInit() {
    this.session = await ort.InferenceSession.create(
      "./models/phi3-finance-finetuned.onnx",
      {
        executionProviders: ["cuda", "cpu"],
        graphOptimizationLevel: "all",
      }
    );
  }

  async generate(prompt: string): Promise<string> {
    // Tokenize
    const inputIds = this.tokenize(prompt);

    // Run inference
    const feeds = {
      input_ids: new ort.Tensor("int64", inputIds, [1, inputIds.length]),
    };
    const results = await this.session.run(feeds);

    // Decode
    const outputIds = results.logits.data;
    return this.decode(outputIds);
  }
}
```

---

## Summary

| Model          | Purpose                  | Training Time | Dataset Size        | Deployment  |
| -------------- | ------------------------ | ------------- | ------------------- | ----------- |
| **Phi-3**      | Natural language queries | 2-3 hours     | 10K-50K Q&A pairs   | ONNX (FP16) |
| **LayoutLMv3** | Bank statement parsing   | 5-8 hours     | 500-2000 statements | ONNX (INT8) |
| **Donut**      | Receipt parsing          | 8-12 hours    | 1000-5000 receipts  | PyTorch     |

**Next Steps**:

1. Collect and annotate datasets
2. Fine-tune models on local GPU
3. Convert to ONNX (quantize for production)
4. Deploy to apps (wealth-analyzer, document-processor)
5. Monitor inference latency and accuracy in production

---

## References

- [Unsloth Documentation](https://github.com/unslothai/unsloth)
- [LayoutLMv3 Paper](https://arxiv.org/abs/2204.08387)
- [Donut Paper](https://arxiv.org/abs/2111.15664)
- [Optimum ONNX Runtime](https://huggingface.co/docs/optimum/onnxruntime/overview)
- [Label Studio](https://labelstud.io/)
