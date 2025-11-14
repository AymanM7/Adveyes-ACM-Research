@echo off
REM Eye Tracker 3D Python - Environment Setup Script
REM This script sets up a Python virtual environment and installs all required dependencies

echo ========================================
echo Eye Tracker 3D - Setup Script
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from python.org
    pause
    exit /b 1
)

echo [1/4] Python found. Checking version...
python --version
echo.

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo [2/4] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully.
) else (
    echo [2/4] Virtual environment already exists.
)
echo.

REM Activate virtual environment
echo [3/4] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)
echo.

REM Upgrade pip
echo [3.5/4] Upgrading pip...
python -m pip install --upgrade pip
echo.

REM Install required packages
echo [4/4] Installing required packages...
echo This may take a few minutes...
echo.

pip install opencv-python numpy mediapipe scipy pyautogui keyboard

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install some packages
    echo Please check the error messages above
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo To run the eye tracker:
echo   1. Make sure this terminal stays open OR
echo   2. Run: venv\Scripts\activate.bat
echo   3. Then run: python your_script_name.py
echo.
echo To deactivate the virtual environment later, type: deactivate
echo.
pause