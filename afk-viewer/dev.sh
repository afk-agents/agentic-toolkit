#!/bin/bash
# AFK Viewer Dev Server Manager
# Usage: ./dev.sh [start|stop|restart|status]

PORT=3333
PIDFILE="/tmp/afk-viewer.pid"
LOGFILE="/tmp/afk-viewer.log"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

get_pid() {
    if [ -f "$PIDFILE" ]; then
        cat "$PIDFILE"
    fi
}

is_running() {
    local pid=$(get_pid)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return 0
    fi
    # Also check by port in case pidfile is stale (only look for LISTEN socket)
    local port_pid=$(lsof -i :$PORT -sTCP:LISTEN -t 2>/dev/null | head -1)
    if [ -n "$port_pid" ]; then
        echo "$port_pid" > "$PIDFILE"
        return 0
    fi
    return 1
}

start_server() {
    if is_running; then
        local pid=$(get_pid)
        echo "AFK Viewer is already running (PID: $pid)"
        echo ""
        echo "Commands:"
        echo "  ./dev.sh restart  - Restart the server (reload code changes)"
        echo "  ./dev.sh stop     - Stop the server"
        echo "  ./dev.sh status   - Show server status"
        echo ""
        echo "View at: http://localhost:$PORT"
        return 1
    fi

    echo "Starting AFK Viewer..."
    cd "$PROJECT_DIR"
    nohup bun --hot src/server/index.ts > "$LOGFILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$PIDFILE"

    # Wait a moment and verify it started
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
        echo "AFK Viewer started (PID: $pid)"
        echo "View at: http://localhost:$PORT"
        echo "Logs: $LOGFILE"
    else
        echo "Failed to start AFK Viewer. Check logs: $LOGFILE"
        rm -f "$PIDFILE"
        return 1
    fi
}

stop_server() {
    if ! is_running; then
        echo "AFK Viewer is not running"
        rm -f "$PIDFILE"
        return 0
    fi

    local pid=$(get_pid)
    echo "Stopping AFK Viewer (PID: $pid)..."
    kill "$pid" 2>/dev/null

    # Wait for graceful shutdown
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
        sleep 0.5
        count=$((count + 1))
    done

    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null
    fi

    rm -f "$PIDFILE"
    echo "AFK Viewer stopped"
}

restart_server() {
    echo "Restarting AFK Viewer..."
    stop_server
    sleep 1
    start_server
}

show_status() {
    if is_running; then
        local pid=$(get_pid)
        echo "AFK Viewer is running (PID: $pid)"
        echo "URL: http://localhost:$PORT"
        echo "Logs: $LOGFILE"
        echo ""
        echo "Recent logs:"
        tail -10 "$LOGFILE" 2>/dev/null || echo "  (no logs yet)"
    else
        echo "AFK Viewer is not running"
        echo ""
        echo "To start: ./dev.sh start"
    fi
}

show_logs() {
    if [ -f "$LOGFILE" ]; then
        tail -f "$LOGFILE"
    else
        echo "No log file found. Start the server first."
    fi
}

# Main command handler
case "${1:-start}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "AFK Viewer Dev Server"
        echo ""
        echo "Usage: ./dev.sh [command]"
        echo ""
        echo "Commands:"
        echo "  start   - Start the dev server (default)"
        echo "  stop    - Stop the dev server"
        echo "  restart - Restart the dev server (reload code)"
        echo "  status  - Show if server is running"
        echo "  logs    - Tail the server logs"
        ;;
esac
