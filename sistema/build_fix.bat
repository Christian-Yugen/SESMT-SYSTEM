@echo off
echo.
echo === SESMT ASO - Build de Correcao v1.7 ===
echo.

echo 1. Limpando caches e pastas...
if exist "build" rd /s /q "build"
if exist "dist" rd /s /q "dist"
if exist "__pycache__" rd /s /q "__pycache__"

echo.
echo 2. Atualizando dependencias...
py -m pip install --upgrade pip
py -m pip install -r requirements.txt

echo.
echo 3. Iniciando Build Robusto (Sem compressao UPX)...
echo Isso evita que alguns antivirus bloqueiem o programa por engano.
py -m PyInstaller --noconsole ^
    --onefile ^
    --name "SESMT_ASO_v1.7" ^
    --collect-all customtkinter ^
    --hidden-import win32timezone ^
    --hidden-import win32api ^
    --hidden-import win32com ^
    --hidden-import win32com.client ^
    --noupx ^
    --clean ^
    main.py

echo.
if exist "dist\SESMT_ASO_v1.7.exe" (
    echo 4. Build concluido!
    echo Copiando para a pasta principal...
    copy /y "dist\SESMT_ASO_v1.7.exe" "."
    echo.
    echo ========================================================
    echo TUDO PRONTO!
    echo 1. Tente executar o arquivo: SESMT_ASO_v1.7.exe
    echo 2. Se o erro persistir, adicione esta pasta as EXCLUSOES 
    echo    do seu Antivirus ou Windows Defender.
    echo ========================================================
) else (
    echo.
    echo !!! ERRO NA CONSTRUCAO !!!
    echo Verifique as mensagens de erro acima.
)
pause
