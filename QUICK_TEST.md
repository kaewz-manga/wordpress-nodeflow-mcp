# Quick Test Commands

## Prerequisites
```bash
# Terminal 1: Start dev server
cd D:\Dev\playground\Claude_Code_Commander\wordpress-nodeflow-mcp
npm run dev
```

## Test Commands (run in Terminal 2)

### Test 1: Check Tools Count (should be 24)
```bash
curl -s -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | grep -o '"name"' | wc -l
```

### Test 2: List All Tool Names
```bash
curl -s -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | grep -o '"name":"[^"]*"' | cut -d'"' -f4
```

### Test 3: Get Categories
```bash
curl -s -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.missmanga.org" \
  -H "x-wordpress-username: kaewz" \
  -H "x-wordpress-password: cUAnCKZ1u5DNIkpSbMraFCWL" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"wp_get_categories","arguments":{"per_page":5}}}'
```

### Test 4: Create Category
```bash
curl -s -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.missmanga.org" \
  -H "x-wordpress-username: kaewz" \
  -H "x-wordpress-password: cUAnCKZ1u5DNIkpSbMraFCWL" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"wp_create_category","arguments":{"name":"Test Category Auto","description":"Created by automated test"}}}'
```

### Test 5: Get Tags
```bash
curl -s -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.missmanga.org" \
  -H "x-wordpress-username: kaewz" \
  -H "x-wordpress-password: cUAnCKZ1u5DNIkpSbMraFCWL" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"wp_get_tags","arguments":{"per_page":5}}}'
```

### Test 6: Create Tag
```bash
curl -s -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.missmanga.org" \
  -H "x-wordpress-username: kaewz" \
  -H "x-wordpress-password: cUAnCKZ1u5DNIkpSbMraFCWL" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"wp_create_tag","arguments":{"name":"test-tag-auto","description":"Created by automated test"}}}'
```

### Test 7: Get Comments
```bash
curl -s -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.missmanga.org" \
  -H "x-wordpress-username: kaewz" \
  -H "x-wordpress-password: cUAnCKZ1u5DNIkpSbMraFCWL" \
  -d '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"wp_get_comments","arguments":{"per_page":5}}}'
```

### Test 8: Get Single Category (ID=1 - Uncategorized)
```bash
curl -s -X POST http://localhost:8789/mcp \
  -H "Content-Type: application/json" \
  -H "x-wordpress-url: https://wp.missmanga.org" \
  -H "x-wordpress-username: kaewz" \
  -H "x-wordpress-password: cUAnCKZ1u5DNIkpSbMraFCWL" \
  -d '{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"wp_get_category","arguments":{"id":1}}}'
```

## PowerShell Versions

### Test 1: Check Tools Count
```powershell
(Invoke-RestMethod -Uri "http://localhost:8789/mcp" -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}').result.tools.Count
```

### Test 2: List Tool Names
```powershell
(Invoke-RestMethod -Uri "http://localhost:8789/mcp" -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}').result.tools.name
```

### Test 3: Get Categories
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "x-wordpress-url" = "https://wp.missmanga.org"
    "x-wordpress-username" = "kaewz"
    "x-wordpress-password" = "cUAnCKZ1u5DNIkpSbMraFCWL"
}

Invoke-RestMethod -Uri "http://localhost:8789/mcp" -Method Post -Headers $headers -Body '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"wp_get_categories","arguments":{"per_page":5}}}'
```

### Test 4: Create Category
```powershell
Invoke-RestMethod -Uri "http://localhost:8789/mcp" -Method Post -Headers $headers -Body '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"wp_create_category","arguments":{"name":"Test Category PS","description":"Created via PowerShell"}}}'
```

### Test 5: Get Tags
```powershell
Invoke-RestMethod -Uri "http://localhost:8789/mcp" -Method Post -Headers $headers -Body '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"wp_get_tags","arguments":{"per_page":5}}}'
```

### Test 6: Create Tag
```powershell
Invoke-RestMethod -Uri "http://localhost:8789/mcp" -Method Post -Headers $headers -Body '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"wp_create_tag","arguments":{"name":"test-tag-ps","description":"Created via PowerShell"}}}'
```

### Test 7: Get Comments
```powershell
Invoke-RestMethod -Uri "http://localhost:8789/mcp" -Method Post -Headers $headers -Body '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"wp_get_comments","arguments":{"per_page":5}}}'
```

## Expected Results

### Tools Count: `24`
- Posts: 5
- Pages: 4
- Media: 4
- Categories: 4 (NEW)
- Tags: 2 (NEW)
- Comments: 4 (NEW)
- Storage: 1

### New Tool Names:
- wp_get_categories
- wp_get_category
- wp_create_category
- wp_delete_category
- wp_get_tags
- wp_create_tag
- wp_get_comments
- wp_approve_comment
- wp_spam_comment
- wp_delete_comment
