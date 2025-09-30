-- Migration 003: Add sync_control table for tracking synchronization history
-- Purpose: Track backfill (historical) and incremental (daily) syncs
-- Created: 2025-01-30

-- Create sync_control table
CREATE TABLE IF NOT EXISTS sync_control (
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
CREATE INDEX IF NOT EXISTS idx_sync_control_lookup
ON sync_control(data_type, status, created_at DESC);

-- Create index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_sync_control_monitoring
ON sync_control(sync_type, created_at DESC);

-- Insert marker to indicate migration ran
INSERT INTO sync_control (
    sync_type,
    data_type,
    start_date,
    end_date,
    records_synced,
    status,
    error_message
) VALUES (
    'migration',
    'system',
    CURRENT_DATE,
    CURRENT_DATE,
    0,
    'success',
    'Migration 003: sync_control table created'
);

-- Grant permissions (assuming sienge_user from previous migrations)
GRANT SELECT, INSERT, UPDATE ON sync_control TO sienge_user;
GRANT USAGE, SELECT ON SEQUENCE sync_control_id_seq TO sienge_user;