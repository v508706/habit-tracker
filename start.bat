@echo off
cd /d "%~dp0"
echo Starting Habit Tracker...
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
npm run dev
pause
