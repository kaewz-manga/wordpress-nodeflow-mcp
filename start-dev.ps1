# Quick Start Script for wordpress-nodeflow-mcp
# This script starts the Wrangler dev server

Write-Host "🚀 Starting wordpress-nodeflow-mcp Dev Server" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if .dev.vars exists
if (-not (Test-Path ".dev.vars")) {
    Write-Host "⚠️  Warning: .dev.vars not found" -ForegroundColor Yellow
    Write-Host "   Creating .dev.vars from example..." -ForegroundColor Yellow
    Copy-Item ".dev.vars.example" ".dev.vars"
    Write-Host "   ✅ Created .dev.vars" -ForegroundColor Green
    Write-Host ""
    Write-Host "   📝 Please edit .dev.vars and configure your WordPress credentials" -ForegroundColor Yellow
    Write-Host "   Then run this script again" -ForegroundColor Yellow
    Write-Host ""
    exit
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
    Write-Host ""
}

Write-Host "🔧 Configuration Check:" -ForegroundColor Cyan
$devVars = Get-Content ".dev.vars" | Where-Object { $_ -match "^WORDPRESS_" }
foreach ($line in $devVars) {
    if ($line -match "WORDPRESS_APP_PASSWORD=(.+)") {
        $password = $matches[1]
        if ($password -match "\s") {
            Write-Host "   ⚠️  WARNING: Application Password contains spaces!" -ForegroundColor Red
            Write-Host "   Please remove all spaces from WORDPRESS_APP_PASSWORD" -ForegroundColor Red
            Write-Host ""
        } else {
            Write-Host "   ✅ Application Password format OK (no spaces)" -ForegroundColor Green
        }
    }
}
Write-Host ""

Write-Host "🌐 Server will start on: http://localhost:8787" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Endpoints:" -ForegroundColor Cyan
Write-Host "   GET  /" -ForegroundColor Gray
Write-Host "   GET  /health" -ForegroundColor Gray
Write-Host "   POST /mcp" -ForegroundColor Gray
Write-Host ""
Write-Host "🧪 To test the server, run: .\test-local.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Start the dev server
npm run dev
