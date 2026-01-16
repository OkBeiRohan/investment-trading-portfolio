@echo off
REM Quick Training Launcher for Windows
REM Activates Poetry environment and runs LightGBM training

echo ===================================================================
echo LightGBM Training Pipeline Launcher
echo ===================================================================
echo.

cd /d "%~dp0.."

echo Activating Poetry environment...
call poetry shell

echo.
echo Checking features in QuestDB...
python scripts\check_features.py

echo.
echo Press any key to start training (Ctrl+C to cancel)...
pause > nul

echo.
echo Starting LightGBM training...
python scripts\train_lightgbm.py

echo.
echo ===================================================================
echo Training complete! Check output above for results.
echo ===================================================================
pause
