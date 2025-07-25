@echo off
echo ==========================================
echo k6 Load Testing Suite for LOG430 Lab 6
echo Retail Store Management System
echo ==========================================
echo.

REM Check if k6 is installed
where k6 >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: k6 is not installed or not in PATH
    echo Please install k6 from https://k6.io/docs/get-started/installation/
    echo.
    pause
    exit /b 1
)

REM Set environment variables
set BASE_URL=http://localhost:8000
set API_KEY=frontend-app-key-12345

echo Current configuration:
echo - Base URL: %BASE_URL%
echo - API Key: %API_KEY%
echo.

REM Check if system is running
echo Checking if the system is available...
curl -s -o nul -w "HTTP Status: %%{http_code}" %BASE_URL%/health
if %errorlevel% neq 0 (
    echo.
    echo WARNING: System may not be running at %BASE_URL%
    echo Please ensure the system is started with: npm run start or docker-compose up
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

echo.
echo ==========================================
echo Available Test Suites:
echo ==========================================
echo 1. Smoke Test (Quick validation)
echo 2. Load Test (Normal expected load)
echo 3. Stress Test (Above normal load)
echo 4. Spike Test (Sudden traffic increase)
echo 5. Soak Test (Extended load)
echo 6. Authentication Test
echo 7. Product Catalog Test
echo 8. Stock Management Test
echo 9. Sales Transaction Test
echo 10. End-to-End Scenario Test
echo 11. Comprehensive Test (All endpoints)
echo 12. Multi-User Concurrent Test (NEW)
echo 13. High-Concurrency Stress Test (NEW)
echo 14. Connection Persistence Test (NEW)
echo 15. Run All Tests
echo 0. Exit
echo.

set /p choice="Select test to run (0-15): "

if "%choice%"=="0" exit /b 0
if "%choice%"=="1" goto smoke
if "%choice%"=="2" goto load
if "%choice%"=="3" goto stress
if "%choice%"=="4" goto spike
if "%choice%"=="5" goto soak
if "%choice%"=="6" goto auth
if "%choice%"=="7" goto product
if "%choice%"=="8" goto stock
if "%choice%"=="9" goto sales
if "%choice%"=="10" goto e2e
if "%choice%"=="11" goto comprehensive
if "%choice%"=="12" goto multiuser
if "%choice%"=="13" goto highconcurrency
if "%choice%"=="14" goto persistence
if "%choice%"=="15" goto all

echo Invalid choice. Please try again.
pause
goto :eof

:smoke
echo Running Smoke Test...
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --stage 1m:5 ..\tests\auth-test.js
goto end

:load
echo Running Load Test...
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\tests\comprehensive-test.js
goto end

:stress
echo Running Stress Test...
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\scenarios\e2e-scenario.js
goto end

:spike
echo Running Spike Test...
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\scenarios\spike-test.js
goto end

:soak
echo Running Soak Test...
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --stage 2m:20 --stage 30m:20 --stage 2m:0 ..\tests\comprehensive-test.js
goto end

:auth
echo Running Authentication Test...
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\tests\auth-test.js
goto end

:product
echo Running Product Catalog Test...
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\tests\product-test.js
goto end

:stock
echo Running Stock Management Test...
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\tests\stock-test.js
goto end

:sales
echo Running Sales Transaction Test...
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\tests\sales-test.js
goto end

:e2e
echo Running End-to-End Scenario Test...
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\scenarios\e2e-scenario.js
goto end

:comprehensive
echo Running Comprehensive Test...
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\tests\comprehensive-test.js
goto end

:multiuser
echo Running Multi-User Concurrent Test...
echo This test simulates multiple users connected simultaneously with realistic behavior patterns.
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\scenarios\multi-user-scenario.js
goto end

:highconcurrency
echo Running High-Concurrency Stress Test...
echo This test simulates extreme load with up to 200 concurrent users.
echo WARNING: This test may cause system performance degradation.
set /p confirm="Continue with high-concurrency test? (y/n): "
if /i not "%confirm%"=="y" goto end
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\scenarios\high-concurrency-stress.js
goto end

:persistence
echo Running Connection Persistence Test...
echo This test simulates long-running user sessions (15-30 minutes per user).
echo NOTE: This test will run for approximately 1 hour.
set /p confirm="Continue with persistence test? (y/n): "
if /i not "%confirm%"=="y" goto end
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% ..\scenarios\connection-persistence.js
goto end

:all
echo Running All Tests...
echo.
echo 1/11 - Authentication Test
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --quiet ..\tests\auth-test.js
echo.
echo 2/11 - Product Catalog Test
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --quiet ..\tests\product-test.js
echo.
echo 3/11 - Stock Management Test
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --quiet ..\tests\stock-test.js
echo.
echo 4/11 - Sales Transaction Test
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --quiet ..\tests\sales-test.js
echo.
echo 5/11 - Comprehensive Test
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --quiet ..\tests\comprehensive-test.js
echo.
echo 6/11 - End-to-End Scenario Test
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --quiet ..\scenarios\e2e-scenario.js
echo.
echo 7/11 - Spike Test
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --quiet ..\scenarios\spike-test.js
echo.
echo 8/11 - Multi-User Concurrent Test
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --quiet ..\scenarios\multi-user-scenario.js
echo.
echo 9/11 - High-Concurrency Stress Test (Light version)
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --stage 1m:20 --stage 2m:50 --stage 1m:20 --stage 1m:0 --quiet ..\scenarios\high-concurrency-stress.js
echo.
echo 10/11 - Connection Persistence Test (Quick version)
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --stage 2m:10 --stage 5m:15 --stage 2m:0 --quiet ..\scenarios\connection-persistence.js
echo.
echo 11/11 - Soak Test (Quick version)
k6 run --env BASE_URL=%BASE_URL% --env API_KEY=%API_KEY% --stage 2m:10 --stage 5m:10 --stage 2m:0 --quiet ..\tests\comprehensive-test.js
echo.
echo All tests completed!
goto end

:end
echo.
echo ==========================================
echo Test execution completed!
echo ==========================================
echo.
echo Test Results Summary:
echo - Check the console output above for detailed results
echo - Look for any failed checks or high response times
echo - Monitor system resources during tests
echo.
echo Tips for analyzing results:
echo - Response times should be under 2 seconds for most endpoints
echo - Error rate should be below 5% under normal load
echo - Watch for memory leaks during extended tests
echo.
pause
