@echo off
REM Database Seeding Scripts for Windows
REM Usage: 
REM   seed-database.bat           - Always rebuild db-seed image, clear all data, then force reseed database

cd /d "%~dp0.."

echo Rebuilding db-seed Docker image...
docker compose build db-seed

echo Clearing all data from database and forcing reseed...
docker compose run --rm db-seed node seed.js --force

echo Database clearing and seeding completed!
pause
