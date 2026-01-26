# Test Script for wordpress-nodeflow-mcp Local Server
# Run this script to test all endpoints

Write-Host "🧪 Testing wordpress-nodeflow-mcp Local Server" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8787"

# Test 1: Root endpoint
Write-Host "1️⃣  Testing Root Endpoint (GET /)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/" -Method Get
    Write-Host "✅ Root endpoint working" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json) -ForegroundColor Gray
} catch {
    Write-Host "❌ Root endpoint failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Health check
Write-Host "2️⃣  Testing Health Endpoint (GET /health)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Health check passed" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json) -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: MCP Initialize
Write-Host "3️⃣  Testing MCP Initialize" -ForegroundColor Yellow
$initBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "initialize"
    params = @{
        protocolVersion = "2024-11-05"
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/mcp" -Method Post `
        -ContentType "application/json" -Body $initBody
    Write-Host "✅ MCP initialize successful" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor Gray
} catch {
    Write-Host "❌ MCP initialize failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: List Tools
Write-Host "4️⃣  Testing MCP Tools List" -ForegroundColor Yellow
$toolsBody = @{
    jsonrpc = "2.0"
    id = 2
    method = "tools/list"
    params = @{}
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/mcp" -Method Post `
        -ContentType "application/json" -Body $toolsBody
    Write-Host "✅ Tools list retrieved" -ForegroundColor Green
    Write-Host "   Found $($response.result.tools.Count) tools" -ForegroundColor Gray
    foreach ($tool in $response.result.tools) {
        Write-Host "   - $($tool.name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Tools list failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 5: Get Posts (requires WordPress credentials)
Write-Host "5️⃣  Testing WordPress Integration (wp_get_posts)" -ForegroundColor Yellow
$getPostsBody = @{
    jsonrpc = "2.0"
    id = 3
    method = "tools/call"
    params = @{
        name = "wp_get_posts"
        arguments = @{
            per_page = 3
        }
    }
} | ConvertTo-Json -Depth 5

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/mcp" -Method Post `
        -ContentType "application/json" -Body $getPostsBody
    Write-Host "✅ WordPress API working" -ForegroundColor Green
    $content = ($response.result.content[0].text | ConvertFrom-Json)
    Write-Host "   Found $($content.count) posts" -ForegroundColor Gray
} catch {
    Write-Host "❌ WordPress API failed: $_" -ForegroundColor Red
    Write-Host "   (This is expected if WordPress credentials are not configured)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ Testing Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Configure WordPress credentials in .dev.vars" -ForegroundColor Gray
Write-Host "   2. Run npm run dev to start the server" -ForegroundColor Gray
Write-Host "   3. Run this script again to test WordPress integration" -ForegroundColor Gray
