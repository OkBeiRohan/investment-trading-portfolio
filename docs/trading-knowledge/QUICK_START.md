# Quick Start Guide: Fetching Varsity Content

> **Last Updated:** March 17, 2026

> **How to use the gradual fetching system to complete the trading knowledge base**

---

## 🎯 Current Status

- **Infrastructure:** ✅ 100% Complete (all folders, READMEs, guides)
- **Content:** ⏳ 5% Complete (11/212 chapters fetched)
- **Priority Modules:** Derivatives (Modules 4, 5, 6) - 52 chapters pending

**See [CONTENT_STATUS.md](./CONTENT_STATUS.md) for detailed progress tracking**

---

## 🚀 Quick Start

### Option 1: Automated Gradual Fetching (Recommended)

**Best for:** Fetching complete modules without hitting rate limits

```powershell
# From repository root:
cd c:\Code\investment-trading-portfolio

# Fetch Module 04 (Futures) - 13 chapters
.\scripts\fetch-varsity-gradual.ps1 -Module "04" -BatchSize 5 -DelaySeconds 15

# Fetch Module 05 (Options Theory) - 25 chapters
.\scripts\fetch-varsity-gradual.ps1 -Module "05" -BatchSize 5 -DelaySeconds 15

# Fetch Module 06 (Option Strategies) - 14 chapters
.\scripts\fetch-varsity-gradual.ps1 -Module "06" -BatchSize 5 -DelaySeconds 15
```

**What it does:**

1. Fetches chapters in small batches (default: 5 at a time)
2. Waits 15 seconds between batches (respects rate limits)
3. Saves HTML files to appropriate module folders
4. Opens the folder when complete

**Time estimate:**

- Module 04: ~10 minutes (13 chapters)
- Module 05: ~20 minutes (25 chapters)
- Module 06: ~12 minutes (14 chapters)
- **Total:** ~45 minutes for critical derivatives modules

---

### Option 2: Manual Browser-Based Fetching

**Best for:** Quick fetching of specific chapters or avoiding automation detection

#### Using MarkDownload Extension

1. **Install Extension:**
   - Chrome: https://chrome.google.com/webstore/detail/markdownload/pcmpcfapbekmbjjkdalcgopdkipoggdi
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/markdownload/

2. **Fetch Chapters:**

   ```
   a. Open Varsity chapter in browser
   b. Click MarkDownload icon
   c. Copy markdown content
   d. Paste into appropriate file in docs/trading-knowledge/{module}/
   e. Save with naming: {number}-{slug}.md
   ```

3. **Example:**
   ```
   URL: https://zerodha.com/varsity/chapter/leverage-payoff/
   Save to: docs/trading-knowledge/04-futures-trading/04-leverage-payoff.md
   ```

#### Using Copy-Paste

1. Open chapter URL
2. Select main content (skip comments section)
3. Copy to clipboard
4. Paste into new markdown file
5. Clean up formatting manually

---

## 📋 Recommended Fetching Order

### Phase 1: Critical for Algo Trading (Priority 1)

```powershell
# Day 1: Futures Foundation
.\scripts\fetch-varsity-gradual.ps1 -Module "04" -DelaySeconds 15

# Day 2: Options Theory (Part 1)
# Fetch manually using MarkDownload - 12 chapters per session

# Day 3: Options Theory (Part 2)
# Fetch remaining 13 chapters

# Day 4: Option Strategies
.\scripts\fetch-varsity-gradual.ps1 -Module "06" -DelaySeconds 15
```

**Total:** ~52 chapters in 4 days (~2 hours work)

### Phase 2: Technical Analysis & Risk (Priority 2)

```powershell
# Module 02: Technical Analysis (22 chapters)
# Module 09: Risk Management (16 chapters)
```

### Phase 3: Wealth Management (Priority 3)

```powershell
# Module 03: Fundamental Analysis (16 chapters)
# Module 11: Mutual Funds (32 chapters)
# Module 07: Taxation (8 chapters)
```

### Phase 4: Everything Else (Priority 4)

```powershell
# Modules 08, 10, 12-17 (~73 chapters)
```

---

## 🛠️ Post-Fetching Workflow

After fetching chapters (HTML files), you need to convert them to clean markdown:

### Step 1: Review HTML Content

```powershell
# Open module folder
cd docs\trading-knowledge\04-futures-trading
ls *.html  # See fetched files
```

### Step 2: Convert HTML to Markdown

**Option A: Use Pandoc (Automated)**

```powershell
# Install Pandoc first
# choco install pandoc

# Convert single file
pandoc 01-background-forwards-market.html -o 01-background-forwards-market.md

# Convert all HTML files in folder
Get-ChildItem *.html | ForEach-Object {
    $mdFile = $_.Name.Replace('.html', '.md')
    pandoc $_.FullName -o $mdFile
}
```

**Option B: Manual Editing**

1. Open HTML file in VS Code
2. Extract main content (ignore ads, comments)
3. Format as markdown:
   - Headers: `# H1`, `## H2`, etc.
   - Bold: `**text**`
   - Images: `![alt](https://zerodha.com/varsity/wp-content/uploads/...)`
   - Tables: Use markdown table syntax

### Step 3: Add Metadata & Navigation

Add to top of each chapter:

```markdown
# Chapter Title

> **Module:** XX: Module Name  
> **Chapter:** #  
> **Reading Time:** ~Y minutes  
> **Source:** [Zerodha Varsity](https://zerodha.com/varsity/chapter/...)  
> **Last Updated:** February 4, 2026

---

## 🎯 Learning Objectives

- Objective 1
- Objective 2
- Objective 3

---

[Previous Chapter content here...]

---

**Navigation:**  
[← Previous: Chapter Name](./02-previous-chapter.md) | [Table of Contents](./README.md) | [Next: Chapter Name →](./04-next-chapter.md)
```

### Step 4: Preserve Image URLs

**CRITICAL:** Keep original Zerodha image URLs (don't download images)

```markdown
✅ CORRECT:
![Chart](https://zerodha.com/varsity/wp-content/uploads/2023/05/chart.png)

❌ WRONG:
![Chart](./images/chart.png) # Don't create local copies
```

### Step 5: Update Module README

Mark chapter as complete in module README:

```markdown
| 04 | Leverage & Payoff | 04-leverage-payoff.md | ✅ Complete | 12 mins |
```

---

## ⏱️ Time Estimates

### Automated Fetching (Script)

| Module          | Chapters | Fetch Time | Convert Time | Total   |
| --------------- | -------- | ---------- | ------------ | ------- |
| 04 (Futures)    | 13       | 10 min     | 30 min       | ~40 min |
| 05 (Options)    | 25       | 20 min     | 60 min       | ~80 min |
| 06 (Strategies) | 14       | 12 min     | 35 min       | ~47 min |

### Manual Fetching (MarkDownload)

| Task           | Time per Chapter | Chapters | Total      |
| -------------- | ---------------- | -------- | ---------- |
| Open + Copy    | 2 min            | 10       | 20 min     |
| Paste + Format | 3 min            | 10       | 30 min     |
| Add Metadata   | 1 min            | 10       | 10 min     |
| **Total**      | **6 min**        | **10**   | **60 min** |

**Recommendation:** Use automated script for bulk fetching, manual for specific chapters.

---

## 🚨 Troubleshooting

### Problem 1: Rate Limiting (HTTP 429)

**Error:**

```
✗ Rate Limited (429) - Please wait longer between batches
```

**Solution:**

```powershell
# Increase delay between batches
.\scripts\fetch-varsity-gradual.ps1 -Module "05" -DelaySeconds 30  # Double the delay

# Or fetch in smaller batches
.\scripts\fetch-varsity-gradual.ps1 -Module "05" -BatchSize 3 -DelaySeconds 20
```

### Problem 2: 404 Not Found

**Error:**

```
✗ Not Found (404) - Chapter may be unavailable
```

**Solution:**

1. Check chapter URL manually in browser
2. If URL changed, update script with new URL
3. If chapter removed, mark as "Unavailable" in module README

### Problem 3: HTML Conversion Issues

**Problem:** Converted markdown has broken formatting

**Solution:**

```powershell
# Try different Pandoc options
pandoc input.html -f html -t markdown_strict -o output.md  # Basic markdown
pandoc input.html -f html -t gfm -o output.md  # GitHub Flavored Markdown
pandoc input.html -f html -t commonmark -o output.md  # CommonMark
```

### Problem 4: Missing Images

**Problem:** Images not displaying in markdown

**Solution:**
Check image URLs are absolute (start with `https://`):

```markdown
✅ Absolute URL (works):
![Chart](https://zerodha.com/varsity/wp-content/uploads/2023/05/chart.png)

❌ Relative URL (broken):
![Chart](../../wp-content/uploads/2023/05/chart.png)
```

---

## ✅ Quality Checklist

Before marking a chapter as "Complete":

- [ ] Markdown file created with proper naming (`{num}-{slug}.md`)
- [ ] Metadata added (Module, Chapter #, Reading Time, Source URL)
- [ ] Learning objectives listed
- [ ] Main content extracted (no ads/comments)
- [ ] Images have absolute URLs (`https://zerodha.com/varsity/...`)
- [ ] Tables properly formatted in markdown
- [ ] Navigation links added (Previous/Next)
- [ ] Module README updated with completion status
- [ ] File saved with UTF-8 encoding

---

## 📊 Progress Tracking

### Daily Goal

**Target:** 10-15 chapters per day (1-2 hours work)

### Weekly Goal

**Week 1:** Priority modules (Futures, Options)  
**Week 2:** Technical Analysis, Risk Management  
**Week 3:** Wealth Management modules  
**Week 4:** Remaining specialized modules

### Monthly Goal

**Month 1:** Complete all 212 chapters ✅

---

## 🎯 Next Steps

### Today (Immediate)

1. Run fetching script for Module 04 (Futures):

   ```powershell
   .\scripts\fetch-varsity-gradual.ps1 -Module "04"
   ```

2. Convert first batch of HTML files to markdown
3. Add metadata and navigation
4. Update [CONTENT_STATUS.md](./CONTENT_STATUS.md)

### This Week

1. Complete Modules 04, 05, 06 (derivatives)
2. Update IMPLEMENTATION_GUIDE with specific feature mappings
3. Create first feature based on completed modules

### This Month

1. Complete all 212 chapters
2. Build interactive calculators (Greeks, P&L)
3. Integrate with platform dashboard
4. Create video tutorials

---

## 📞 Need Help?

- **Script Issues:** Check [scripts/fetch-varsity-gradual.ps1](../../../scripts/fetch-varsity-gradual.ps1) comments
- **Markdown Formatting:** See [STRUCTURE_GUIDE.md](./STRUCTURE_GUIDE.md)
- **Platform Integration:** See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- **Progress Tracking:** See [CONTENT_STATUS.md](./CONTENT_STATUS.md)

---

**Last Updated:** March 17, 2026  
**Next Review:** After completing Module 04 (Futures)
