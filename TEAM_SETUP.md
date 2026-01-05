# 🚀 Claude Desktop → Bedrock Proxy (Team Setup)

**Quick 5-minute setup to connect Claude Desktop to our AWS Bedrock infrastructure**

## Prerequisites
- ✅ Node.js installed (`node --version`)
- ✅ AWS CLI configured with `ai-agent` profile
- ✅ Okta AWS authentication set up

## Installation Steps

```bash
# 1. Navigate to this folder
cd /path/to/claude-desktop-bedrock-proxy

# 2. Run setup (installs dependencies)
./setup.sh

# 3. Start the proxy
./start.sh start

# 4. Test it works
./test.sh
```

## Configure Claude Desktop

1. **Open Claude Desktop Settings**
2. **API Configuration**:
   - **Base URL**: `http://localhost:7847`
   - **API Key**: `team-proxy` (any value)
3. **Test**: Ask Claude "Hello! Are you working through the proxy?"

## Daily Usage

```bash
./start.sh start     # Start proxy when you begin work
./start.sh status    # Check if running
./start.sh stop      # Stop when done for the day
```

## Troubleshooting

**Common issues:**

1. **"Token expired" error**: Run `~/.local/bin/okta-aws-cli-dev-product` then `./start.sh restart`
2. **Port in use**: Check with `lsof -i :7847` or edit port in `claude-desktop-proxy.ts`
3. **Node.js missing**: Install with `brew install node` or visit nodejs.org

**Get help:**
- Check logs: `./start.sh logs`
- Test API: `./test.sh`
- Health check: `curl http://localhost:7847/health`

**Questions?** Ask in #ai-tools or check logs with `./start.sh logs`