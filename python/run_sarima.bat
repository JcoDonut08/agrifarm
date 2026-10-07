@echo off
set PYTHONIOENCODING=utf-8
if not defined FORECAST_PYTHON_BIN set "FORECAST_PYTHON_BIN=%~dp0.venv\Scripts\python.exe"
"%FORECAST_PYTHON_BIN%" "%~dp0sarima_forecast.py" %*
