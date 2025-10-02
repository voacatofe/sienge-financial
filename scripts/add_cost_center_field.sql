-- ========================================
-- Script: Adicionar campo cost_center_name
-- Data: 2025-10-02
-- Uso: Aplicar manualmente no banco de produção atual
-- ========================================

-- INCOME DATA: Adicionar coluna cost_center_name
ALTER TABLE income_data
ADD COLUMN IF NOT EXISTS cost_center_name VARCHAR
GENERATED ALWAYS AS (
    CASE
        WHEN receipts_categories IS NOT NULL
             AND jsonb_array_length(receipts_categories) > 0
        THEN receipts_categories->0->>'costCenterName'
        ELSE NULL
    END
) STORED;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_income_cost_center ON income_data(cost_center_name);

-- OUTCOME DATA: Adicionar coluna cost_center_name
ALTER TABLE outcome_data
ADD COLUMN IF NOT EXISTS cost_center_name VARCHAR
GENERATED ALWAYS AS (
    CASE
        WHEN payments_categories IS NOT NULL
             AND jsonb_array_length(payments_categories) > 0
        THEN payments_categories->0->>'costCenterName'
        ELSE NULL
    END
) STORED;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_outcome_cost_center ON outcome_data(cost_center_name);

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Ver distribuição de Centros de Custo
SELECT
    'income_data' as tabela,
    COUNT(*) as total_registros,
    COUNT(cost_center_name) as com_centro_custo,
    COUNT(*) - COUNT(cost_center_name) as sem_centro_custo,
    ROUND(100.0 * COUNT(cost_center_name) / COUNT(*), 2) as percentual
FROM income_data
UNION ALL
SELECT
    'outcome_data' as tabela,
    COUNT(*) as total_registros,
    COUNT(cost_center_name) as com_centro_custo,
    COUNT(*) - COUNT(cost_center_name) as sem_centro_custo,
    ROUND(100.0 * COUNT(cost_center_name) / COUNT(*), 2) as percentual
FROM outcome_data;

-- Top 5 Centros de Custo (Income)
SELECT
    'TOP 5 INCOME' as tipo,
    cost_center_name,
    COUNT(*) as qtd_registros,
    SUM(original_amount) as total_valor
FROM income_data
WHERE cost_center_name IS NOT NULL
GROUP BY cost_center_name
ORDER BY qtd_registros DESC
LIMIT 5;

-- Top 5 Centros de Custo (Outcome)
SELECT
    'TOP 5 OUTCOME' as tipo,
    cost_center_name,
    COUNT(*) as qtd_registros,
    SUM(original_amount) as total_valor
FROM outcome_data
WHERE cost_center_name IS NOT NULL
GROUP BY cost_center_name
ORDER BY qtd_registros DESC
LIMIT 5;
