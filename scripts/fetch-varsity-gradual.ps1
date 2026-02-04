# Gradual Zerodha Varsity Content Fetcher
# Respects rate limits by adding delays between requests

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("04", "05", "06", "02", "03", "09", "all")]
    [string]$Module = "04",
    
    [Parameter(Mandatory=$false)]
    [int]$BatchSize = 5,
    
    [Parameter(Mandatory=$false)]
    [int]$DelaySeconds = 15
)

# Module configurations
$modules = @{
    "04" = @{
        name = "04-futures-trading"
        chapters = @(
            @{num=1; url="https://zerodha.com/varsity/chapter/background-forwards-market/"; slug="background-forwards-market"},
            @{num=2; url="https://zerodha.com/varsity/chapter/introducing-futures-contract/"; slug="introducing-futures-contract"},
            @{num=3; url="https://zerodha.com/varsity/chapter/the-futures-trade/"; slug="the-futures-trade"},
            @{num=4; url="https://zerodha.com/varsity/chapter/leverage-payoff/"; slug="leverage-payoff"},
            @{num=5; url="https://zerodha.com/varsity/chapter/the-long-short-position/"; slug="the-long-short-position"},
            @{num=6; url="https://zerodha.com/varsity/chapter/the-futures-pricing/"; slug="the-futures-pricing"},
            @{num=7; url="https://zerodha.com/varsity/chapter/the-settlement-process-part-1/"; slug="the-settlement-process-part-1"},
            @{num=8; url="https://zerodha.com/varsity/chapter/the-settlement-process-part-2/"; slug="the-settlement-process-part-2"},
            @{num=9; url="https://zerodha.com/varsity/chapter/open-interest/"; slug="open-interest"},
            @{num=10; url="https://zerodha.com/varsity/chapter/volumes/"; slug="volumes"},
            @{num=11; url="https://zerodha.com/varsity/chapter/the-government-securities/"; slug="the-government-securities"},
            @{num=12; url="https://zerodha.com/varsity/chapter/trading-futures-on-a-stock-exchange/"; slug="trading-futures-on-a-stock-exchange"},
            @{num=13; url="https://zerodha.com/varsity/chapter/practical-insights-into-futures-trading/"; slug="practical-insights-into-futures-trading"}
        )
    }
    "05" = @{
        name = "05-options-theory"
        chapters = @(
            @{num=1; url="https://zerodha.com/varsity/chapter/history-of-options/"; slug="history-of-options"},
            @{num=2; url="https://zerodha.com/varsity/chapter/options-nomenclature/"; slug="options-nomenclature"},
            @{num=3; url="https://zerodha.com/varsity/chapter/call-option-buying/"; slug="call-option-buying"},
            @{num=4; url="https://zerodha.com/varsity/chapter/call-option-selling/"; slug="call-option-selling"},
            @{num=5; url="https://zerodha.com/varsity/chapter/put-option-buying/"; slug="put-option-buying"},
            @{num=6; url="https://zerodha.com/varsity/chapter/put-option-selling/"; slug="put-option-selling"},
            @{num=7; url="https://zerodha.com/varsity/chapter/quantifying-the-qualitativeness/"; slug="quantifying-the-qualitativeness"},
            @{num=8; url="https://zerodha.com/varsity/chapter/the-option-greeks-delta/"; slug="the-option-greeks-delta"},
            @{num=9; url="https://zerodha.com/varsity/chapter/the-option-greeks-gamma/"; slug="the-option-greeks-gamma"},
            @{num=10; url="https://zerodha.com/varsity/chapter/the-option-greeks-theta/"; slug="the-option-greeks-theta"},
            @{num=11; url="https://zerodha.com/varsity/chapter/the-option-greeks-vega/"; slug="the-option-greeks-vega"},
            @{num=12; url="https://zerodha.com/varsity/chapter/moneyness-of-an-option-contract/"; slug="moneyness-of-an-option-contract"},
            @{num=13; url="https://zerodha.com/varsity/chapter/the-option-chain/"; slug="the-option-chain"},
            @{num=14; url="https://zerodha.com/varsity/chapter/put-call-parity-arbitrage/"; slug="put-call-parity-arbitrage"},
            @{num=15; url="https://zerodha.com/varsity/chapter/european-call-black-scholes/"; slug="european-call-black-scholes"},
            @{num=16; url="https://zerodha.com/varsity/chapter/bs-formula-asset-perspective/"; slug="bs-formula-asset-perspective"},
            @{num=17; url="https://zerodha.com/varsity/chapter/the-volatility-smile/"; slug="the-volatility-smile"},
            @{num=18; url="https://zerodha.com/varsity/chapter/the-volatility-smile-part-2/"; slug="the-volatility-smile-part-2"},
            @{num=19; url="https://zerodha.com/varsity/chapter/the-greeks-impact-of-volatility-and-time/"; slug="the-greeks-impact-of-volatility-and-time"},
            @{num=20; url="https://zerodha.com/varsity/chapter/vega/"; slug="vega"},
            @{num=21; url="https://zerodha.com/varsity/chapter/greek-calculator-part-1/"; slug="greek-calculator-part-1"},
            @{num=22; url="https://zerodha.com/varsity/chapter/greek-calculator-part-2/"; slug="greek-calculator-part-2"},
            @{num=23; url="https://zerodha.com/varsity/chapter/greek-calculator-part-3/"; slug="greek-calculator-part-3"},
            @{num=24; url="https://zerodha.com/varsity/chapter/practical-insights-into-option-trading/"; slug="practical-insights-into-option-trading"},
            @{num=25; url="https://zerodha.com/varsity/chapter/options-trading-strategies/"; slug="options-trading-strategies"}
        )
    }
    "06" = @{
        name = "06-option-strategies"
        chapters = @(
            @{num=1; url="https://zerodha.com/varsity/chapter/orientation-note/"; slug="orientation-note"},
            @{num=2; url="https://zerodha.com/varsity/chapter/bull-call-spread/"; slug="bull-call-spread"},
            @{num=3; url="https://zerodha.com/varsity/chapter/bull-put-spread/"; slug="bull-put-spread"},
            @{num=4; url="https://zerodha.com/varsity/chapter/call-ratio-back-spread/"; slug="call-ratio-back-spread"},
            @{num=5; url="https://zerodha.com/varsity/chapter/bear-call-ladder/"; slug="bear-call-ladder"},
            @{num=6; url="https://zerodha.com/varsity/chapter/bear-put-spread/"; slug="bear-put-spread"},
            @{num=7; url="https://zerodha.com/varsity/chapter/bear-call-spread/"; slug="bear-call-spread"},
            @{num=8; url="https://zerodha.com/varsity/chapter/put-ratio-back-spread/"; slug="put-ratio-back-spread"},
            @{num=9; url="https://zerodha.com/varsity/chapter/the-long-short-straddle/"; slug="the-long-short-straddle"},
            @{num=10; url="https://zerodha.com/varsity/chapter/the-long-short-strangle/"; slug="the-long-short-strangle"},
            @{num=11; url="https://zerodha.com/varsity/chapter/max-pain-pcr-ratio/"; slug="max-pain-pcr-ratio"},
            @{num=12; url="https://zerodha.com/varsity/chapter/the-iron-condor/"; slug="the-iron-condor"},
            @{num=13; url="https://zerodha.com/varsity/chapter/box-spread/"; slug="box-spread"},
            @{num=14; url="https://zerodha.com/varsity/chapter/box-spread-part-2/"; slug="box-spread-part-2"}
        )
    }
}

function Fetch-Chapter {
    param(
        [string]$Url,
        [string]$OutputPath,
        [int]$ChapterNum,
        [string]$ChapterName
    )
    
    Write-Host "`n[$ChapterNum] Fetching: $ChapterName" -ForegroundColor Cyan
    Write-Host "    URL: $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30
        
        if ($response.StatusCode -eq 200) {
            # Save raw HTML
            $htmlPath = $OutputPath.Replace('.md', '.html')
            $response.Content | Out-File -FilePath $htmlPath -Encoding UTF8
            
            # Extract main content (basic extraction - can be enhanced)
            $content = $response.Content
            
            # Remove script tags
            $content = $content -replace '<script[^>]*>.*?</script>', ''
            
            # Remove style tags
            $content = $content -replace '<style[^>]*>.*?</style>', ''
            
            # Save for manual processing
            Write-Host "    ✓ Saved HTML to: $htmlPath" -ForegroundColor Green
            Write-Host "    ⚠ Manual conversion to markdown required" -ForegroundColor Yellow
            
            return $true
        }
        else {
            Write-Host "    ✗ HTTP Status: $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        if ($_.Exception.Message -like "*429*") {
            Write-Host "    ✗ Rate Limited (429) - Please wait longer between batches" -ForegroundColor Red
        }
        elseif ($_.Exception.Message -like "*404*") {
            Write-Host "    ✗ Not Found (404) - Chapter may be unavailable" -ForegroundColor Red
        }
        else {
            Write-Host "    ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        return $false
    }
}

# Main execution
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Zerodha Varsity Gradual Content Fetcher            ║" -ForegroundColor Green
Write-Host "║  Module: $Module | Batch: $BatchSize chapters | Delay: $DelaySeconds sec  ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green

if ($Module -eq "all") {
    Write-Host "`n⚠ WARNING: Fetching all modules will take many hours!" -ForegroundColor Yellow
    Write-Host "It's recommended to fetch one module at a time.`n" -ForegroundColor Yellow
    
    $confirm = Read-Host "Continue? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit
    }
}

$moduleConfig = $modules[$Module]
$basePath = "c:\Code\investment-trading-portfolio\docs\trading-knowledge"
$modulePath = Join-Path $basePath $moduleConfig.name

# Ensure module folder exists
if (!(Test-Path $modulePath)) {
    New-Item -ItemType Directory -Path $modulePath -Force | Out-Null
}

# Fetch chapters in batches
$chapters = $moduleConfig.chapters
$totalChapters = $chapters.Count
$successCount = 0
$failCount = 0
$batchCount = 0

for ($i = 0; $i -lt $totalChapters; $i += $BatchSize) {
    $batchCount++
    $batchChapters = $chapters[$i..[Math]::Min($i + $BatchSize - 1, $totalChapters - 1)]
    
    Write-Host "`n╭─────────────────────────────────────────────╮" -ForegroundColor Magenta
    Write-Host "│  Batch $batchCount - Chapters $($i+1)-$([Math]::Min($i + $BatchSize, $totalChapters)) of $totalChapters  │" -ForegroundColor Magenta
    Write-Host "╰─────────────────────────────────────────────╯" -ForegroundColor Magenta
    
    foreach ($chapter in $batchChapters) {
        $chapterNum = $chapter.num.ToString("00")
        $outputPath = Join-Path $modulePath "$chapterNum-$($chapter.slug).md"
        
        $success = Fetch-Chapter -Url $chapter.url -OutputPath $outputPath -ChapterNum $chapterNum -ChapterName $chapter.slug
        
        if ($success) {
            $successCount++
        }
        else {
            $failCount++
        }
        
        # Small delay between chapters in same batch
        if ($chapter -ne $batchChapters[-1]) {
            Write-Host "    Waiting 2 seconds..." -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    
    # Larger delay between batches
    if ($i + $BatchSize -lt $totalChapters) {
        Write-Host "`n⏳ Batch complete! Waiting $DelaySeconds seconds before next batch..." -ForegroundColor Yellow
        Write-Host "   (This respects Zerodha's rate limits)" -ForegroundColor Gray
        Start-Sleep -Seconds $DelaySeconds
    }
}

# Summary
Write-Host "`n╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Fetching Complete!                                  ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host "`nModule: $($moduleConfig.name)" -ForegroundColor Cyan
Write-Host "Total Chapters: $totalChapters" -ForegroundColor Cyan
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Convert HTML files to Markdown (use MarkDownload or manual editing)" -ForegroundColor Gray
Write-Host "2. Extract images and update URLs to preserve https:// links" -ForegroundColor Gray
Write-Host "3. Add navigation links (Previous/Next chapters)" -ForegroundColor Gray
Write-Host "4. Update module README with completion status" -ForegroundColor Gray

# Open the module folder
Write-Host "`nOpening module folder..." -ForegroundColor Cyan
Start-Process explorer $modulePath
