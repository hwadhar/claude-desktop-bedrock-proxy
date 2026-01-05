#!/bin/bash

# Claude Desktop → Bedrock Proxy Service Manager

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$CURRENT_DIR/proxy.pid"
LOG_FILE="$CURRENT_DIR/proxy.log"

case "$1" in
  start)
    echo "🚀 Starting Claude Desktop → Bedrock Proxy..."

    # Check if already running
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if ps -p $PID > /dev/null; then
        echo "⚠️  Proxy is already running (PID: $PID)"
        echo "🌐 Endpoint: http://localhost:7847"
        exit 1
      else
        rm -f "$PID_FILE"
      fi
    fi

    # Ensure AWS credentials are fresh
    echo "🔐 Refreshing AWS credentials..."
    if command -v ~/.local/bin/okta-aws-cli-dev-product &> /dev/null; then
        ~/.local/bin/okta-aws-cli-dev-product
    else
        echo "⚠️  Okta AWS CLI not found at ~/.local/bin/okta-aws-cli-dev-product"
        echo "    Proceeding with existing AWS credentials..."
    fi

    # Start the proxy in background
    cd "$CURRENT_DIR"
    nohup npm start > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"

    echo "✅ Proxy started (PID: $(cat $PID_FILE))"
    echo "📝 Logs: ./start.sh logs"
    echo "🌐 Endpoint: http://localhost:7847"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      echo "🛑 Stopping proxy (PID: $PID)..."
      kill $PID 2>/dev/null
      rm -f "$PID_FILE"
      echo "✅ Proxy stopped"
    else
      echo "⚠️  Proxy is not running"
    fi
    ;;

  restart)
    $0 stop
    sleep 2
    $0 start
    ;;

  status)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if ps -p $PID > /dev/null; then
        echo "✅ Proxy is running (PID: $PID)"
        echo "🌐 Endpoint: http://localhost:7847"
        echo "📊 Health: curl http://localhost:7847/health"
      else
        echo "❌ Proxy is not running (stale PID file)"
        rm -f "$PID_FILE"
      fi
    else
      echo "❌ Proxy is not running"
    fi
    ;;

  logs)
    if [ -f "$LOG_FILE" ]; then
      tail -f "$LOG_FILE"
    else
      echo "📝 No log file found. Start the proxy first: ./start.sh start"
    fi
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the proxy service"
    echo "  stop     - Stop the proxy service"
    echo "  restart  - Restart the proxy service"
    echo "  status   - Check if proxy is running"
    echo "  logs     - Show proxy logs (live)"
    ;;
esac