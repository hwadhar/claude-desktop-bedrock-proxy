# Claude Desktop → AWS Bedrock Proxy

**Connect Claude Desktop to our AWS Bedrock setup** (same as Claude Code)

## Prerequisites (Check First!)

**Required Software:**
- ✅ **Node.js** (v18+): `node --version`
- ✅ **npm** (comes with Node.js): `npm --version`
- ✅ **AWS CLI**: `aws --version`
- ✅ **curl** (for testing): `curl --version`
- ✅ **git** (if cloning): `git --version`

**Optional but Recommended:**
- ✅ **jq** (pretty JSON): `brew install jq` or `apt install jq`

**Required Configuration:**
- ✅ **AWS Profile**: `ai-agent` profile configured
- ✅ **Okta CLI**: `~/.local/bin/okta-aws-cli-dev-product` exists and works
  - ⚠️ **Note**: Okta binary path may vary by installation. Check your actual path:
    ```bash
    which okta-aws-cli-dev-product
    # or find it with: find /usr -name "*okta-aws*" 2>/dev/null
    # Update start.sh if your path is different
    ```
- ✅ **Claude Desktop**: Installed and running

**⚠️ Pre-flight Check:**
```bash
# Verify you have everything:
node --version && npm --version && aws --version && curl --version
aws sts get-caller-identity --profile ai-agent  # Should work without errors
ls ~/.local/bin/okta-aws-cli-dev-product        # Should exist
```

## Quick Setup (5-10 minutes)

### 1. Install & Start
```bash
# Make scripts executable (if needed)
chmod +x setup.sh start.sh test.sh

# Run setup (installs dependencies)
./setup.sh

# Start proxy service (requires Okta browser auth)
./start.sh start
```

**🔐 Okta Authentication Note**: The start command will open your browser for Okta authentication. This is normal and required.

### 2. Configure Claude Desktop

**macOS**: Claude Desktop → Preferences (⌘,)
**Windows**: Settings menu (⚙️ icon)

**API Configuration:**
- **Custom API Endpoint**: `http://localhost:7847`
- **API Key**: `team-proxy` (any non-empty value works)

**📍 Can't find API settings?** Look for "Custom API", "API Configuration", or "Advanced Settings" in Claude Desktop preferences.

### 3. Test Everything Works
```bash
# Test proxy API directly
./test.sh

# Test in Claude Desktop
# Ask: "Hello! Are you working through the proxy?"
```

## Management Commands

```bash
./start.sh start      # Start proxy service
./start.sh status     # Check if running
./start.sh logs       # View activity logs
./start.sh stop       # Stop service
./start.sh restart    # Restart service
```

## How It Works

```
Claude Desktop → localhost:7847 → AWS Bedrock (us-west-2)
```

- **🔄 Dynamic Models**: Automatically fetches available models from Bedrock API at startup
- **📋 Smart Mapping**: Maps Claude model names to Bedrock inference profiles
- **🔐 Auth**: Uses your existing `ai-agent` AWS profile + Okta authentication
- **⚡ Streaming**: Full support for real-time responses
- **🛠 Tools**: Forwards tool use requests 1:1
- **🛡 Fallback**: Uses hardcoded mapping if API unavailable

## Supported Models

**🔄 Dynamic Model Support**: The proxy automatically fetches all available Anthropic models from Bedrock at startup and creates intelligent mappings.

**📋 Model Features**:
- ✅ **Auto-discovery**: Fetches latest models from Bedrock API
- ✅ **Smart aliases**: Creates common name variations (e.g., `sonnet-4` → actual model ID)
- ✅ **Deprecated filtering**: Automatically excludes legacy/deprecated models
- ✅ **Fallback support**: Uses hardcoded mapping if API unavailable

**🔍 Common Mappings** (dynamically resolved):
| Claude Desktop Request | Resolved To |
|----------------------|-------------|
| `claude-3-5-sonnet-20241022` | Latest 3.5 Sonnet model |
| `claude-sonnet-4-5-20250929` | Latest Sonnet 4 model |
| `sonnet-4` | Latest Sonnet 4 model |
| `claude-3-5-haiku-20241022` | Latest 3.5 Haiku model |
| *Any new model* | Automatically supported |

**💡 Tip**: Check startup logs to see all available model aliases: `./start.sh logs`

## Troubleshooting

### Common Issues & Solutions

#### 🔐 **"API Error: security token included is expired"**
**Most common issue** - AWS credentials expired:
```bash
# Refresh AWS credentials (opens browser)
~/.local/bin/okta-aws-cli-dev-product

# Restart proxy to pick up new credentials
./start.sh restart

# Verify credentials work
aws sts get-caller-identity --profile ai-agent
```

#### 🚫 **"The provided model identifier is invalid"**
Claude Desktop requested a model not in our mapping:
```bash
# Check proxy logs to see which model was requested
./start.sh logs

# Unknown models automatically fallback to claude-3-5-sonnet
# If you need a specific model added, edit claude-desktop-proxy.ts MODEL_MAP
```

#### 🔌 **"Port 7847 already in use"**
```bash
# Find what's using the port
lsof -i :7847

# Kill the process (replace PID with actual)
kill <PID>

# Or edit claude-desktop-proxy.ts to use different port
```

#### 📦 **"npm install failed" or "command not found"**
```bash
# Install Node.js first
brew install node  # macOS
# or visit https://nodejs.org

# Make sure you're in the right directory
cd /path/to/claude-desktop-bedrock-proxy

# Try setup again
./setup.sh
```

#### 🔧 **"Permission denied" when running scripts**
```bash
# Make scripts executable
chmod +x setup.sh start.sh test.sh

# Then try again
./setup.sh
```

#### 🌐 **"Could not connect to localhost:7847"**
```bash
# Check if proxy is actually running
./start.sh status

# If not running, start it
./start.sh start

# Check for errors in logs
./start.sh logs
```

#### 🔍 **Claude Desktop can't find API settings**
Different versions have different locations:
- Look for "Settings", "Preferences", or gear icon (⚙️)
- Search for "API", "Custom", or "Advanced" in settings
- Some versions: Settings → API Configuration
- Some versions: Preferences → Advanced → Custom API

#### ⚡ **Proxy starts but Claude Desktop gets errors**
```bash
# Test proxy directly first
./test.sh

# Check if you can reach health endpoint
curl http://localhost:7847/health

# Monitor logs while using Claude Desktop
./start.sh logs
```

#### 🔄 **"Authentication required" loop**
```bash
# Stop proxy completely
./start.sh stop

# Refresh Okta credentials manually
~/.local/bin/okta-aws-cli-dev-product

# Wait for browser auth to complete, then restart
./start.sh start
```

#### 📍 **"Okta binary not found" or different path**
```bash
# Find your Okta binary location
which okta-aws-cli-dev-product
find /usr -name "*okta-aws*" 2>/dev/null
find ~ -name "*okta-aws*" 2>/dev/null

# Update start.sh with correct path
# Edit start.sh and change ~/.local/bin/okta-aws-cli-dev-product to your actual path
```

### Debug Commands

```bash
# Health check
curl http://localhost:7847/health

# Test specific model
curl -X POST http://localhost:7847/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":50,"messages":[{"role":"user","content":"test"}]}'

# Check AWS credentials
aws sts get-caller-identity --profile ai-agent

# View live logs
./start.sh logs

# Check process status
./start.sh status
```

## Security Notes

**🔒 Local Only**:
- Proxy runs on `localhost` only - no external network access
- Port 7847 is only accessible from your machine
- No API keys are stored or transmitted to external services

**🔐 AWS Credentials**:
- Uses your existing AWS IAM permissions via `ai-agent` profile
- Okta provides time-limited credentials (expire automatically)
- No long-lived credentials stored by the proxy

**⚠️ Important**:
- Keep your `~/.local/bin/okta-aws-cli-dev-product` secure
- Don't share the proxy endpoint outside localhost
- Regularly refresh Okta credentials (automated in scripts)

## Files & Structure

```
claude-desktop-bedrock-proxy/
├── setup.sh                 # One-time installation script
├── start.sh                 # Service management (start/stop/status/logs)
├── test.sh                  # API testing and verification
├── claude-desktop-proxy.ts  # Main proxy service (TypeScript)
├── package.json             # Node.js dependencies
├── .gitignore              # Git ignore patterns
├── README.md               # This file
└── TEAM_SETUP.md          # Quick setup guide
```

**Runtime Files** (created automatically):
- `proxy.log` - Service logs
- `proxy.pid` - Process ID file
- `node_modules/` - Dependencies

## Technical Details

**Architecture**:
```
Claude Desktop → HTTP → localhost:7847 → AWS SDK → Bedrock API
                              ↑
                         Proxy Service
                    (Anthropic ↔ Bedrock translation)
```

**Key Features**:
- ✅ Full `/v1/messages` API compatibility
- ✅ Server-Sent Events streaming
- ✅ **Dynamic model discovery** via Bedrock ListFoundationModels API
- ✅ **Deprecated model filtering** (excludes LEGACY/DEPRECATED)
- ✅ Request/response format translation
- ✅ Tool use forwarding (1:1)
- ✅ Error handling and fallback models
- ✅ Comprehensive logging
- ✅ Service management automation

**Supported Regions**: `us-west-2` (hardcoded)
**AWS Profile**: `ai-agent` (hardcoded)
**Default Port**: `7847` (configurable in code)

## Contributing

**Adding New Models**:
1. Edit `claude-desktop-proxy.ts`
2. Add to `MODEL_MAP` object
3. Restart proxy: `./start.sh restart`

**Testing Changes**:
```bash
# After editing code:
./start.sh restart
./test.sh
```

**Common Modifications**:
- Change port: Edit `PORT` variable
- Change region: Edit `region` in BedrockRuntimeClient
- Change AWS profile: Edit `profile` in credentials config

---

## Getting Help

1. **Check logs first**: `./start.sh logs`
2. **Test proxy directly**: `./test.sh`
3. **Verify AWS setup**: `aws sts get-caller-identity --profile ai-agent`
4. **Check GitHub Issues**: [Report bugs here](https://github.com/hwadhar/claude-desktop-bedrock-proxy/issues)
5. **Ask team**: #ai-tools Slack channel

**Quick Diagnosis**:
```bash
# Full system check
./start.sh status && curl -s http://localhost:7847/health && aws sts get-caller-identity --profile ai-agent
```