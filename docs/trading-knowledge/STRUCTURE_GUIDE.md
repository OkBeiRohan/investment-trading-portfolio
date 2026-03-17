# Trading Knowledge Structure Guide

> **Navigation guide for the complete Zerodha Varsity knowledge base**

**Last Updated:** March 17, 2026

---

## Folder Organization

The trading knowledge base follows a **hierarchical structure** designed for easy navigation and progressive learning:

```
docs/trading-knowledge/
│
├── README.md                           # Main index (start here)
├── IMPLEMENTATION_GUIDE.md             # How to use in our platform
│
├── 01-introduction-to-stock-markets/   # Module 1
│   ├── README.md                       # Module overview + chapter index
│   ├── 01-the-need-to-invest.md
│   ├── 02-regulators.md
│   ├── 03-market-intermediaries.md
│   └── ...                             # All 15 chapters
│
├── 02-technical-analysis/              # Module 2
│   ├── README.md
│   ├── 01-background.md
│   ├── 02-introducing-technical-analysis.md
│   └── ...                             # All 22 chapters
│
├── 03-fundamental-analysis/
├── 04-futures-trading/
├── 05-options-theory/                  # Module 5 (example)
│   ├── README.md                       # 📖 Start here for options
│   ├── 01-call-option-basics.md
│   ├── 02-basic-option-jargons.md
│   ├── 03-buying-call-option.md        # ✅ Sample chapter (detailed)
│   ├── 04-selling-call-option.md
│   └── ...                             # 25 chapters total
│
├── 06-option-strategies/
├── 07-markets-taxation/
├── 08-currency-commodity-gsec/
├── 09-risk-management-psychology/      # ✅ Sample module (detailed)
├── 10-trading-systems/
├── 11-mutual-funds/
├── 12-innerworth-mind-over-markets/
├── 13-financial-modelling/
├── 14-insurance/
├── 15-sector-analysis/
├── 16-social-stock-exchanges/
└── 17-nps/
```

---

## 📖 Document Types

### 1. Main README (`README.md`)

**Location:** `docs/trading-knowledge/README.md`

**Purpose:** Central navigation hub

**Contains:**

- Overview of all 17 modules
- Learning paths (Beginner, Trader, Quant, etc.)
- Quick reference (key concepts, strategies)
- Links to implementation guide

---

### 2. Module README (`{module}/README.md`)

**Example:** `05-options-theory/README.md`

**Purpose:** Module-specific overview

**Contains:**

- Module introduction and difficulty level
- Complete chapter list with links
- Learning outcomes
- Key concepts summary
- Practical applications
- Tools and resources
- Completion checklist

**Use when:** Starting a new module

---

### 3. Chapter Files (`{module}/{chapter-name}.md`)

**Example:** `05-options-theory/03-buying-call-option.md`

**Purpose:** Detailed chapter content

**Contains:**

- Learning objectives
- Core concepts explained
- Worked examples
- Formulas and calculations
- Payoff diagrams (for options)
- Quiz/self-assessment
- Links to related chapters

**Use when:** Deep-diving into specific topic

---

### 4. Implementation Guide (`IMPLEMENTATION_GUIDE.md`)

**Location:** `docs/trading-knowledge/IMPLEMENTATION_GUIDE.md`

**Purpose:** Map Varsity concepts to our platform features

**Contains:**

- Feature recommendations for each module
- Code examples (TypeScript, Rust, Python)
- UI/UX suggestions
- Data requirements
- Priority roadmap

**Use when:** Planning features or building new components

---

## 🎓 How to Use This Knowledge Base

### For Learning (Self-Study)

**Step 1:** Start with [Main README](./README.md)  
→ Choose learning path based on your goal

**Step 2:** Read Module README  
→ Understand scope and prerequisites

**Step 3:** Study chapters sequentially  
→ Complete quizzes and checkpoints

**Step 4:** Practice with tools  
→ Use Kite, TradingView, or our platform

---

### For Development (Platform Features)

**Step 1:** Identify feature area  
→ E.g., "Build options chain UI"

**Step 2:** Read relevant module  
→ Module 05 (Options Theory)

**Step 3:** Check [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)  
→ See technical recommendations

**Step 4:** Reference chapter files for details  
→ Greeks calculations, payoff diagrams

**Step 5:** Build and test  
→ Use chapter examples for validation

---

### For Research (Algo Trading)

**Step 1:** Study modules 2, 4, 5, 9, 10  
→ Technical Analysis + Derivatives + Risk

**Step 2:** Extract feature ideas  
→ Candlestick patterns, Greeks, VaR

**Step 3:** Implement in compute-engine (Rust)  
→ See [compute-engine README](../../../packages/compute-engine/README.md)

**Step 4:** Train models in training-pipeline  
→ See [training-pipeline docs](../../../services/training-pipeline/docs/)

**Step 5:** Deploy in algo-worker  
→ See [algo-worker docs](../../../apps/algo-worker/docs/)

---

## 🗺️ Navigation Patterns

### By Module Number

```
Module 01 → Stock Market Basics
Module 02 → Technical Analysis
Module 03 → Fundamental Analysis
Module 04 → Futures
Module 05 → Options Theory
Module 06 → Options Strategies
Module 07 → Taxation
Module 08 → Currency/Commodity
Module 09 → Risk Management
Module 10 → Trading Systems
Module 11 → Mutual Funds
Module 12 → Psychology
Module 13 → Financial Modelling
Module 14 → Insurance
Module 15 → Sector Analysis
Module 16 → Social Stock Exchanges
Module 17 → NPS
```

### By Difficulty Level

**Beginner** (Start here)

- Module 01: Introduction to Stock Markets
- Module 03: Fundamental Analysis
- Module 11: Mutual Funds

**Intermediate**

- Module 02: Technical Analysis
- Module 04: Futures Trading
- Module 07: Markets & Taxation

**Advanced**

- Module 05: Options Theory
- Module 06: Options Strategies
- Module 09: Risk Management
- Module 10: Trading Systems
- Module 13: Financial Modelling

**Specialized**

- Module 08: Currency, Commodity & G-Sec
- Module 12: Innerworth (Psychology)
- Module 14: Insurance
- Module 15: Sector Analysis
- Module 16: Social Stock Exchanges
- Module 17: NPS

---

## 📚 Content Status

| Module                      | Chapters | README      | Sample Chapters | Status                |
| --------------------------- | -------- | ----------- | --------------- | --------------------- |
| 01 - Stock Markets          | 15       | ✅ Complete | 📝 Pending      | Ready for content     |
| 02 - Technical Analysis     | 22       | ✅ Complete | 📝 Pending      | Ready for content     |
| 03 - Fundamental Analysis   | 16       | 📝 Pending  | 📝 Pending      | Structure ready       |
| 04 - Futures Trading        | 13       | 📝 Pending  | 📝 Pending      | Structure ready       |
| 05 - Options Theory         | 25       | ✅ Complete | ✅ Ch 03 Done   | 🎯 **Example Module** |
| 06 - Options Strategies     | 14       | 📝 Pending  | 📝 Pending      | Structure ready       |
| 07 - Markets & Taxation     | 8        | 📝 Pending  | 📝 Pending      | Structure ready       |
| 08 - Currency/Commodity     | 20       | 📝 Pending  | 📝 Pending      | Structure ready       |
| 09 - Risk Management        | 16       | ✅ Complete | 📝 Pending      | 🎯 **Example Module** |
| 10 - Trading Systems        | 16       | 📝 Pending  | 📝 Pending      | Structure ready       |
| 11 - Mutual Funds           | 32       | 📝 Pending  | 📝 Pending      | Structure ready       |
| 12 - Innerworth             | 603      | 📝 Pending  | 📝 Sampled (30) | Structure ready       |
| 13 - Financial Modelling    | 18       | 📝 Pending  | 📝 Pending      | Structure ready       |
| 14 - Insurance              | 9        | 📝 Pending  | 📝 Pending      | Structure ready       |
| 15 - Sector Analysis        | 15       | 📝 Pending  | 📝 Pending      | Structure ready       |
| 16 - Social Stock Exchanges | 4        | 📝 Pending  | 📝 Pending      | Structure ready       |
| 17 - NPS                    | 9        | 📝 Pending  | 📝 Pending      | Structure ready       |

**Legend:**

- ✅ Complete: Fully written with examples
- 📝 Pending: Structure exists, content TBD
- 🎯 Example: Sample module with detailed content

---

## ✅ Next Steps

To complete this knowledge base, we need to:

### Phase 1: Core Modules (Priority)

1. ✅ Create folder structure ✓
2. ✅ Write main README ✓
3. ✅ Write IMPLEMENTATION_GUIDE ✓
4. ✅ Complete Module 05 README (Options) ✓
5. ✅ Complete Module 09 README (Risk) ✓
6. ✅ Write sample chapter (Options Ch 03) ✓

### Phase 2: Content Population

7. 📝 Fetch full content from Varsity for all chapters
8. 📝 Convert to markdown with proper formatting
9. 📝 Add diagrams, tables, and examples
10. 📝 Create quizzes for each chapter

### Phase 3: Enhancement

11. 📝 Add interactive charts (TradingView embeds)
12. 📝 Create video references (YouTube links)
13. 📝 Build calculators (Greeks, VaR, Kelly)
14. 📝 Add case studies with real trades

---

## 🤝 Contributing

To add or update content:

### 1. Follow Naming Convention

```
Module folder: {number}-{kebab-case-name}/
Chapter file: {number}-{kebab-case-title}.md

Example:
05-options-theory/
  03-buying-call-option.md
```

### 2. Use Consistent Frontmatter

```markdown
# Chapter Title

> **Brief description**

**Module:** Parent module name  
**Chapter:** X of Y  
**Source:** https://zerodha.com/varsity/...  
**Difficulty:** Beginner/Intermediate/Advanced  
**Reading Time:** X minutes
```

### 3. Include Standard Sections

- 📖 Overview
- 🎯 Learning Objectives
- [Core Content with headings]
- 💡 Practical Applications
- 📊 Examples/Calculations
- ⚠️ Common Mistakes
- ✅ Key Takeaways
- ❓ Quiz
- 🔗 Related Chapters

### 4. Link Generously

```markdown
See [Options Theory Module](../05-options-theory/)
Previous: [Call Option Basics](./01-call-option-basics.md)
Next: [Selling Call Options](./04-selling-call-option.md)
```

---

## 📞 Questions?

- **General queries:** Check [Main README](./README.md)
- **Implementation:** See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- **Algo trading:** See [apps/algo-worker/docs/](../../../apps/algo-worker/docs/)
- **ML training:** See [services/training-pipeline/docs/](../../../services/training-pipeline/docs/)

---

**Last Updated:** March 17, 2026  
**Maintained by:** Quantum Investments Team
