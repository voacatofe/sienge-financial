-- Migration: Add status_parcela generated column
-- Date: 2025-09-30
-- Description: Adds status_parcela as a GENERATED COLUMN to existing tables

-- ==========================================
-- STEP 1: Add status_parcela to income_data
-- ==========================================
-- Note: Cannot use CURRENT_DATE in generated column (not immutable)
-- Instead, we'll create a regular column with a trigger or view approach

-- Option A: Regular column (requires manual updates or trigger)
ALTER TABLE income_data
ADD COLUMN status_parcela VARCHAR;

-- Create function to calculate status
CREATE OR REPLACE FUNCTION calculate_income_status(balance numeric, due date)
RETURNS VARCHAR AS $$
BEGIN
    IF balance = 0 OR balance IS NULL THEN
        RETURN 'Recebida';
    ELSIF due < CURRENT_DATE AND balance > 0 THEN
        RETURN 'Vencida';
    ELSIF balance > 0 THEN
        RETURN 'A Receber';
    ELSE
        RETURN 'Indefinido';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate existing records
UPDATE income_data
SET status_parcela = calculate_income_status(balance_amount, due_date);

-- ==========================================
-- STEP 2: Add status_parcela to outcome_data
-- ==========================================

ALTER TABLE outcome_data
ADD COLUMN status_parcela VARCHAR;

-- Create function to calculate status
CREATE OR REPLACE FUNCTION calculate_outcome_status(balance numeric, due date, auth_status varchar)
RETURNS VARCHAR AS $$
BEGIN
    IF balance = 0 OR balance IS NULL THEN
        RETURN 'Paga';
    ELSIF due < CURRENT_DATE AND balance > 0 THEN
        RETURN 'Vencida';
    ELSIF auth_status = 'N' OR auth_status IS NULL THEN
        RETURN 'Não Autorizada';
    ELSIF auth_status = 'S' AND balance > 0 THEN
        RETURN 'A Pagar';
    ELSE
        RETURN 'Indefinido';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate existing records
UPDATE outcome_data
SET status_parcela = calculate_outcome_status(balance_amount, due_date, authorization_status);

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