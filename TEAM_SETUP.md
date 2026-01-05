# 🚀 Claude Desktop → Bedrock Proxy (Team Setup)

**5-minute setup to connect Claude Desktop to our AWS Bedrock infrastructure**

## ✅ Prerequisites Check

**Required** (run these first):
```bash
# Check you have everything installed:
node --version && npm --version && aws --version && curl --version

# Verify AWS access:
aws sts get-caller-identity --profile ai-agent

# Check Okta CLI exists:
ls ~/.local/bin/okta-aws-cli-dev-product
```

**Missing something?**
- **Node.js**: `brew install node` (macOS) or visit [nodejs.org](https://nodejs.org)
- **AWS CLI**: Ask #ai-tools for `ai-agent` profile setup
- **Okta CLI**: Contact IT for AWS authentication setup

## 🚀 Installation (5 minutes)

```bash
# 1. Get the code
git clone https://github.com/hwadhar/claude-desktop-bedrock-proxy.git
cd claude-desktop-bedrock-proxy

# 2. Install dependencies
./setup.sh

# 3. Start proxy (opens browser for Okta auth)
./start.sh start

# 4. Verify it works
./test.sh
```

## 🔧 Configure Claude Desktop

**Find Settings:**
- **macOS**: Claude Desktop → Preferences (⌘,)
- **Windows**: Settings menu (⚙️ icon)

**API Configuration:**
- **Base URL/Endpoint**: `http://localhost:7847`
- **API Key**: `team-proxy` (any non-empty value)

**Can't find API settings?** Look for "Custom API", "Advanced", or ask #ai-tools

## 🎯 Test It Works

1. **API Test**: `./test.sh` (should show `PROXY_TEST_SUCCESS`)
2. **Claude Desktop**: Ask "Hello! Are you working through the proxy?"
3. **Monitor**: `./start.sh logs` to see requests

## 📅 Daily Workflow

```bash
# Morning: Start proxy
./start.sh start

# Check status anytime
./start.sh status

# Evening: Stop proxy (optional)
./start.sh stop
```

## 🛠 Common Issues

| Problem | Solution |
|---------|----------|
| **"Token expired"** | `~/.local/bin/okta-aws-cli-dev-product` then `./start.sh restart` |
| **"Port 7847 in use"** | `lsof -i :7847` to find process, or `kill <PID>` |
| **"Permission denied"** | `chmod +x setup.sh start.sh test.sh` |
| **"npm install failed"** | Install Node.js first, then retry `./setup.sh` |
| **Claude Desktop errors** | Check `./test.sh` works first, then verify API config |

## 🔍 Debug Commands

```bash
./start.sh status               # Is proxy running?
./start.sh logs                 # View live activity
curl http://localhost:7847/health  # Health check
./test.sh                       # End-to-end test
```

## 🆘 Get Help

1. **Check logs first**: `./start.sh logs`
2. **GitHub Issues**: [Report problems here](https://github.com/hwadhar/claude-desktop-bedrock-proxy/issues)
3. **Slack**: Ask in #ai-tools
4. **Full docs**: See `README.md` for detailed troubleshooting

---

**🎉 Once working, you can use Claude Desktop with our Bedrock setup just like Claude Code!**