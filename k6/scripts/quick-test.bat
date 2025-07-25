@echo off
echo ==========================================
echo k6 Quick Start - LOG430 Lab 6
echo ==========================================
echo.

REM Check if k6 is installed
where k6 >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: k6 is not installed or not in PATH
    echo.
    echo To install k6:
    echo 1. Download from https://k6.io/docs/get-started/installation/
    echo 2. Or use chocolatey: choco install k6
    echo 3. Or use scoop: scoop install k6
    echo.
    pause
    exit /b 1
)

REM Set default environment variables
set BASE_URL=http://localhost:8000
set API_KEY=frontend-app-key-12345

echo Configuration:
echo - Base URL: %BASE_URL%
echo - API Key: %API_KEY%
echo.

echo Testing system availability...
curl -s -f %BASE_URL%/api/stores >nul 2>nul
if %errorlevel% neq 0 (
    echo WARNING: System not responding at %BASE_URL%
    echo Please ensure the system is running:
    echo   cd src
    echo   docker-compose up
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

echo System is available!
echo.

echo Testing API rate limiting behavior...
echo This will check how the API Gateway handles rate limits.
echo.

k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\tests\rate-limiting-test.js

echo.
echo Based on rate limiting results, running reduced load test...
echo This will run a basic smoke test with rate limiting considerations.
echo.

k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --stage 30s:1 --stage 1m:2 --stage 30s:0 ..\tests\auth-test.js


echo.
echo ==========================================
echo Quick test completed!
echo ==========================================
echo.
echo If the test passed, your system is ready for load testing.
echo Run "run-tests.bat" for more comprehensive testing options.
echo.
pause
