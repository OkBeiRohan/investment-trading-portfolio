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
    @{num=3; url="https://zerodha.com/varsity/chapter/the-futures-trade/"; slug="the-futures-trade"; title="The Futures Trade"},
    @{num=4; url="https://zerodha.com/varsity/chapter/leverage-payoff/"; slug="leverage-payoff"; title="Leverage & Payoff"},
    @{num=5; url="https://zerodha.com/varsity/chapter/the-long-short-position/"; slug="the-long-short-position"; title="Margin & M2M"},
    @{num=6; url="https://zerodha.com/varsity/chapter/the-futures-pricing/"; slug="the-futures-pricing"; title="Margin Calculator (Part 1)"},
    @{num=7; url="https://zerodha.com/varsity/chapter/the-settlement-process-part-1/"; slug="the-settlement-process-part-1"; title="Margin Calculator (Part 2)"}
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
    
    # Extract main content from the article
    if ($Html -match '<div class="entry-content">(.*?)<div class="su-spoiler') {
        $content = $matches[1]
    }
    elseif ($Html -match '<div class="entry-content">(.*?)</div>\s*</article>') {
        $content = $matches[1]
    }
    else {
        Write-Host "    ⚠ Could not extract main content area" -ForegroundColor Yellow
        $content = $Html
    }
    
    # Clean up the content
    $content = $content -replace '<script[^>]*>.*?</script>', ''
    $content = $content -replace '<style[^>]*>.*?</style>', ''
    $content = $content -replace '<noscript[^>]*>.*?</noscript>', ''
    $content = $content -replace '<!--.*?-->', ''
    
    # Convert headers
    $content = $content -replace '<h2[^>]*>(.*?)</h2>', "`n## `$1`n"
    $content = $content -replace '<h3[^>]*>(.*?)</h3>', "`n### `$1`n"
    $content = $content -replace '<h4[^>]*>(.*?)</h4>', "`n#### `$1`n"
    
    # Convert lists
    $content = $content -replace '<ul[^>]*>', "`n"
    $content = $content -replace '</ul>', "`n"
    $content = $content -replace '<ol[^>]*>', "`n"
    $content = $content -replace '</ol>', "`n"
    $content = $content -replace '<li[^>]*>(.*?)</li>', "- `$1`n"
    
    # Convert paragraphs
    $content = $content -replace '<p[^>]*>(.*?)</p>', "`n`$1`n"
    
    # Convert bold and italic
    $content = $content -replace '<strong[^>]*>(.*?)</strong>', "**`$1**"
    $content = $content -replace '<b[^>]*>(.*?)</b>', "**`$1**"
    $content = $content -replace '<em[^>]*>(.*?)</em>', "*`$1*"
    $content = $content -replace '<i[^>]*>(.*?)</i>', "*`$1*"
    
    # Convert images - preserve absolute URLs
    $content = $content -replace '<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>', "`n![`$2](`$1)`n"
    $content = $content -replace '<img[^>]*src="([^"]*)"[^>]*>', "`n![Image](`$1)`n"
    
    # Convert links
    $content = $content -replace '<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', "[`$2](`$1)"
    
    # Convert tables (basic)
    $content = $content -replace '<table[^>]*>', "`n"
    $content = $content -replace '</table>', "`n"
    $content = $content -replace '<tr[^>]*>', ""
    $content = $content -replace '</tr>', "`n"
    $content = $content -replace '<td[^>]*>(.*?)</td>', "| `$1 "
    $content = $content -replace '<th[^>]*>(.*?)</th>', "| **`$1** "
    
    # Remove remaining HTML tags
    $content = $content -replace '<[^>]+>', ''
    
    # Decode HTML entities
    $content = $content -replace '&nbsp;', ' '
    $content = $content -replace '&amp;', '&'
    $content = $content -replace '&lt;', '<'
    $content = $content -replace '&gt;', '>'
    $content = $content -replace '&quot;', '"'
    $content = $content -replace '&#8217;', "'"
    $content = $content -replace '&#8220;', '"'
    $content = $content -replace '&#8221;', '"'
    $content = $content -replace '&#8211;', '-'
    $content = $content -replace '&#8212;', '--'
    
    # Clean up excessive whitespace
    $content = $content -replace '\n\s*\n\s*\n', "`n`n"
    $content = $content.Trim()
    
    # Build final markdown
    $markdown = @"
# $ChapterTitle

> **Module:** $ModuleNumber`: $ModuleTitle  
> **Chapter:** $ChapterNumber  
> **Reading Time:** ~15 minutes  
> **Source:** [Zerodha Varsity]($ChapterUrl)  
> **Last Updated:** February 4, 2026

---

$content

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
