#!/bin/bash

echo "🚀 Setting up Claude Desktop → Bedrock Proxy for team..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    echo "   Visit: https://nodejs.org/ or use: brew install node"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Make scripts executable
chmod +x start.sh test.sh

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start the proxy: ./start.sh start"
echo "2. Configure Claude Desktop: http://localhost:7847"
echo "3. Test it works: ./test.sh"
echo ""
echo "🔧 Configure Claude Desktop:"
echo "   - Settings → API Configuration"
echo "   - Base URL: http://localhost:7847"
echo "   - API Key: team-proxy (any value works)"