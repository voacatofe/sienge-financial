@echo off
REM =========================================
REM Script de Limpeza - Windows
REM Execute este arquivo no Windows
REM =========================================

echo ============================================
echo 🧹 Limpeza de Dados Historicos - Sienge Financial
echo ============================================
echo.

REM Configuracoes
set DB_HOST=147.93.15.121
set DB_PORT=5432
set DB_NAME=sienge_data
set DB_USER=sienge_app
set RETENTION_MONTHS=12

echo 📋 Configuracoes:
echo    Host: %DB_HOST%
echo    Database: %DB_NAME%
echo    Retencao: %RETENTION_MONTHS% meses
echo.

REM =========================================
REM PASSO 1: BACKUP
REM =========================================
echo 📦 PASSO 1: Criando backup...
set BACKUP_FILE=backup_sienge_%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%

docker exec sienge_postgres pg_dump -U %DB_USER% -d %DB_NAME% > %BACKUP_FILE%

if exist "%BACKUP_FILE%" (
    echo    ✅ Backup criado: %BACKUP_FILE%
) else (
    echo    ❌ Erro ao criar backup!
    pause
    exit /b 1
)
echo.

REM =========================================
REM PASSO 2: VERIFICAR DADOS
REM =========================================
echo 🔍 PASSO 2: Verificando dados atuais...
echo.

docker exec -i sienge_postgres psql -U %DB_USER% -d %DB_NAME% -c "SELECT 'income_data' as tabela, COUNT(*) as total_registros, COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE - INTERVAL '12 months') as permanecerao, COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '12 months') as serao_deletados, pg_size_pretty(pg_total_relation_size('income_data')) as tamanho_atual FROM income_data;"

docker exec -i sienge_postgres psql -U %DB_USER% -d %DB_NAME% -c "SELECT 'outcome_data' as tabela, COUNT(*) as total_registros, COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE - INTERVAL '12 months') as permanecerao, COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '12 months') as serao_deletados, pg_size_pretty(pg_total_relation_size('outcome_data')) as tamanho_atual FROM outcome_data;"

echo.
echo Distribuicao por Ano (Income):
docker exec -i sienge_postgres psql -U %DB_USER% -d %DB_NAME% -c "SELECT EXTRACT(YEAR FROM due_date) as ano, COUNT(*) as registros FROM income_data GROUP BY ano ORDER BY ano DESC;"

echo.
echo Distribuicao por Ano (Outcome):
docker exec -i sienge_postgres psql -U %DB_USER% -d %DB_NAME% -c "SELECT EXTRACT(YEAR FROM due_date) as ano, COUNT(*) as registros FROM outcome_data GROUP BY ano ORDER BY ano DESC;"

echo.
echo ============================================
echo ⚠️  ATENCAO: Revise os numeros acima!
echo ============================================
echo.
set /p confirmacao="❓ Deseja continuar com a limpeza? (digite SIM para confirmar): "

if not "%confirmacao%"=="SIM" (
    echo ❌ Operacao cancelada pelo usuario.
    pause
    exit /b 0
)

REM =========================================
REM PASSO 3: DELETAR DADOS ANTIGOS
REM =========================================
echo.
echo 🗑️  PASSO 3: Deletando dados antigos (^> %RETENTION_MONTHS% meses)...

docker exec -i sienge_postgres psql -U %DB_USER% -d %DB_NAME% -c "BEGIN; DELETE FROM income_data WHERE due_date < CURRENT_DATE - INTERVAL '12 months'; DELETE FROM outcome_data WHERE due_date < CURRENT_DATE - INTERVAL '12 months'; SELECT 'income_data' as tabela, COUNT(*) as registros_restantes FROM income_data; SELECT 'outcome_data' as tabela, COUNT(*) as registros_restantes FROM outcome_data; COMMIT;"

echo    ✅ Delecao concluida!
echo.

REM =========================================
REM PASSO 4: VACUUM E REINDEX
REM =========================================
echo 🔧 PASSO 4: Recuperando espaco em disco...
echo    ⚠️  Esta etapa pode demorar 5-10 minutos...
echo    ⚠️  Banco ficara OFFLINE durante o VACUUM FULL
echo.

docker exec -i sienge_postgres psql -U %DB_USER% -d %DB_NAME% -c "VACUUM FULL income_data; VACUUM FULL outcome_data; REINDEX TABLE income_data; REINDEX TABLE outcome_data; ANALYZE income_data; ANALYZE outcome_data;"

echo    ✅ Vacuum e reindex concluidos!
echo.

REM =========================================
REM PASSO 5: VERIFICAR RESULTADO
REM =========================================
echo ✅ PASSO 5: Verificando resultado final...
echo.

docker exec -i sienge_postgres psql -U %DB_USER% -d %DB_NAME% -c "SELECT tablename as tabela, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho_final, n_live_tup as registros FROM pg_stat_user_tables WHERE tablename IN ('income_data', 'outcome_data') ORDER BY tablename;"

echo.
docker exec -i sienge_postgres psql -U %DB_USER% -d %DB_NAME% -c "SELECT 'income_data' as tabela, MIN(due_date) as data_mais_antiga, MAX(due_date) as data_mais_recente, COUNT(*) as total_registros FROM income_data UNION ALL SELECT 'outcome_data', MIN(due_date), MAX(due_date), COUNT(*) FROM outcome_data;"

echo.
echo ============================================
echo 🎉 Limpeza concluida com sucesso!
echo ============================================
echo.
echo 📋 Proximos passos:
echo    1. Testar dashboard no Looker Studio
echo    2. Verificar logs do Apps Script
echo    3. Confirmar queries ^< 3 segundos
echo.
echo 💾 Backup salvo em: %BACKUP_FILE%
echo    Mantenha este backup por pelo menos 7 dias!
echo.
pause