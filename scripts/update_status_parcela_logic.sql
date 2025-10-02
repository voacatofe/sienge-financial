-- ========================================
-- Script: Atualizar lógica de status_parcela
-- Data: 2025-10-02
-- Descrição: Incorpora payment_date na lógica de status
--            para reconhecer pagamentos parciais e cancelamentos
-- ========================================

-- ==========================================
-- INCOME DATA: Atualizar lógica de status_parcela
-- ==========================================

-- Remover coluna antiga
ALTER TABLE income_data DROP COLUMN IF EXISTS status_parcela;

-- Adicionar coluna com nova lógica (usa JSONB diretamente, não payment_date)
-- Nota: Não usa CURRENT_DATE porque torna expressão volátil
ALTER TABLE income_data
ADD COLUMN status_parcela VARCHAR
GENERATED ALWAYS AS (
    CASE
        -- Pagamentos completos (tem recebimento em receipts e balance zerado)
        WHEN receipts IS NOT NULL
             AND jsonb_array_length(receipts) > 0
             AND (balance_amount = 0 OR balance_amount IS NULL)
        THEN 'Recebida'

        -- Pagamentos parciais (tem recebimento em receipts mas ainda tem saldo)
        WHEN receipts IS NOT NULL
             AND jsonb_array_length(receipts) > 0
             AND balance_amount > 0
        THEN 'Recebida Parcialmente'

        -- Cancelamentos/Ajustes (balance zerado mas sem recebimentos)
        WHEN (receipts IS NULL OR jsonb_array_length(receipts) = 0)
             AND (balance_amount = 0 OR balance_amount IS NULL)
        THEN 'Cancelada'

        -- A receber (sem recebimento e tem saldo)
        WHEN balance_amount > 0
             AND (receipts IS NULL OR jsonb_array_length(receipts) = 0)
        THEN 'A Receber'

        ELSE 'Indefinido'
    END
) STORED;

-- ==========================================
-- OUTCOME DATA: Atualizar lógica de status_parcela
-- ==========================================

-- Remover coluna antiga
ALTER TABLE outcome_data DROP COLUMN IF EXISTS status_parcela;

-- Adicionar coluna com nova lógica (usa JSONB diretamente, não payment_date)
-- Nota: Não usa CURRENT_DATE porque torna expressão volátil
-- Status "Vencida" será tratado via views ou queries com filtro de due_date
ALTER TABLE outcome_data
ADD COLUMN status_parcela VARCHAR
GENERATED ALWAYS AS (
    CASE
        -- Pagamentos completos (tem pagamento em payments e balance zerado)
        WHEN payments IS NOT NULL
             AND jsonb_array_length(payments) > 0
             AND (balance_amount = 0 OR balance_amount IS NULL)
        THEN 'Paga'

        -- Pagamentos parciais (tem pagamento em payments mas ainda tem saldo)
        WHEN payments IS NOT NULL
             AND jsonb_array_length(payments) > 0
             AND balance_amount > 0
        THEN 'Paga Parcialmente'

        -- Cancelamentos/Ajustes (balance zerado mas sem pagamentos)
        WHEN (payments IS NULL OR jsonb_array_length(payments) = 0)
             AND (balance_amount = 0 OR balance_amount IS NULL)
        THEN 'Cancelada'

        -- Não autorizadas (tem prioridade sobre outros status)
        WHEN authorization_status = 'N' OR authorization_status IS NULL
        THEN 'Não Autorizada'

        -- A pagar (sem pagamento, autorizada e tem saldo)
        WHEN authorization_status = 'S'
             AND balance_amount > 0
             AND (payments IS NULL OR jsonb_array_length(payments) = 0)
        THEN 'A Pagar'

        ELSE 'Indefinido'
    END
) STORED;

-- ==========================================
-- VERIFICAÇÃO
-- ==========================================

-- Ver nova distribuição de status em Income Data
SELECT
    'INCOME DATA' as tabela,
    status_parcela,
    COUNT(*) as quantidade,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentual
FROM income_data
GROUP BY status_parcela
ORDER BY quantidade DESC;

-- Ver nova distribuição de status em Outcome Data
SELECT
    'OUTCOME DATA' as tabela,
    status_parcela,
    COUNT(*) as quantidade,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentual
FROM outcome_data
GROUP BY status_parcela
ORDER BY quantidade DESC;

-- ==========================================
-- ANÁLISE DE MUDANÇAS
-- ==========================================

-- Quantos pagamentos parciais foram identificados?
SELECT
    'Income - Pagamentos Parciais' as tipo,
    COUNT(*) as quantidade
FROM income_data
WHERE status_parcela = 'Recebida Parcialmente'
UNION ALL
SELECT
    'Outcome - Pagamentos Parciais',
    COUNT(*)
FROM outcome_data
WHERE status_parcela = 'Paga Parcialmente';

-- Quantos cancelamentos foram identificados?
SELECT
    'Income - Cancelamentos' as tipo,
    COUNT(*) as quantidade
FROM income_data
WHERE status_parcela = 'Cancelada'
UNION ALL
SELECT
    'Outcome - Cancelamentos',
    COUNT(*)
FROM outcome_data
WHERE status_parcela = 'Cancelada';

-- Comparar vencidas antes e depois (deveriam diminuir)
SELECT
    'Situacao das Vencidas' as analise,
    'Income' as tabela,
    COUNT(*) as qtd_vencidas,
    SUM(CASE WHEN payment_date IS NOT NULL THEN 1 ELSE 0 END) as vencidas_com_pagamento
FROM income_data
WHERE status_parcela = 'Vencida'
UNION ALL
SELECT
    'Situacao das Vencidas',
    'Outcome',
    COUNT(*),
    SUM(CASE WHEN payment_date IS NOT NULL THEN 1 ELSE 0 END)
FROM outcome_data
WHERE status_parcela = 'Vencida';
