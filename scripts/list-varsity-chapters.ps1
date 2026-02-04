# Zerodha Varsity Content Fetcher using fetch_webpage tool
# This script uses the AI fetch_webpage capability for better content extraction

# USAGE: Run this script chapter by chapter with 60+ second delays

Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Zerodha Varsity Content Fetcher (Smart Mode)       ║" -ForegroundColor Green
Write-Host "║  Uses AI-powered content extraction                  ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`nThis script creates placeholder files." -ForegroundColor Yellow
Write-Host "Use the fetch_webpage tool through AI for better content extraction." -ForegroundColor Yellow
Write-Host "`nManual Steps:" -ForegroundColor Cyan
Write-Host "1. Ask AI to fetch content using fetch_webpage tool" -ForegroundColor Gray
Write-Host "2. AI will extract clean markdown" -ForegroundColor Gray
Write-Host "3. Save the content to appropriate chapter files" -ForegroundColor Gray

$chapters = @(
    @{num=1; url="https://zerodha.com/varsity/chapter/background-forwards-market/"; title="Background – Forwards Market"},
    @{num=2; url="https://zerodha.com/varsity/chapter/introducing-futures-contract/"; title="Introducing Futures Contract"},
    @{num=3; url="https://zerodha.com/varsity/chapter/futures-trade/"; title="The Futures Trade"},
    @{num=4; url="https://zerodha.com/varsity/chapter/leverage-payoff/"; title="Leverage & Payoff"},
    @{num=5; url="https://zerodha.com/varsity/chapter/margin-m2m/"; title="Margin & M2M"},
    @{num=6; url="https://zerodha.com/varsity/chapter/margin-calculator-part-1/"; title="Margin Calculator (Part 1)"},
    @{num=7; url="https://zerodha.com/varsity/chapter/margin-calculator-part-2/"; title="Margin Calculator (Part 2)"},
    @{num=8; url="https://zerodha.com/varsity/chapter/shorting/"; title="All about Shorting"},
    @{num=9; url="https://zerodha.com/varsity/chapter/nifty-futures/"; title="The Nifty Futures"},
    @{num=10; url="https://zerodha.com/varsity/chapter/futures-pricing/"; title="The Futures Pricing"},
    @{num=11; url="https://zerodha.com/varsity/chapter/hedging-futures/"; title="Hedging with Futures"},
    @{num=12; url="https://zerodha.com/varsity/chapter/open-interest/"; title="Open Interest"},
    @{num=13; url="https://zerodha.com/varsity/chapter/quick-note-on-physical-settlement/"; title="Quick Note on Physical Settlement"}
)

Write-Host "`n📋 Chapter List:" -ForegroundColor Cyan
foreach ($chapter in $chapters) {
    Write-Host "  $($chapter.num.ToString('00')). $($chapter.title)" -ForegroundColor Gray
    Write-Host "      $($chapter.url)" -ForegroundColor DarkGray
}

Write-Host "`n✅ Next Steps:" -ForegroundColor Yellow
Write-Host "1. Use AI with: fetch_webpage for each chapter URL" -ForegroundColor Gray
Write-Host "2. AI will extract clean content automatically" -ForegroundColor Gray
Write-Host "3. Save to: docs/trading-knowledge/04-futures-trading/XX-slug.md" -ForegroundColor Gray
