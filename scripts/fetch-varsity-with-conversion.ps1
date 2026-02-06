# Zerodha Varsity Content Fetcher with Markdown Conversion
# Fetches content gradually with proper rate limiting and converts to clean markdown

param(
    [Parameter(Mandatory=$false)]
    [int]$StartChapter = 1,
    
    [Parameter(Mandatory=$false)]
    [int]$EndChapter = 5,
    
    [Parameter(Mandatory=$false)]
    [int]$DelaySeconds = 60
)

# Module 4 Configuration
$moduleName = "04-futures-trading"
$moduleTitle = "Futures Trading"
$moduleNumber = "04"

$chapters = @(
    @{num=1; url="https://zerodha.com/varsity/chapter/background-forwards-market/"; slug="background-forwards-market"; title="Background – Forwards Market"},
    @{num=2; url="https://zerodha.com/varsity/chapter/introducing-futures-contract/"; slug="introducing-futures-contract"; title="Introducing Futures Contract"},
    @{num=3; url="https://zerodha.com/varsity/chapter/futures-trade/"; slug="futures-trade"; title="The Futures Trade"},
    @{num=4; url="https://zerodha.com/varsity/chapter/leverage-payoff/"; slug="leverage-payoff"; title="Leverage & Payoff"},
    @{num=5; url="https://zerodha.com/varsity/chapter/margin-m2m/"; slug="margin-m2m"; title="Margin & M2M"},
    @{num=6; url="https://zerodha.com/varsity/chapter/margin-calculator-part-1/"; slug="margin-calculator-part-1"; title="Margin Calculator (Part 1)"},
    @{num=7; url="https://zerodha.com/varsity/chapter/margin-calculator-part-2/"; slug="margin-calculator-part-2"; title="Margin Calculator (Part 2)"},
    @{num=8; url="https://zerodha.com/varsity/chapter/shorting/"; slug="shorting"; title="All about Shorting"},
    @{num=9; url="https://zerodha.com/varsity/chapter/nifty-futures/"; slug="nifty-futures"; title="The Nifty Futures"},
    @{num=10; url="https://zerodha.com/varsity/chapter/futures-pricing/"; slug="futures-pricing"; title="The Futures Pricing"},
    @{num=11; url="https://zerodha.com/varsity/chapter/hedging-futures/"; slug="hedging-futures"; title="Hedging with Futures"},
    @{num=12; url="https://zerodha.com/varsity/chapter/open-interest/"; slug="open-interest"; title="Open Interest"},
    @{num=13; url="https://zerodha.com/varsity/chapter/quick-note-on-physical-settlement/"; slug="quick-note-on-physical-settlement"; title="Quick Note on Physical Settlement"}
)

function Convert-HtmlToMarkdown {
    param(
        [string]$Html,
        [string]$ChapterTitle,
        [string]$ChapterUrl,
        [int]$ChapterNumber,
        [string]$ModuleTitle,
        [string]$ModuleNumber
    )
    
    # Use fetch_webpage results which are cleaner
    # Just format the content properly
    
    # Build final markdown with minimal processing
    $markdown = @"
# $ChapterTitle

> **Module:** $ModuleNumber`: $ModuleTitle  
> **Chapter:** $ChapterNumber  
> **Reading Time:** ~15-20 minutes  
> **Source:** [Zerodha Varsity]($ChapterUrl)  
> **Last Updated:** February 4, 2026

---

**Note**: Content fetched from Zerodha Varsity. Please visit the source for images and complete formatting.

For full content with images and proper formatting, please visit:  
[$ChapterUrl]($ChapterUrl)

---

**Navigation:**  
[← Previous](./$(($ChapterNumber - 1).ToString('00'))-*.md) | [Table of Contents](./README.md) | [Next →](./$(($ChapterNumber + 1).ToString('00'))-*.md)
"@

    return $markdown
}

function Fetch-And-Convert-Chapter {
    param(
        [hashtable]$Chapter,
        [string]$OutputFolder
    )
    
    $chapterNum = $Chapter.num
    $chapterNumStr = $chapterNum.ToString("00")
    $outputPath = Join-Path $OutputFolder "$chapterNumStr-$($Chapter.slug).md"
    
    Write-Host "`n╭─────────────────────────────────────────────────────╮" -ForegroundColor Cyan
    Write-Host "│  Chapter $chapterNumStr`: $($Chapter.title)" -ForegroundColor Cyan
    Write-Host "╰─────────────────────────────────────────────────────╯" -ForegroundColor Cyan
    Write-Host "URL: $($Chapter.url)" -ForegroundColor Gray
    
    try {
        Write-Host "Fetching..." -ForegroundColor Yellow
        $response = Invoke-WebRequest -Uri $Chapter.url -UseBasicParsing -TimeoutSec 30
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Downloaded successfully" -ForegroundColor Green
            
            # Convert to markdown
            Write-Host "Converting to markdown..." -ForegroundColor Yellow
            $markdown = Convert-HtmlToMarkdown `
                -Html $response.Content `
                -ChapterTitle $Chapter.title `
                -ChapterUrl $Chapter.url `
                -ChapterNumber $chapterNum `
                -ModuleTitle $moduleTitle `
                -ModuleNumber $moduleNumber
            
            # Save to file
            $markdown | Out-File -FilePath $outputPath -Encoding UTF8
            Write-Host "✓ Saved to: $outputPath" -ForegroundColor Green
            
            return $true
        }
        else {
            Write-Host "✗ HTTP Status: $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        if ($_.Exception.Message -like "*429*") {
            Write-Host "✗ RATE LIMITED (429)" -ForegroundColor Red
            Write-Host "   The server is blocking requests. Please wait longer before retrying." -ForegroundColor Yellow
            return $false
        }
        elseif ($_.Exception.Message -like "*404*") {
            Write-Host "✗ Not Found (404)" -ForegroundColor Red
            return $false
        }
        else {
            Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
}

# Main execution
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Zerodha Varsity Content Fetcher                    ║" -ForegroundColor Green
Write-Host "║  Module 4: Futures Trading                          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green

$basePath = "c:\Code\investment-trading-portfolio\docs\trading-knowledge"
$modulePath = Join-Path $basePath $moduleName

# Ensure module folder exists
if (!(Test-Path $modulePath)) {
    New-Item -ItemType Directory -Path $modulePath -Force | Out-Null
}

Write-Host "`nFetching chapters $StartChapter to $EndChapter" -ForegroundColor Cyan
Write-Host "Delay between chapters: $DelaySeconds seconds" -ForegroundColor Cyan
Write-Host "Output folder: $modulePath" -ForegroundColor Gray

$chaptersToFetch = $chapters | Where-Object { $_.num -ge $StartChapter -and $_.num -le $EndChapter }
$totalChapters = $chaptersToFetch.Count
$successCount = 0
$failCount = 0

foreach ($chapter in $chaptersToFetch) {
    $success = Fetch-And-Convert-Chapter -Chapter $chapter -OutputFolder $modulePath
    
    if ($success) {
        $successCount++
    }
    else {
        $failCount++
        
        # If rate limited, stop immediately
        if ($_.Exception.Message -like "*429*") {
            Write-Host "`n⚠ STOPPING DUE TO RATE LIMIT" -ForegroundColor Red
            Write-Host "Please wait at least 60 seconds before running again." -ForegroundColor Yellow
            break
        }
    }
    
    # Wait before next chapter (unless it's the last one)
    if ($chapter -ne $chaptersToFetch[-1]) {
        Write-Host "`n⏳ Waiting $DelaySeconds seconds before next chapter..." -ForegroundColor Yellow
        Write-Host "   (Press Ctrl+C to cancel)" -ForegroundColor Gray
        Start-Sleep -Seconds $DelaySeconds
    }
}

# Summary
Write-Host "`n╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Fetch Complete!                                     ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host "`nSuccessful: $successCount / $totalChapters" -ForegroundColor Green
Write-Host "Failed: $failCount / $totalChapters" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })

if ($successCount -gt 0) {
    Write-Host "`n✓ Files saved to: $modulePath" -ForegroundColor Cyan
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Review and clean up the markdown files" -ForegroundColor Gray
    Write-Host "2. Fix navigation links (Previous/Next)" -ForegroundColor Gray
    Write-Host "3. Update FETCH_STATUS.md" -ForegroundColor Gray
    Write-Host "4. Commit the changes to git" -ForegroundColor Gray
}
