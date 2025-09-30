-- Schema for Sienge Financial Data
-- Two main tables: income_data and outcome_data

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS income_data CASCADE;
DROP TABLE IF EXISTS outcome_data CASCADE;

-- ==========================================
-- INCOME DATA TABLE (Contas a Receber)
-- ==========================================
CREATE TABLE income_data (
    -- ID composto: installment_id + bill_id (somente números)
    id VARCHAR(30) PRIMARY KEY,  -- Formato: "47_635"
    sync_date TIMESTAMP DEFAULT NOW(),

    -- Main fields (47 fields from API)
    installment_id INTEGER NOT NULL,
    bill_id INTEGER,
    company_id INTEGER,
    company_name VARCHAR,
    business_area_id INTEGER,
    business_area_name VARCHAR,
    project_id INTEGER,
    project_name VARCHAR,
    group_company_id INTEGER,
    group_company_name VARCHAR,
    holding_id INTEGER,
    holding_name VARCHAR,
    subsidiary_id INTEGER,
    subsidiary_name VARCHAR,
    business_type_id INTEGER,
    business_type_name VARCHAR,
    client_id INTEGER,
    client_name VARCHAR,
    document_identification_id VARCHAR,
    document_identification_name VARCHAR,
    document_number VARCHAR,
    document_forecast VARCHAR,
    origin_id VARCHAR,
    original_amount NUMERIC(15,2),
    discount_amount NUMERIC(15,2),
    tax_amount NUMERIC(15,2),
    indexer_id INTEGER,
    indexer_name VARCHAR,
    due_date DATE,
    issue_date DATE,
    bill_date DATE,
    installment_base_date DATE,
    balance_amount NUMERIC(15,2),
    corrected_balance_amount NUMERIC(15,2),
    periodicity_type VARCHAR,
    embedded_interest_amount NUMERIC(15,2),
    interest_type VARCHAR,
    interest_rate NUMERIC(5,2),
    correction_type VARCHAR,
    interest_base_date DATE,
    defaulter_situation VARCHAR,
    sub_judicie VARCHAR,
    main_unit VARCHAR,
    installment_number VARCHAR,
    payment_term_id VARCHAR,
    payment_term_descrition VARCHAR, -- Original typo from API
    bearer_id INTEGER,

    -- Arrays stored as JSONB for flexibility
    receipts JSONB,
    receipts_categories JSONB,

    -- Generated column for status
    status_parcela VARCHAR GENERATED ALWAYS AS (
        CASE
            WHEN balance_amount = 0 OR balance_amount IS NULL THEN 'Recebida'
            WHEN due_date < CURRENT_DATE AND balance_amount > 0 THEN 'Vencida'
            WHEN balance_amount > 0 THEN 'A Receber'
            ELSE 'Indefinido'
        END
    ) STORED
);

-- ==========================================
-- OUTCOME DATA TABLE (Contas a Pagar)
-- ==========================================
CREATE TABLE outcome_data (
    -- ID composto: installment_id + bill_id (somente números)
    id VARCHAR(30) PRIMARY KEY,  -- Formato: "8_12574"
    sync_date TIMESTAMP DEFAULT NOW(),

    -- Main fields (44 fields from API)
    installment_id INTEGER NOT NULL,
    bill_id INTEGER,
    company_id INTEGER,
    company_name VARCHAR,
    business_area_id INTEGER,
    business_area_name VARCHAR,
    project_id INTEGER,
    project_name VARCHAR,
    group_company_id INTEGER,
    group_company_name VARCHAR,
    holding_id INTEGER,
    holding_name VARCHAR,
    subsidiary_id INTEGER,
    subsidiary_name VARCHAR,
    business_type_id INTEGER,
    business_type_name VARCHAR,
    creditor_id INTEGER,
    creditor_name VARCHAR,
    document_identification_id VARCHAR,
    document_identification_name VARCHAR,
    document_number VARCHAR,
    forecast_document VARCHAR,
    consistency_status VARCHAR,
    origin_id VARCHAR,
    original_amount NUMERIC(15,2),
    discount_amount NUMERIC(15,2),
    tax_amount NUMERIC(15,2),
    indexer_id INTEGER,
    indexer_name VARCHAR,
    due_date DATE,
    issue_date DATE,
    bill_date DATE,
    installment_base_date DATE,
    balance_amount NUMERIC(15,2),
    corrected_balance_amount NUMERIC(15,2),
    authorization_status VARCHAR,
    registered_user_id VARCHAR,
    registered_by VARCHAR,
    registered_date TIMESTAMP WITH TIME ZONE,

    -- Arrays stored as JSONB for flexibility
    payments JSONB,
    payments_categories JSONB,
    departments_costs JSONB,
    buildings_costs JSONB,
    authorizations JSONB,

    -- Generated column for status
    status_parcela VARCHAR GENERATED ALWAYS AS (
        CASE
            WHEN balance_amount = 0 OR balance_amount IS NULL THEN 'Paga'
            WHEN due_date < CURRENT_DATE AND balance_amount > 0 THEN 'Vencida'
            WHEN authorization_status = 'N' OR authorization_status IS NULL THEN 'Não Autorizada'
            WHEN authorization_status = 'S' AND balance_amount > 0 THEN 'A Pagar'
            ELSE 'Indefinido'
        END
    ) STORED
);

-- ==========================================
-- UNIQUE CONSTRAINTS
-- ==========================================

-- Add UNIQUE constraint on the combination of installment_id and bill_id
ALTER TABLE income_data ADD CONSTRAINT unique_income_installment_bill UNIQUE (installment_id, bill_id);
ALTER TABLE outcome_data ADD CONSTRAINT unique_outcome_installment_bill UNIQUE (installment_id, bill_id);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Income table indexes
CREATE INDEX idx_income_installment ON income_data(installment_id);
CREATE INDEX idx_income_bill ON income_data(bill_id);
CREATE INDEX idx_income_due_date ON income_data(due_date);
CREATE INDEX idx_income_client ON income_data(client_id);
CREATE INDEX idx_income_company ON income_data(company_id);
CREATE INDEX idx_income_issue_date ON income_data(issue_date);
CREATE INDEX idx_income_receipts ON income_data USING GIN(receipts);
CREATE INDEX idx_income_categories ON income_data USING GIN(receipts_categories);

-- Outcome table indexes
CREATE INDEX idx_outcome_installment ON outcome_data(installment_id);
CREATE INDEX idx_outcome_bill ON outcome_data(bill_id);
CREATE INDEX idx_outcome_due_date ON outcome_data(due_date);
CREATE INDEX idx_outcome_creditor ON outcome_data(creditor_id);
CREATE INDEX idx_outcome_company ON outcome_data(company_id);
CREATE INDEX idx_outcome_issue_date ON outcome_data(issue_date);
CREATE INDEX idx_outcome_payments ON outcome_data USING GIN(payments);
CREATE INDEX idx_outcome_categories ON outcome_data USING GIN(payments_categories);

-- ==========================================
-- SYNC CONTROL TABLE
-- ==========================================
CREATE TABLE sync_control (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(20) NOT NULL,         -- 'historical' or 'daily'
    data_type VARCHAR(20) NOT NULL,         -- 'income' or 'outcome'
    start_date DATE NOT NULL,               -- Sync period start
    end_date DATE NOT NULL,                 -- Sync period end
    records_synced INT DEFAULT 0,           -- Total records processed
    records_inserted INT DEFAULT 0,         -- New records inserted
    records_updated INT DEFAULT 0,          -- Existing records updated
    status VARCHAR(20) NOT NULL,            -- 'success', 'failed', 'running'
    error_message TEXT,                     -- Error details if failed
    execution_time_seconds INT,             -- Duration of sync
    created_at TIMESTAMP DEFAULT NOW()      -- When sync ran
);

-- Add comments
COMMENT ON TABLE sync_control IS 'Tracks synchronization history for monitoring and automatic detection';
COMMENT ON COLUMN sync_control.sync_type IS 'Type: historical (backfill) or daily (incremental)';
COMMENT ON COLUMN sync_control.records_inserted IS 'Count of new records inserted via UPSERT';
COMMENT ON COLUMN sync_control.records_updated IS 'Count of existing records updated via UPSERT';

-- Create index for fast lookup of last successful sync
CREATE INDEX idx_sync_control_lookup ON sync_control(data_type, status, created_at DESC);

-- Create index for monitoring queries
CREATE INDEX idx_sync_control_monitoring ON sync_control(sync_type, created_at DESC);

-- ==========================================
-- HELPER VIEWS FOR COMMON QUERIES
-- ==========================================

-- View for overdue income installments
CREATE VIEW overdue_income AS
SELECT
    installment_id,
    client_name,
    document_number,
    due_date,
    original_amount,
    balance_amount,
    CURRENT_DATE - due_date AS days_overdue
FROM income_data
WHERE due_date < CURRENT_DATE
  AND balance_amount > 0
ORDER BY days_overdue DESC;

-- View for overdue outcome installments
CREATE VIEW overdue_outcome AS
SELECT
    installment_id,
    creditor_name,
    document_number,
    due_date,
    original_amount,
    balance_amount,
    CURRENT_DATE - due_date AS days_overdue
FROM outcome_data
WHERE due_date < CURRENT_DATE
  AND balance_amount > 0
ORDER BY days_overdue DESC;

-- ==========================================
-- PERMISSIONS
-- ==========================================
-- Grant permissions to sienge_user
GRANT SELECT, INSERT, UPDATE ON sync_control TO sienge_user;
GRANT USAGE, SELECT ON SEQUENCE sync_control_id_seq TO sienge_user;

-- Additional permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sienge_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sienge_app;