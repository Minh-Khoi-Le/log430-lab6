@echo off
REM Master test script for all microservices (Windows)
REM This script runs unit tests for all microservices and generates coverage reports

echo  Running comprehensive unit tests for all microservices...
echo ==================================================================

set FAILED_SERVICES=
set TOTAL_SERVICES=0
set PASSED_SERVICES=0

REM Get the project root directory
set PROJECT_ROOT=%~dp0..\..

echo Starting tests from: %PROJECT_ROOT%

REM Function to run tests for a service
call :run_service_tests "User Service" "%PROJECT_ROOT%\src\services\user-service"
call :run_service_tests "Catalog Service" "%PROJECT_ROOT%\src\services\catalog-service"
call :run_service_tests "Transaction Service" "%PROJECT_ROOT%\src\services\transaction-service"

REM Print summary
echo.
echo ==================================================================
echo  Test Summary
echo ==================================================================
echo Total services tested: %TOTAL_SERVICES%
echo Passed: %PASSED_SERVICES%

if not "%FAILED_SERVICES%"=="" (
    echo Failed services: %FAILED_SERVICES%
    exit /b 1
) else (
    echo  All tests passed successfully!
    exit /b 0
)

:run_service_tests
set service_name=%~1
set service_path=%~2

echo.
echo Testing %service_name%...
echo ----------------------------------------

set /a TOTAL_SERVICES=%TOTAL_SERVICES%+1

REM Change to service directory
pushd "%service_path%" 2>nul
if errorlevel 1 (
    echo  Failed to enter %service_path%
    set FAILED_SERVICES=%FAILED_SERVICES% %service_name%
    goto :eof
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo  Installing dependencies for %service_name%...
    call npm install --silent
)


REM Run tests and show output
call npm test
if errorlevel 1 (
    echo  %service_name% tests failed
    set FAILED_SERVICES=%FAILED_SERVICES% %service_name%
) else (
    echo  %service_name% tests passed
    set /a PASSED_SERVICES=%PASSED_SERVICES%+1
)

REM Return to original directory
popd
goto :eof
