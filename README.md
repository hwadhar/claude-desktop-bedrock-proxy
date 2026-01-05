# Claude Desktop → AWS Bedrock Proxy

**Connect Claude Desktop to our AWS Bedrock setup** (same as Claude Code)

## Quick Setup (5 minutes)

### 1. Install & Start
```bash
# Run setup (installs dependencies)
./setup.sh

# Start proxy service
./start.sh start
```

### 2. Configure Claude Desktop
- **Settings → API Configuration**:
  - **Base URL**: `http://localhost:7847`
  - **API Key**: `team-proxy` (any value works)

### 3. Test
```bash
# Test the proxy works
./test.sh

# Ask Claude Desktop: "Hello! Are you working through the proxy?"
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

- **Models**: Automatically maps Claude model names to Bedrock inference profiles
- **Auth**: Uses your existing `ai-agent` AWS profile + Okta authentication
- **Streaming**: Full support for real-time responses
- **Tools**: Forwards tool use requests 1:1

## Supported Models

| Claude Desktop | Bedrock Inference Profile |
|----------------|---------------------------|
| `claude-3-5-sonnet-20241022` | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` |
| `claude-sonnet-4-5-20250929` | `us.anthropic.claude-sonnet-4-20250514-v1:0` |
| `sonnet-4` | `us.anthropic.claude-sonnet-4-20250514-v1:0` |
| `claude-3-5-haiku-20241022` | `us.anthropic.claude-3-5-haiku-20241022-v1:0` |

## Troubleshooting

### "API Error: security token included is expired"
```bash
# Refresh AWS credentials
~/.local/bin/okta-aws-cli-dev-product
./start.sh restart
```

### Port 7847 in use
```bash
# Find what's using the port
lsof -i :7847
# Kill the process or edit claude-desktop-proxy.ts to use different port
```

### Health Check
```bash
curl http://localhost:7847/health
```

## Files

- `setup.sh` - One-time setup script
- `start.sh` - Service management (start/stop/status/logs)
- `test.sh` - API testing script
- `claude-desktop-proxy.ts` - Main proxy service
- `package.json` - Node.js dependencies

## Requirements

- **Node.js** (any recent version)
- **AWS CLI** with `ai-agent` profile configured
- **Okta authentication** via `~/.local/bin/okta-aws-cli-dev-product`

---

**Questions?** Check logs with `./start.sh logs` or ask in #ai-tools