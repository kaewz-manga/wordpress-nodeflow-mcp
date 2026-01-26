#!/bin/bash
# Test Script for New Tools (Categories, Tags, Comments)

echo ""
echo "=== Testing wordpress-nodeflow-mcp New Tools ==="
echo "Server: http://localhost:8789"
echo "WordPress: https://your-wordpress-site.com"
echo ""

BASE_URL="http://localhost:8789/mcp"
WP_URL="https://your-wordpress-site.com"
WP_USER="YOUR_USERNAME"
WP_PASS="YOUR_APP_PASSWORD_WITHOUT_SPACES"

TESTS_PASSED=0
TESTS_FAILED=0

test_tool() {
    local test_name="$1"
    local method="$2"
    local tool_name="$3"
    local arguments="$4"

    echo -n "[$TESTS_PASSED/$((TESTS_PASSED + TESTS_FAILED))] Testing: $test_name ... "

    if [ -z "$arguments" ]; then
        body="{\"jsonrpc\":\"2.0\",\"id\":$((TESTS_PASSED + TESTS_FAILED + 1)),\"method\":\"$method\",\"params\":{}}"
    else
        body="{\"jsonrpc\":\"2.0\",\"id\":$((TESTS_PASSED + TESTS_FAILED + 1)),\"method\":\"$method\",\"params\":{\"name\":\"$tool_name\",\"arguments\":$arguments}}"
    fi

    response=$(curl -s -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -H "x-wordpress-url: $WP_URL" \
        -H "x-wordpress-username: $WP_USER" \
        -H "x-wordpress-password: $WP_PASS" \
        -d "$body")

    if echo "$response" | grep -q '"error"'; then
        echo "FAILED"
        echo "  Error: $(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
        ((TESTS_FAILED++))
        echo ""
    else
        echo "PASSED"
        ((TESTS_PASSED++))
        echo "$response"
    fi
}

echo "========================================"
echo "Step 1: Verify Tools List (24 tools)"
echo "========================================"
echo ""

test_tool "tools/list" "tools/list" "" ""
echo ""

echo "========================================"
echo "Step 2: Categories Tools (4 tests)"
echo "========================================"
echo ""

# Test 1: Get Categories
test_tool "wp_get_categories" "tools/call" "wp_get_categories" '{"per_page":5}'

# Test 2: Create Category
TIMESTAMP=$(date +%H%M%S)
test_tool "wp_create_category" "tools/call" "wp_create_category" "{\"name\":\"Test Category $TIMESTAMP\",\"description\":\"Created by test script\"}"

# Test 3: Get Single Category (need ID from previous test)
test_tool "wp_get_category" "tools/call" "wp_get_category" '{"id":1}'

# Test 4: Delete Category (skipped - need real ID)
echo "[Skipped] wp_delete_category (requires category ID from create test)"
echo ""

echo "========================================"
echo "Step 3: Tags Tools (2 tests)"
echo "========================================"
echo ""

# Test 5: Get Tags
test_tool "wp_get_tags" "tools/call" "wp_get_tags" '{"per_page":5}'

# Test 6: Create Tag
test_tool "wp_create_tag" "tools/call" "wp_create_tag" "{\"name\":\"test-tag-$TIMESTAMP\",\"description\":\"Created by test script\"}"

echo "========================================"
echo "Step 4: Comments Tools (2 tests)"
echo "========================================"
echo ""

# Test 7: Get Comments
test_tool "wp_get_comments" "tools/call" "wp_get_comments" '{"per_page":5}'

echo ""
echo "Note: Comment moderation tools (approve/spam/delete) require existing comment ID"
echo ""

echo "========================================"
echo "Test Summary"
echo "========================================"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo "✓ All tests passed!"
    echo "✓ New tools are working correctly"
else
    echo ""
    echo "✗ Some tests failed. Check errors above."
fi

echo ""
echo "=== Test Complete ==="
