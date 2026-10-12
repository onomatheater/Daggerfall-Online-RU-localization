@echo off
rem Апдейтер перевода: дабл-клик — и всё.
"%~dp0node_modules\.bin\electron.cmd" "%~dp0"
if errorlevel 1 pause
