@echo off
chcp 65001 >nul
title Actualizar Censo CEE Galicia (INEGA) - Jose Manuel Caamano
color 0A
echo.
echo ======================================================================
echo   🔋 ACTUALIZADOR AUTOMATICO DE SHARDS CEE RGEEE GALICIA (1 CLIC)
echo ======================================================================
echo.

node "%~dp0scripts\actualizar-cee-local.js"

echo.
pause