@echo off
echo.
echo === SESMT ASO - Build v1.7 ===
echo.

echo 1. Limpando pastas antigas...
if exist "build" rd /s /q "build"
if exist "dist" rd /s /q "dist"

echo.
echo 2. Instalando dependencias...
py -m pip install -r requirements.txt

echo.
echo 3. Construindo executavel (isso pode levar uns minutos)...
echo FECHE O PROGRAMA SE ELE ESTIVER ABERTO!
py -m PyInstaller --noconsole --onefile --name "SESMT_ASO_v1.7" --collect-all customtkinter main.py

echo.
if exist "dist\SESMT_ASO_v1.7.exe" (
    echo 4. Build concluido com sucesso!
    echo Copiando para a pasta principal...
    cmd /c copy /y "dist\SESMT_ASO_v1.7.exe" "SESMT_ASO_v1.7.exe"
    echo.
    echo ========================================================
    echo TUDO PRONTO!
    echo USE O ARQUIVO: SESMT_ASO_v1.7.exe
    echo ========================================================
) else (
    echo.
    echo !!! ERRO NA CONSTRUCAO !!!
    echo Verifique as mensagens acima.
)
pause

