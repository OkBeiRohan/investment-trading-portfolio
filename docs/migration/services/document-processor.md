# Document Processor Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `services/document-processor`  
> **Status**: Scaffolded

## Overview

OCR and document understanding service using LayoutLMv3 for extracting structured data from financial documents (contract notes, tax statements, holding reports).

## Key Dependencies

- `onnxruntime-node` >=1.24
- LayoutLMv3 ONNX model
- Tesseract.js for OCR fallback
- MongoDB for document metadata
- Redis for job queue

## Key Changes

- ONNX Runtime upgraded to 1.24+ with worker thread support
- Document classification pipeline added
- Results stored in MongoDB `processed_documents` collection
- Job queue moved from Bull to BullMQ (Redis-backed)

## Migration Steps

1. Update `onnxruntime-node` to >=1.24
2. Place LayoutLMv3 ONNX model in `models/` directory
3. Update BullMQ configuration for Redis 7+
4. Verify OCR pipeline with sample documents
5. Test document classification accuracy
6. Verify MongoDB storage of extracted data
7. Run integration tests: `pnpm test`
