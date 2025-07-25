@echo off
echo Testing monitoring setup...

echo.
echo 1. Checking Prometheus targets...
curl -s http://localhost:9090/api/v1/targets | findstr "up"

echo.
echo 2. Testing service metrics endpoints...
echo User Service:
curl -s http://localhost:3001/metrics | findstr "http_requests_total" || echo "No metrics found"

echo.
echo Catalog Service:
curl -s http://localhost:3002/metrics | findstr "http_requests_total" || echo "No metrics found"

echo.
echo Transaction Service:
curl -s http://localhost:3003/metrics | findstr "http_requests_total" || echo "No metrics found"

echo.
echo 3. Making test requests to generate metrics...
curl -s http://localhost:8000/api/stores > nul
curl -s http://localhost:8000/api/products > nul
curl -s http://localhost:8000/api/users > nul

echo.
echo 4. Checking generated metrics...
echo User Service metrics:
curl -s http://localhost:3001/metrics | findstr "http_requests_total"

echo.
echo Test complete! Check Grafana dashboard at http://localhost:3004
pause
