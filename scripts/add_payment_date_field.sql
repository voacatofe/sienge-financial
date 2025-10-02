-- ========================================
-- Script: Adicionar campo payment_date
-- Data: 2025-10-02
-- Uso: Aplicar manualmente no banco de produção atual
-- ========================================

-- INCOME DATA: Adicionar coluna payment_date
ALTER TABLE income_data
ADD COLUMN IF NOT EXISTS payment_date DATE
GENERATED ALWAYS AS (
    CASE
        WHEN receipts IS NOT NULL
             AND jsonb_array_length(receipts) > 0
        THEN (receipts->0->>'paymentDate')::DATE
        ELSE NULL
    END
) STORED;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_income_payment_date ON income_data(payment_date);

-- OUTCOME DATA: Adicionar coluna payment_date
ALTER TABLE outcome_data
ADD COLUMN IF NOT EXISTS payment_date DATE
GENERATED ALWAYS AS (
    CASE
        WHEN payments IS NOT NULL
             AND jsonb_array_length(payments) > 0
        THEN (payments->0->>'paymentDate')::DATE
        ELSE NULL
    END
) STORED;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_outcome_payment_date ON outcome_data(payment_date);

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Ver distribuição de Datas de Pagamento
SELECT
    'income_data' as tabela,
    COUNT(*) as total_registros,
    COUNT(payment_date) as com_data_pagamento,
    COUNT(*) - COUNT(payment_date) as sem_data_pagamento,
    MIN(payment_date) as primeira_data,
    MAX(payment_date) as ultima_data,
    ROUND(100.0 * COUNT(payment_date) / COUNT(*), 2) as percentual
FROM income_data
UNION ALL
SELECT
    'outcome_data' as tabela,
    COUNT(*) as total_registros,
    COUNT(payment_date) as com_data_pagamento,
    COUNT(*) - COUNT(payment_date) as sem_data_pagamento,
    MIN(payment_date) as primeira_data,
    MAX(payment_date) as ultima_data,
    ROUND(100.0 * COUNT(payment_date) / COUNT(*), 2) as percentual
FROM outcome_data;

-- Análise de Prazo de Pagamento (Outcome)
SELECT
    'Análise de Prazo - OUTCOME' as tipo,
    COUNT(*) as total_pagos,
    ROUND(AVG(payment_date - due_date), 2) as prazo_medio_dias,
    MIN(payment_date - due_date) as prazo_minimo,
    MAX(payment_date - due_date) as prazo_maximo
FROM outcome_data
WHERE payment_date IS NOT NULL;

-- Análise de Prazo de Pagamento (Income)
SELECT
    'Análise de Prazo - INCOME' as tipo,
    COUNT(*) as total_recebidos,
    ROUND(AVG(payment_date - due_date), 2) as prazo_medio_dias,
    MIN(payment_date - due_date) as prazo_minimo,
    MAX(payment_date - due_date) as prazo_maximo
FROM income_data
WHERE payment_date IS NOT NULL;
