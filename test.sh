#!/bin/bash

echo "🧪 Testing Claude Desktop → Bedrock Proxy..."
echo ""

# Check if jq is available for pretty JSON
if command -v jq &> /dev/null; then
    JSON_FORMATTER="jq ."
else
    JSON_FORMATTER="cat"
fi

# Test 1: Health Check
echo "1. 🏥 Health Check:"
HEALTH_RESPONSE=$(curl -s http://localhost:7847/health 2>/dev/null)
if [ $? -eq 0 ] && echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "$HEALTH_RESPONSE" | $JSON_FORMATTER
    echo "   ✅ Proxy is healthy"
else
    echo "   ❌ Proxy health check failed. Is it running?"
    echo "   💡 Try: ./start.sh start"
    exit 1
fi

echo ""
echo "2. 🤖 API Test (Direct call to proxy):"

# Test 2: Simple API call
API_RESPONSE=$(curl -s -X POST http://localhost:7847/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 50,
    "messages": [
      {
        "role": "user",
        "content": "Respond with exactly: PROXY_TEST_SUCCESS"
      }
    ]
  }' 2>/dev/null)

if [ $? -eq 0 ] && echo "$API_RESPONSE" | grep -q "PROXY_TEST_SUCCESS"; then
    echo "$API_RESPONSE" | $JSON_FORMATTER
    echo ""
    echo "   ✅ API test successful! Proxy is working correctly."
else
    echo "   ❌ API test failed."
    echo "   Response: $API_RESPONSE"
    echo ""
    echo "   🔍 Debug steps:"
    echo "   1. Check proxy status: ./start.sh status"
    echo "   2. Check proxy logs: ./start.sh logs"
    echo "   3. Verify AWS credentials: aws sts get-caller-identity --profile ai-agent"
fi

echo ""
echo "📋 Next steps:"
echo "1. Configure Claude Desktop:"
echo "   - Base URL: http://localhost:7847"
echo "   - API Key: team-proxy"
echo "2. Test in Claude Desktop: 'Hello! Are you working through the proxy?'"
echo "3. Monitor activity: ./start.sh logs"