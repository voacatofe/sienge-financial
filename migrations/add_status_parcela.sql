-- Migration: Add status_parcela generated column
-- Date: 2025-09-30
-- Description: Adds status_parcela as a GENERATED COLUMN to existing tables

-- ==========================================
-- STEP 1: Add status_parcela to income_data
-- ==========================================

ALTER TABLE income_data
ADD COLUMN status_parcela VARCHAR GENERATED ALWAYS AS (
    CASE
        WHEN balance_amount = 0 OR balance_amount IS NULL THEN 'Recebida'
        WHEN due_date < CURRENT_DATE AND balance_amount > 0 THEN 'Vencida'
        WHEN balance_amount > 0 THEN 'A Receber'
        ELSE 'Indefinido'
    END
) STORED;

-- ==========================================
-- STEP 2: Add status_parcela to outcome_data
-- ==========================================

ALTER TABLE outcome_data
ADD COLUMN status_parcela VARCHAR GENERATED ALWAYS AS (
    CASE
        WHEN balance_amount = 0 OR balance_amount IS NULL THEN 'Paga'
        WHEN due_date < CURRENT_DATE AND balance_amount > 0 THEN 'Vencida'
        WHEN authorization_status = 'N' OR authorization_status IS NULL THEN 'Não Autorizada'
        WHEN authorization_status = 'S' AND balance_amount > 0 THEN 'A Pagar'
        ELSE 'Indefinido'
    END
) STORED;

-- ==========================================
-- STEP 3: Verify the migration
-- ==========================================

-- Check income_data
SELECT
    status_parcela,
    COUNT(*) as total,
    SUM(balance_amount) as total_balance
FROM income_data
GROUP BY status_parcela
ORDER BY total DESC;

-- Check outcome_data
SELECT
    status_parcela,
    COUNT(*) as total,
    SUM(balance_amount) as total_balance
FROM outcome_data
GROUP BY status_parcela
ORDER BY total DESC;

-- ==========================================
-- ROLLBACK (if needed)
-- ==========================================
-- ALTER TABLE income_data DROP COLUMN status_parcela;
-- ALTER TABLE outcome_data DROP COLUMN status_parcela;