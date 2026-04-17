#!/usr/bin/env bash
# Start Cricket Expense Tracker
echo "🏏 Starting Cricket Expense Tracker..."

# Start backend
cd "$(dirname "$0")/backend" && node server.js &
BACKEND_PID=$!
echo "✅ Backend started (PID $BACKEND_PID) → http://localhost:5000"

# Start frontend
cd "$(dirname "$0")/frontend" && npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID $FRONTEND_PID) → http://localhost:3000"

echo ""
echo "🌐 Open http://localhost:3000 in your browser"
echo "   Press Ctrl+C to stop both servers"

# Wait and forward signals
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" INT TERM
wait
