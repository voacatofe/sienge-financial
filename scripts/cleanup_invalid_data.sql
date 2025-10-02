-- ==========================================
-- SCRIPT DE LIMPEZA DE DADOS INVÁLIDOS
-- ==========================================
-- Data: 2025-10-02
-- Objetivo: Remover dados com datas inválidas (< 2020 ou > 2030)
--
-- IMPORTANTE:
-- 1. Fazer BACKUP antes de executar
-- 2. Revisar os dados que serão removidos
-- 3. Executar em janela de manutenção
-- ==========================================

-- ==========================================
-- ETAPA 1: Análise dos dados inválidos
-- ==========================================

\echo '========================================'
\echo 'ANÁLISE DE DADOS INVÁLIDOS'
\echo '========================================'

-- Income: Dados fora do range válido
\echo ''
\echo 'Income - Dados com datas < 2020:'
SELECT
    COUNT(*) as total,
    MIN(due_date) as data_mais_antiga,
    MAX(due_date) as data_mais_recente
FROM income_data
WHERE due_date < '2020-01-01';

\echo ''
\echo 'Income - Dados com datas > 2030:'
SELECT
    COUNT(*) as total,
    MIN(due_date) as data_mais_antiga,
    MAX(due_date) as data_mais_recente
FROM income_data
WHERE due_date > '2030-12-31';

\echo ''
\echo 'Income - Distribuição por ano (dados inválidos):'
SELECT
    EXTRACT(YEAR FROM due_date) as ano,
    COUNT(*) as registros
FROM income_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31'
GROUP BY ano
ORDER BY ano;

-- Outcome: Dados fora do range válido
\echo ''
\echo 'Outcome - Dados com datas < 2020:'
SELECT
    COUNT(*) as total,
    MIN(due_date) as data_mais_antiga,
    MAX(due_date) as data_mais_recente
FROM outcome_data
WHERE due_date < '2020-01-01';

\echo ''
\echo 'Outcome - Dados com datas > 2030:'
SELECT
    COUNT(*) as total,
    MIN(due_date) as data_mais_antiga,
    MAX(due_date) as data_mais_recente
FROM outcome_data
WHERE due_date > '2030-12-31';

\echo ''
\echo 'Outcome - Distribuição por ano (dados inválidos):'
SELECT
    EXTRACT(YEAR FROM due_date) as ano,
    COUNT(*) as registros
FROM outcome_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31'
GROUP BY ano
ORDER BY ano;

-- ==========================================
-- ETAPA 2: Criar tabela de backup
-- ==========================================

\echo ''
\echo '========================================'
\echo 'CRIANDO BACKUP DOS DADOS INVÁLIDOS'
\echo '========================================'

-- Criar tabela de backup se não existir
CREATE TABLE IF NOT EXISTS income_data_invalid_backup (
    LIKE income_data INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS outcome_data_invalid_backup (
    LIKE outcome_data INCLUDING ALL
);

-- Copiar dados inválidos para backup
\echo 'Copiando income_data inválidos para backup...'
INSERT INTO income_data_invalid_backup
SELECT * FROM income_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31'
ON CONFLICT (id) DO NOTHING;

\echo 'Copiando outcome_data inválidos para backup...'
INSERT INTO outcome_data_invalid_backup
SELECT * FROM outcome_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31'
ON CONFLICT (id) DO NOTHING;

-- Verificar backup
\echo ''
\echo 'Verificando backup criado:'
SELECT
    'income_data_invalid_backup' as tabela,
    COUNT(*) as registros_backup
FROM income_data_invalid_backup
UNION ALL
SELECT
    'outcome_data_invalid_backup',
    COUNT(*)
FROM outcome_data_invalid_backup;

-- ==========================================
-- ETAPA 3: Remover dados inválidos
-- ==========================================
-- COMENTADO POR SEGURANÇA
-- DESCOMENTE APENAS APÓS VALIDAR BACKUP
-- ==========================================

/*
\echo ''
\echo '========================================'
\echo 'REMOVENDO DADOS INVÁLIDOS'
\echo '========================================'

-- Deletar income_data inválidos
\echo 'Removendo income_data com datas inválidas...'
DELETE FROM income_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31';

-- Deletar outcome_data inválidos
\echo 'Removendo outcome_data com datas inválidas...'
DELETE FROM outcome_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31';

-- Verificar remoção
\echo ''
\echo 'Verificando dados após limpeza:'
SELECT
    'income_data' as tabela,
    COUNT(*) as registros_restantes,
    MIN(due_date) as data_mais_antiga,
    MAX(due_date) as data_mais_recente
FROM income_data
UNION ALL
SELECT
    'outcome_data',
    COUNT(*),
    MIN(due_date),
    MAX(due_date)
FROM outcome_data;
*/

-- ==========================================
-- ETAPA 4: VACUUM FULL (Recuperar espaço)
-- ==========================================
-- COMENTADO POR SEGURANÇA
-- Execute manualmente após validar limpeza
-- ==========================================

/*
\echo ''
\echo '========================================'
\echo 'EXECUTANDO VACUUM FULL'
\echo '========================================'

VACUUM FULL income_data;
VACUUM FULL outcome_data;

-- Atualizar estatísticas
ANALYZE income_data;
ANALYZE outcome_data;

\echo ''
\echo 'Tamanho das tabelas após VACUUM:'
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename = 'income_data' OR tablename = 'outcome_data');
*/

\echo ''
\echo '========================================'
\echo 'ANÁLISE COMPLETA'
\echo '========================================'
\echo ''
\echo 'PRÓXIMOS PASSOS:'
\echo '1. Revisar backup criado'
\echo '2. Validar que dados corretos foram identificados'
\echo '3. Descomentar ETAPA 3 para executar limpeza'
\echo '4. Descomentar ETAPA 4 para recuperar espaço'
\echo ''
