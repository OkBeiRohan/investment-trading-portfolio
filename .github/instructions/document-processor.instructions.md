---
applyTo: "apps/document-processor/**"
---

# GitHub Copilot Instructions - Document Processor Service

## Role & Context

You are working on the **Document Processor Service** - an AI-powered document intelligence system that extracts financial data from bank statements, receipts, invoices, and insurance documents. This NestJS service uses LayoutLMv3, Donut, and OCR for structured and unstructured document parsing.

## Application Overview

**Purpose**: AI-powered document parsing and data extraction  
**Port**: 3006  
**Stack**: NestJS, MongoDB (metadata), LayoutLMv3 (structured docs), Donut (unstructured), Tesseract OCR

**Responsibilities**:

- Bank statement parsing (PDF/CSV/images)
- Receipt/invoice data extraction
- Insurance policy parsing (term insurance, health, vehicle)
- Transaction categorization and deduplication
- Multi-language support (English, Hindi, regional languages)
- Document classification (statement vs receipt vs invoice)

---

## Critical Architecture Rules

### 1. Model Selection Based on Document Type (MANDATORY)

**Use LayoutLMv3 for structured documents (bank statements, invoices) - Use Donut for unstructured (receipts, handwritten notes)**

```typescript
// ✅ CORRECT - Route to appropriate model
import { LayoutLMv3Service } from './models/layoutlmv3.service';
import { DonutService } from './models/donut.service';

@Injectable()
export class DocumentProcessorService {
  constructor(
    private readonly layoutlmv3: LayoutLMv3Service,
    private readonly donut: DonutService,
    private readonly classifier: DocumentClassifierService,
  ) {}

  async processDocument(file: Express.Multer.File): Promise<ExtractedData> {
    // 1. Classify document
    const docType = await this.classifier.classify(file.buffer);

    // 2. Route to appropriate model
    if (docType === 'BANK_STATEMENT' || docType === 'INVOICE') {
      // Structured documents → LayoutLMv3
      return this.layoutlmv3.extract(file.buffer, docType);
    } else if (docType === 'RECEIPT' || docType === 'HANDWRITTEN') {
      // Unstructured documents → Donut
      return this.donut.extract(file.buffer, docType);
    } else {
      throw new Error(`Unsupported document type: ${docType}`);
    }
  }
}

// ❌ WRONG - Using generic OCR for all documents
const text = await tesseract.recognize(file.buffer);
// No structured extraction, just raw text
```

**Document Type Mapping**:

```
Bank Statements (PDF/images) → LayoutLMv3 (table extraction)
Invoices (structured)        → LayoutLMv3 (key-value extraction)
Receipts (unstructured)      → Donut (end-to-end extraction)
Handwritten notes            → Donut (no OCR needed)
Insurance policies           → LayoutLMv3 (form extraction)
```

---

### 2. LayoutLMv3 for Structured Documents

**Use LayoutLMv3 for documents with tables, forms, key-value pairs**

```typescript
// ✅ CORRECT - LayoutLMv3 inference with ONNX
import * as ort from 'onnxruntime-node';

@Injectable()
export class LayoutLMv3Service {
  private session: ort.InferenceSession;
  private processor: LayoutLMv3Processor;

  async onModuleInit() {
    // Load quantized ONNX model
    this.session = await ort.InferenceSession.create(
      '../models/layoutlmv3-bank-statement-finetuned.onnx',
      {
        executionProviders: ['cuda', 'cpu'],
        graphOptimizationLevel: 'all',
      },
    );
  }

  async extract(
    imageBuffer: Buffer,
    docType: string,
  ): Promise<BankStatementData> {
    // 1. Preprocess: Resize to 224x224, normalize
    const { pixelValues, bbox, attention_mask } =
      await this.processor.preprocess(imageBuffer);

    // 2. Run inference
    const feeds = {
      pixel_values: new ort.Tensor('float32', pixelValues, [1, 3, 224, 224]),
      bbox: new ort.Tensor('int64', bbox, [1, 512, 4]),
      attention_mask: new ort.Tensor('int64', attention_mask, [1, 512]),
    };

    const results = await this.session.run(feeds);

    // 3. Post-process: Extract entities
    const entities = this.processor.postprocess(results);

    // 4. Structure extraction
    return {
      accountNumber: entities.find((e) => e.label === 'ACCOUNT_NUMBER')?.text,
      ifscCode: entities.find((e) => e.label === 'IFSC')?.text,
      openingBalance: parseFloat(
        entities.find((e) => e.label === 'OPENING_BALANCE')?.text || '0',
      ),
      closingBalance: parseFloat(
        entities.find((e) => e.label === 'CLOSING_BALANCE')?.text || '0',
      ),
      transactions: this.extractTransactions(entities),
      statementPeriod: {
        startDate: entities.find((e) => e.label === 'START_DATE')?.text,
        endDate: entities.find((e) => e.label === 'END_DATE')?.text,
      },
    };
  }

  private extractTransactions(entities: Entity[]): Transaction[] {
    // Group entities by row (table extraction)
    const rows = this.groupEntitiesByRow(entities);

    return rows.map((row) => ({
      date: row.find((e) => e.label === 'TXN_DATE')?.text,
      description: row.find((e) => e.label === 'TXN_DESC')?.text,
      amount: parseFloat(row.find((e) => e.label === 'AMOUNT')?.text || '0'),
      type: row.find((e) => e.label === 'TYPE')?.text as 'DEBIT' | 'CREDIT',
      balance: parseFloat(row.find((e) => e.label === 'BALANCE')?.text || '0'),
    }));
  }
}
```

**LayoutLMv3 Key Advantages**:

- **Spatial Awareness**: Understands document layout (tables, columns)
- **Multi-Modal**: Combines visual + text features
- **Fine-Tunable**: Can be fine-tuned on bank-specific statement formats
- **Fast**: <500ms inference on RTX GPU

---

### 3. Donut for Unstructured Documents

**Use Donut (Document Understanding Transformer) for receipts, handwritten notes**

```typescript
// ✅ CORRECT - Donut end-to-end inference
import { AutoProcessor, VisionEncoderDecoderModel } from '@xenova/transformers';

@Injectable()
export class DonutService {
  private model: VisionEncoderDecoderModel;
  private processor: AutoProcessor;

  async onModuleInit() {
    this.processor = await AutoProcessor.from_pretrained(
      'naver-clova-ix/donut-base-finetuned-receipts',
    );
    this.model = await VisionEncoderDecoderModel.from_pretrained(
      'naver-clova-ix/donut-base-finetuned-receipts',
    );
  }

  async extract(imageBuffer: Buffer, docType: string): Promise<ReceiptData> {
    // 1. Preprocess image
    const image = await this.loadImage(imageBuffer);
    const inputs = await this.processor(image);

    // 2. Generate output (decoder autoregressively generates JSON)
    const outputs = await this.model.generate(inputs.pixel_values, {
      max_length: 512,
      decoder_start_token_id: this.processor.tokenizer.bos_token_id,
    });

    // 3. Decode output
    const text = this.processor.tokenizer.decode(outputs[0], {
      skip_special_tokens: true,
    });

    // 4. Parse JSON output
    const data = JSON.parse(text);

    return {
      merchantName: data.merchant_name,
      date: data.date,
      total: parseFloat(data.total),
      items: data.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      paymentMethod: data.payment_method,
      taxAmount: parseFloat(data.tax),
    };
  }
}
```

**Donut Key Advantages**:

- **End-to-End**: No separate OCR step (handles low-quality images)
- **Unstructured**: Works on receipts, handwritten notes
- **JSON Output**: Directly generates structured JSON
- **Multi-Language**: Supports 100+ languages

---

### 4. Document Classification Pipeline

**Classify document type before extraction**

```typescript
// ✅ CORRECT - CNN-based document classifier
@Injectable()
export class DocumentClassifierService {
  private session: ort.InferenceSession;

  async onModuleInit() {
    this.session = await ort.InferenceSession.create(
      '../models/document-classifier-efficientnet.onnx',
    );
  }

  async classify(imageBuffer: Buffer): Promise<DocumentType> {
    // Preprocess: Resize to 224x224, normalize
    const tensor = await this.preprocessImage(imageBuffer);

    const feeds = { input: tensor };
    const results = await this.session.run(feeds);

    const logits = results.output.data as Float32Array;
    const classIdx = logits.indexOf(Math.max(...logits));

    const classes: DocumentType[] = [
      'BANK_STATEMENT',
      'INVOICE',
      'RECEIPT',
      'INSURANCE_POLICY',
      'HANDWRITTEN',
      'OTHER',
    ];

    return classes[classIdx];
  }
}
```

---

### 5. Event-Driven Integration (MANDATORY)

**Publish extracted data as events - NO direct database writes**

```typescript
// ✅ CORRECT - Publish DOCUMENT_TRANSACTIONS_EXTRACTED event
@Injectable()
export class DocumentProcessorController {
  constructor(
    private readonly processor: DocumentProcessorService,
    private readonly eventBus: EventBusService,
  ) {}

  @Post('upload/statement')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStatement(
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: UploadMetadata,
  ) {
    // 1. Process document
    const extracted = await this.processor.processDocument(file);

    // 2. Publish event for wealth-management to consume
    await this.eventBus.publish('stream:document-events', {
      event: 'DOCUMENT_TRANSACTIONS_EXTRACTED',
      userId: metadata.userId,
      organizationId: metadata.organizationId,
      documentType: 'BANK_STATEMENT',
      accountNumber: extracted.accountNumber,
      transactions: extracted.transactions,
      timestamp: Date.now(),
    });

    // 3. Store document metadata in MongoDB
    await this.documentModel.create({
      userId: metadata.userId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      documentType: 'BANK_STATEMENT',
      processedAt: new Date(),
      extractedData: extracted,
    });

    return { success: true, transactionCount: extracted.transactions.length };
  }
}

// ❌ WRONG - Directly inserting into wealth-management database
await Transaction.insertMany(extracted.transactions); // Wrong service boundary
```

---

### 6. Deduplication Logic (CRITICAL)

**Check for duplicate transactions before publishing events**

```typescript
// ✅ CORRECT - Deduplication based on transaction fingerprint
@Injectable()
export class DeduplicationService {
  async filterDuplicates(
    userId: string,
    transactions: ExtractedTransaction[],
  ): Promise<ExtractedTransaction[]> {
    const unique: ExtractedTransaction[] = [];

    for (const txn of transactions) {
      // Compute fingerprint: hash(date + description + amount)
      const fingerprint = this.computeFingerprint(txn);

      // Check if exists in MongoDB
      const exists = await this.transactionModel.exists({
        userId,
        fingerprint,
      });

      if (!exists) {
        unique.push(txn);
      }
    }

    return unique;
  }

  private computeFingerprint(txn: ExtractedTransaction): string {
    const crypto = require('crypto');
    const data = `${txn.date}|${txn.description}|${txn.amount}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
```

---

### 7. Multi-Language Support

**Use multilingual models for regional languages**

```typescript
// ✅ CORRECT - Support Hindi, Tamil, Bengali, etc.
@Injectable()
export class MultilingualOCRService {
  private tesseract: Tesseract.Worker;

  async onModuleInit() {
    this.tesseract = await Tesseract.createWorker(
      'eng+hin+tam+ben+mar+guj',
      1,
      {
        logger: (m) => console.log(m),
      },
    );
  }

  async extractText(imageBuffer: Buffer, language?: string): Promise<string> {
    const {
      data: { text },
    } = await this.tesseract.recognize(imageBuffer);
    return text;
  }
}
```

---

## Key Features

### 1. Bank Statement Parsing

```typescript
interface BankStatementData {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  openingBalance: number;
  closingBalance: number;
  statementPeriod: {
    startDate: string;
    endDate: string;
  };
  transactions: {
    date: string;
    description: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    balance: number;
    category?: string; // Auto-categorized
  }[];
}
```

### 2. Receipt Parsing

```typescript
interface ReceiptData {
  merchantName: string;
  date: string;
  total: number;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  paymentMethod: string;
  taxAmount: number;
  category: string; // Auto-categorized (e.g., "Groceries")
}
```

### 3. Insurance Policy Parsing

```typescript
interface InsurancePolicyData {
  policyType: 'TERM' | 'HEALTH' | 'VEHICLE';
  policyNumber: string;
  insurerName: string;
  policyHolderName: string;
  sumInsured: number;
  premium: {
    amount: number;
    frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  };
  coverageStartDate: string;
  coverageEndDate: string;
  nominees: {
    name: string;
    relationship: string;
    share: number; // Percentage
  }[];
}
```

---

## Training & Fine-Tuning

### LayoutLMv3 Fine-Tuning

```python
# Fine-tune LayoutLMv3 on custom bank statement dataset
from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification, Trainer

# Load base model
model = LayoutLMv3ForTokenClassification.from_pretrained(
    "microsoft/layoutlmv3-base",
    num_labels=len(label_list)  # ACCOUNT_NUMBER, IFSC, AMOUNT, etc.
)

processor = LayoutLMv3Processor.from_pretrained("microsoft/layoutlmv3-base")

# Prepare dataset (images + bounding boxes + labels)
train_dataset = BankStatementDataset(
    image_dir="data/train/images",
    annotation_dir="data/train/annotations"
)

# Training arguments
training_args = TrainingArguments(
    output_dir="./models/layoutlmv3-bank-finetuned",
    per_device_train_batch_size=4,
    num_train_epochs=10,
    learning_rate=5e-5,
    fp16=True  # Mixed precision
)

# Train
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset
)

trainer.train()

# Export to ONNX
from optimum.onnxruntime import ORTModelForTokenClassification
ort_model = ORTModelForTokenClassification.from_pretrained(
    "./models/layoutlmv3-bank-finetuned",
    export=True
)
ort_model.save_pretrained("./models/layoutlmv3-bank-finetuned-onnx")
```

**See**: `docs/AI_MODEL_TRAINING.md` for complete training guide.

---

## Performance Optimizations

### 1. Batch Processing

```typescript
// Process multiple pages concurrently
async processMultiPageStatement(pages: Buffer[]): Promise<BankStatementData> {
  // Process pages in parallel
  const results = await Promise.all(
    pages.map(page => this.layoutlmv3.extract(page, 'BANK_STATEMENT'))
  );

  // Merge results
  return this.mergeMultiPageResults(results);
}
```

### 2. Model Quantization

```bash
# Quantize LayoutLMv3 to INT8 for faster inference
python -m onnxruntime.quantization.quantize \
  --input layoutlmv3-bank-finetuned.onnx \
  --output layoutlmv3-bank-finetuned-int8.onnx \
  --per_channel
```

---

## Environment Variables

```bash
PORT=3006
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/documents

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Models
LAYOUTLMV3_MODEL_PATH=../models/layoutlmv3-bank-statement-finetuned.onnx
DONUT_MODEL_PATH=../models/donut-base-finetuned-receipts
CLASSIFIER_MODEL_PATH=../models/document-classifier-efficientnet.onnx

# OCR
TESSERACT_LANG=eng+hin+tam+ben+mar+guj

# S3 (for document storage)
AWS_S3_BUCKET=wealth-documents
AWS_REGION=ap-south-1
```

---

## Common Anti-Patterns to Avoid

❌ Using generic OCR for structured documents  
❌ Not classifying document type first  
❌ Missing deduplication checks  
❌ Directly writing to wealth-management database  
❌ No multi-language support  
❌ Processing synchronously (use background jobs)  
❌ Not handling multi-page documents

---

## References

- [LayoutLMv3 Paper](https://arxiv.org/abs/2204.08387)
- [Donut Paper](https://arxiv.org/abs/2111.15664)
- [ONNX Runtime](https://onnxruntime.ai/)
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)
- [Root Architecture](../../../ARCHITECTURE.md)
- [AI Model Training Guide](../../../docs/AI_MODEL_TRAINING.md)

