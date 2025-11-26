@echo off
echo ========================================
echo ReactBudget Backend API Test Suite
echo ========================================
echo.

cd /d "%~dp0"

echo Checking if server is running...
node quick-check.js

echo.
echo Starting comprehensive tests...
echo Press Ctrl+C to stop at any time
echo.

node comprehensive-test.js

echo.
echo Tests completed!
pause