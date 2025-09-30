-- =========================================
-- Script de Limpeza de Dados Históricos
-- Remove dados com mais de 1 ano
-- =========================================
-- IMPORTANTE: Fazer backup antes de executar!
--
-- Backup:
-- docker exec sienge_postgres pg_dump -U sienge_user -d sienge_financial > backup_antes_limpeza_$(date +%Y%m%d).sql
--
-- Executar:
-- docker exec -i sienge_postgres psql -U sienge_user -d sienge_financial < cleanup_old_data.sql

BEGIN;

-- =========================================
-- ETAPA 1: Verificar o que será deletado
-- =========================================

SELECT
    'income_data' as tabela,
    COUNT(*) as registros_a_deletar,
    MIN(due_date) as data_mais_antiga,
    MAX(due_date) as data_mais_recente,
    pg_size_pretty(SUM(pg_column_size(income_data.*))) as tamanho_estimado
FROM income_data
WHERE due_date < CURRENT_DATE - INTERVAL '12 months';

SELECT
    'outcome_data' as tabela,
    COUNT(*) as registros_a_deletar,
    MIN(due_date) as data_mais_antiga,
    MAX(due_date) as data_mais_recente,
    pg_size_pretty(SUM(pg_column_size(outcome_data.*))) as tamanho_estimado
FROM outcome_data
WHERE due_date < CURRENT_DATE - INTERVAL '12 months';

-- =========================================
-- ETAPA 2: Verificar o que ficará no banco
-- =========================================

SELECT
    'income_data' as tabela,
    COUNT(*) as registros_que_ficarao,
    MIN(due_date) as data_mais_antiga,
    MAX(due_date) as data_mais_recente
FROM income_data
WHERE due_date >= CURRENT_DATE - INTERVAL '12 months';

SELECT
    'outcome_data' as tabela,
    COUNT(*) as registros_que_ficarao,
    MIN(due_date) as data_mais_antiga,
    MAX(due_date) as data_mais_recente
FROM outcome_data
WHERE due_date >= CURRENT_DATE - INTERVAL '12 months';

-- =========================================
-- ETAPA 3: DELETAR dados antigos
-- =========================================
-- ATENÇÃO: Remova o comentário abaixo para executar

-- DELETE FROM income_data WHERE due_date < CURRENT_DATE - INTERVAL '12 months';
-- DELETE FROM outcome_data WHERE due_date < CURRENT_DATE - INTERVAL '12 months';

-- =========================================
-- ETAPA 4: Recuperar espaço em disco
-- =========================================
-- ATENÇÃO: Remova o comentário abaixo para executar
-- VACUUM pode demorar alguns minutos

-- VACUUM FULL income_data;
-- VACUUM FULL outcome_data;

-- =========================================
-- ETAPA 5: Recriar índices
-- =========================================

-- REINDEX TABLE income_data;
-- REINDEX TABLE outcome_data;

-- =========================================
-- ETAPA 6: Atualizar estatísticas
-- =========================================

-- ANALYZE income_data;
-- ANALYZE outcome_data;

ROLLBACK; -- Use COMMIT quando estiver pronto para executar