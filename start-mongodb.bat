@echo off
echo Starting MongoDB for WebRTC Live Classes...
echo.

REM Check if MongoDB is installed
where mongod >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ MongoDB not found in PATH
    echo.
    echo Please install MongoDB:
    echo 1. Download from: https://www.mongodb.com/try/download/community
    echo 2. Or install via Chocolatey: choco install mongodb
    echo 3. Or install via Scoop: scoop install mongodb
    echo.
    pause
    exit /b 1
)

REM Create data directory if it doesn't exist
if not exist "mongodb-data" (
    echo Creating MongoDB data directory...
    mkdir mongodb-data
)

echo Starting MongoDB server...
echo Data directory: %CD%\mongodb-data
echo.

REM Start MongoDB with custom data directory
mongod --dbpath=mongodb-data --port=27017

pause