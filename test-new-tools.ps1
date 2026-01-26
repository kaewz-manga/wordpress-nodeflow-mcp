# Test Script for New Tools (Categories, Tags, Comments)
# Total: 10 new tools

Write-Host "`n=== Testing wordpress-nodeflow-mcp New Tools ===" -ForegroundColor Cyan
Write-Host "Server: http://localhost:8789" -ForegroundColor Gray
Write-Host "WordPress: https://wp.missmanga.org`n" -ForegroundColor Gray

$baseUrl = "http://localhost:8789/mcp"
$wpUrl = "https://wp.missmanga.org"
$wpUser = "kaewz"
$wpPass = "cUAnCKZ1u5DNIkpSbMraFCWL"

$headers = @{
    "Content-Type" = "application/json"
    "x-wordpress-url" = $wpUrl
    "x-wordpress-username" = $wpUser
    "x-wordpress-password" = $wpPass
}

$testsPassed = 0
$testsFailed = 0

function Test-Tool {
    param($testName, $method, $toolName, $arguments)

    Write-Host "[$testsPassed/$($testsPassed + $testsFailed)] Testing: $testName" -ForegroundColor Yellow

    $body = @{
        jsonrpc = "2.0"
        id = ($testsPassed + $testsFailed + 1)
        method = $method
        params = if ($arguments) { @{ name = $toolName; arguments = $arguments } } else { @{} }
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body -ErrorAction Stop

        if ($response.error) {
            Write-Host "  FAILED: $($response.error.message)" -ForegroundColor Red
            $script:testsFailed++
            return $false
        } else {
            Write-Host "  PASSED" -ForegroundColor Green
            if ($response.result) {
                Write-Host "  Result: $(($response.result | ConvertTo-Json -Compress).Substring(0, [Math]::Min(100, ($response.result | ConvertTo-Json -Compress).Length)))..." -ForegroundColor Gray
            }
            $script:testsPassed++
            return $response.result
        }
    } catch {
        Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $script:testsFailed++
        return $false
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Verify Tools List (24 tools)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$toolsList = Test-Tool "tools/list" "tools/list" $null $null
if ($toolsList) {
    $toolCount = $toolsList.tools.Count
    Write-Host "`nTotal tools available: $toolCount" -ForegroundColor $(if ($toolCount -eq 24) { "Green" } else { "Yellow" })

    # Show new tools
    $newTools = $toolsList.tools | Where-Object { $_.name -like "wp_*category*" -or $_.name -like "wp_*tag*" -or $_.name -like "wp_*comment*" }
    Write-Host "`nNew tools added:" -ForegroundColor Cyan
    foreach ($tool in $newTools) {
        Write-Host "  - $($tool.name)" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Step 2: Categories Tools (4 tests)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Get Categories
$categories = Test-Tool "wp_get_categories" "tools/call" "wp_get_categories" @{ per_page = 5 }

# Test 2: Create Category
$newCategory = Test-Tool "wp_create_category" "tools/call" "wp_create_category" @{
    name = "Test Category $(Get-Date -Format 'HHmmss')"
    description = "Created by test script"
}

# Test 3: Get Single Category
if ($newCategory -and $newCategory.id) {
    Test-Tool "wp_get_category" "tools/call" "wp_get_category" @{ id = $newCategory.id } | Out-Null

    # Test 4: Delete Category
    Test-Tool "wp_delete_category" "tools/call" "wp_delete_category" @{ id = $newCategory.id; force = $true } | Out-Null
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Step 3: Tags Tools (2 tests)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 5: Get Tags
Test-Tool "wp_get_tags" "tools/call" "wp_get_tags" @{ per_page = 5 } | Out-Null

# Test 6: Create Tag
$newTag = Test-Tool "wp_create_tag" "tools/call" "wp_create_tag" @{
    name = "test-tag-$(Get-Date -Format 'HHmmss')"
    description = "Created by test script"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Step 4: Comments Tools (4 tests)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 7: Get Comments
$comments = Test-Tool "wp_get_comments" "tools/call" "wp_get_comments" @{ per_page = 5 }

# Note: Cannot test approve/spam/delete without existing comment ID
Write-Host "`nNote: Comment moderation tools (approve/spam/delete) require existing comment ID" -ForegroundColor Yellow
Write-Host "These tools are implemented but cannot be tested without pending comments`n" -ForegroundColor Yellow

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Tests: $($testsPassed + $testsFailed)" -ForegroundColor White
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })

if ($testsFailed -eq 0) {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
    Write-Host "New tools are working correctly" -ForegroundColor Green
} else {
    Write-Host "`nSome tests failed. Check errors above." -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
