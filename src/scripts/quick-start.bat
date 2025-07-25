@echo off
REM Simplified Quick Start Script for LOG430 Lab 6
REM Stops all containers, rebuilds images, starts everything, seeds DB, and launches frontend

echo ========================================
echo   LOG430 Lab 6 - Quick Start Script
echo ========================================
echo.

echo Stopping and removing all containers...
docker-compose down -v

echo Building all Docker images...
docker-compose build

echo Starting all services (database, cache, microservices, Kong)...
docker-compose up -d

echo Waiting for Kong API Gateway to be ready...
:wait_kong
curl -s http://localhost:8001/status > nul 2>&1
if %errorlevel% neq 0 (
    echo Kong not ready, waiting 5 seconds...
    timeout /t 5 /nobreak >nul
    goto wait_kong
)
echo Kong is ready!

echo Seeding database with demo data...
docker-compose run --rm db-seed

echo Skipping Docker web client startup. Starting frontend locally on http://localhost:5173 ...
cd /d "%~dp0..\web-client"
call npm install
start cmd /k "npm run dev"
cd /d "%~dp0"
echo Frontend started in a new terminal window.

echo ========================================
echo   LOG430 Lab 6 - System Ready!
echo ========================================
echo.
echo Access Points:
echo - Web Client: http://localhost:5173
echo - API Gateway: http://localhost:8000  
echo - Kong Admin: http://localhost:8001
echo.
echo Demo Login Credentials:
echo - Admin: admin / admin123
echo - Client: client / client123
echo.
echo System startup completed! Press any key to exit...
pause
