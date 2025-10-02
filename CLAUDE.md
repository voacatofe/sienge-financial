# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sienge Financial Data Sync is a financial data integration system that:
- Syncs **Income** (Contas a Receber) and **Outcome** (Contas a Pagar) data from Sienge API to PostgreSQL
- Provides REST API for external data consumption
- Includes Google Apps Script connector for Looker Studio integration
- Runs automated daily synchronization at 2:00 AM
- Uses CloudBeaver for database visualization

## Architecture

### Three-Tier System

**1. Data Sync Layer** (`sync_sienge.py`)
- Python service that fetches data from Sienge bulk-data API
- Implements UPSERT logic to handle updates without duplicates
- Tracks sync history in `sync_control` table
- Handles first-time historical sync (3 months) vs daily incremental sync (7 days)

**2. REST API Layer** (`api/`)
- FastAPI service exposing `/api/income` and `/api/outcome` endpoints
- Supports flexible filtering and pagination (max 1000 records)
- CORS-enabled for external consumption
- OpenAPI documentation at `/docs`

**3. Looker Integration** (`google-apps-script/`)
- Community Connector for Looker Studio
- Unifies Income + Outcome data with 79 fields across 10 logical groups
- Handles pagination automatically and caches data for 5 minutes
- Uses modular architecture: Config → DataFetcher → DataTransformer → SchemaBuilder

### Database Schema

**Primary Tables:**
- `income_data`: 47 fields + JSONB arrays (`receipts`, `receipts_categories`)
- `outcome_data`: 44 fields + JSONB arrays (`payments`, `payments_categories`, etc.)
- Both use composite ID: `installment_id + bill_id` (format: "47_635")
- Generated columns: `status_parcela`, `cost_center_name`, `payment_date`

**Status Parcela (GENERATED COLUMN)**:
Calcula status baseado em JSONB arrays e balance_amount:

*Income Data*:
- **Recebida**: Tem recebimento em `receipts` + balance zerado
- **Recebida Parcialmente**: Tem recebimento mas ainda tem saldo
- **Cancelada**: Balance zerado mas sem recebimentos
- **A Receber**: Sem recebimento e tem saldo

*Outcome Data*:
- **Paga**: Tem pagamento em `payments` + balance zerado
- **Paga Parcialmente**: Tem pagamento mas ainda tem saldo
- **Cancelada**: Balance zerado mas sem pagamentos
- **Não Autorizada**: `authorization_status = 'N'` ou NULL
- **A Pagar**: Autorizada, sem pagamento e tem saldo

**Nota**: Status "Vencida" não é calculado automaticamente (CURRENT_DATE torna expressão volátil). Use query: `WHERE due_date < CURRENT_DATE AND status_parcela IN ('A Receber', 'A Pagar')`

**Sync Control:**
- `sync_control` table tracks all synchronization operations
- Records: sync_type, data_type, date range, records counts, execution time

## Development Commands

### Environment Setup

**DEV (Local Testing - Windows)**
```bash
# Use docker-compose-dev.yml for local testing
docker-compose -f docker-compose-dev.yml up -d --build

# Python virtual environment
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

**PROD (Production Deployment)**
```bash
# Uses production database variables from .env
docker-compose up -d --build
```

### Docker Operations

```bash
# Start all services (PostgreSQL + Sync + API + CloudBeaver)
docker-compose up -d

# Check status
docker ps

# View logs
docker logs sienge_sync     # Sync service logs
docker logs sienge_api      # API service logs
docker logs sienge_postgres # Database logs

# View cron logs (daily sync schedule)
docker exec sienge_sync tail -f /var/log/cron.log

# Manual sync execution
docker exec sienge_sync python sync_sienge.py
docker exec sienge_sync python sync_sienge.py --start-date 2024-01-01 --end-date 2024-12-31

# Database access
docker exec -it sienge_postgres psql -U sienge_app -d sienge_data

# Stop services
docker-compose down
```

### API Testing

```bash
# Health check
curl http://localhost:8000/api/health

# Fetch income data
curl "http://localhost:8000/api/income?limit=5"
curl "http://localhost:8000/api/income?company_name=ABF&start_date=2025-01-01"

# Fetch outcome data
curl "http://localhost:8000/api/outcome?creditor_name=FORNECEDOR"

# Interactive API docs
# Visit: http://localhost:8000/docs
```

### Database Queries

```sql
-- Check sync status
SELECT * FROM sync_control ORDER BY created_at DESC LIMIT 10;

-- Verify data counts
SELECT COUNT(*) FROM income_data;
SELECT COUNT(*) FROM outcome_data;

-- Check status distribution
SELECT status_parcela, COUNT(*) FROM income_data GROUP BY status_parcela;
SELECT status_parcela, COUNT(*) FROM outcome_data GROUP BY status_parcela;

-- Overdue payments
SELECT * FROM overdue_income LIMIT 10;
SELECT * FROM overdue_outcome LIMIT 10;

-- Analyze JSONB arrays
SELECT
    id,
    jsonb_array_length(receipts) as receipt_count,
    (receipts->0->>'netAmount')::numeric as first_receipt_amount
FROM income_data
WHERE receipts IS NOT NULL AND receipts != '[]'
LIMIT 5;
```

## Key Implementation Details

### Sync Service (`sync_sienge.py`)

**Critical Functions:**
- `is_first_sync()`: Detects empty database to trigger historical backfill
- `fetch_data()`: Handles pagination and API rate limits automatically
- `insert_income_data()` / `insert_outcome_data()`: UPSERT logic with `ON CONFLICT`
- `track_sync()`: Records metadata in `sync_control` table

**Sync Behavior:**
- **First Deploy**: Syncs last 3 months automatically
- **Daily Cron**: Syncs last 7 days at 2:00 AM
- **Manual**: Accepts custom date ranges via command-line args
- **Filter**: Always applies `selectionType=I` to Sienge API requests

### API Service (`api/main.py`)

**Key Patterns:**
- Uses `build_where_clause()` to dynamically construct SQL filters
- Returns paginated responses with `total`, `count`, `limit`, `offset`
- All endpoints return `ApiResponse` model with `success` flag
- Implements health checks for monitoring

**Filter Types:**
- Exact match: `company_id`, `client_id`, `creditor_id`
- Partial search (ILIKE): `company_name`, `client_name`, `creditor_name`
- Range filters: `start_date`/`end_date`, `min_amount`/`max_amount`

### Google Apps Script Connector

**Modular Architecture:**
```
SiengeFinancialConnector.gs  → Entry point (getData, getSchema, getConfig)
    ↓
Config.gs                     → Constants (API paths, cache settings)
    ↓
DataFetcher.gs                → fetchAllData() with pagination
    ↓
DataTransformer.gs            → Unifies Income/Outcome into common fields
    ↓
SchemaBuilder.gs              → Builds 79-field schema for Looker
```

**Configuration Options:**
- `API_BASE_URL`: REST API endpoint
- `INCLUDE_INCOME`: Toggle Income data
- `INCLUDE_OUTCOME`: Toggle Outcome data
- `CALCULATE_METRICS`: Process JSONB arrays (slower but adds 4 useful fields)
- `INCLUDE_SPECIFIC_FIELDS`: Include type-specific fields (22 fields)

**Field Groups (81 total - updated 2025-10-02):**
1. Identificação (5) - IDs and sync metadata
2. Empresa (15) - Company hierarchy + Centro de Custo
3. Contraparte Unificada (3) - Client/Creditor merged
4. Documento (5) - Document info
5. Valores Financeiros (6) - Financial amounts
6. Datas (4) - Dates
7. Indexação (2) - Indexers
8. Movimentações (4) - Calculated from JSONB arrays
9. Income Específico (13) - Income-only fields
10. Outcome Específico (9) - Outcome-only fields

**Recent Field Additions:**
- `cost_center_name` (2025-10-02) - Centro de Custo extraído de JSONB arrays

## Environment Variables

**.env Configuration:**
```bash
# Sienge API
SIENGE_SUBDOMAIN=abf
SIENGE_USERNAME=abf-gfragoso
SIENGE_PASSWORD_ABF=<api_password>

# PostgreSQL
POSTGRES_DB=sienge_data
POSTGRES_USER=sienge_app
POSTGRES_PASSWORD=<db_password>
POSTGRES_HOST=localhost  # "db" in Docker
POSTGRES_PORT=5432
POSTGRES_EXTERNAL_PORT=5436  # For remote access

# Sync Configuration
SYNC_START_DATE=2024-01-01  # Historical sync start
SYNC_END_DATE=2024-12-31    # Historical sync end
```

**Important:**
- DEV uses `localhost` and local credentials
- PROD uses `db` (Docker service name) and production credentials
- Never commit `.env` file (use `.env.example` as template)

## Testing Strategy

### Database Connection
```bash
python test_db.py  # Verify PostgreSQL connection
```

### API Validation
1. Start services: `docker-compose up -d`
2. Wait for health: `curl http://localhost:8000/api/health`
3. Test endpoints via Swagger UI: `http://localhost:8000/docs`
4. Verify data: `curl "http://localhost:8000/api/income?limit=1"`

### Looker Connector
1. Deploy to Google Apps Script
2. Update `appsscript.json` with correct URLs
3. Deploy as Community Connector
4. Test in Looker Studio with API URL: `http://localhost:8000`
5. Verify field mappings and data transformation

## Common Troubleshooting

### Sync Service Issues
- **Authentication errors**: Check `SIENGE_USERNAME` and `SIENGE_PASSWORD_ABF` in `.env`
- **Database connection failed**: Verify PostgreSQL is healthy with `docker ps`
- **No data synced**: Check `sync_control` table for error messages
- **Duplicate key errors**: UPSERT should handle this; check `unique_income_installment_bill` constraint

### API Issues
- **503 Service Unavailable**: Database not ready; wait for health check
- **Empty results**: Verify data exists with direct PostgreSQL query
- **CORS errors**: Ensure `allow_origins=["*"]` in `main.py`

### Looker Connector Issues
- **"URL da API não configurada"**: Set API_BASE_URL in connector config
- **"Nenhum dado retornado"**: Verify API is running and accessible
- **Timeout errors**: Disable "Calcular Métricas" option for faster processing
- **Invalid JSON**: Check API response format matches expected structure

## Deployment Flow

**Initial Setup (First Deploy):**
1. PostgreSQL starts → creates schema from `schema.sql`
2. API starts → waits for DB health check
3. Sync service starts → detects empty database
4. Auto-executes historical sync (last 3 months)
5. Sets up cron job for daily sync at 2:00 AM
6. CloudBeaver starts on port 8978

**Daily Operation:**
1. Cron triggers at 2:00 AM
2. Syncs last 7 days of data (UPSERT)
3. Records sync metadata in `sync_control`
4. Logs written to `/var/log/cron.log`

**Manual Intervention:**
```bash
# Force sync specific period
docker exec sienge_sync python sync_sienge.py --start-date 2024-06-01 --end-date 2024-06-30

# Check last sync status
docker exec sienge_postgres psql -U sienge_app -d sienge_data -c "SELECT * FROM sync_control ORDER BY created_at DESC LIMIT 5;"
```

## Code Modification Guidelines

### Adding New Fields to Schema

**For Generated Columns (calculated from existing data):**
1. Update `schema.sql` with new GENERATED column (for new databases)
2. Create SQL script in `scripts/` for manual application
3. Apply manually in existing databases: `psql -f scripts/add_field.sql`
4. Update `google-apps-script/SchemaBuilder.gs` to expose in Looker
5. Update `google-apps-script/DataTransformer.gs` to map field
6. No rebuild needed (API uses `SELECT *`)

**For Source Fields (from Sienge API):**
1. Update `schema.sql` with new column
2. Apply manually in existing databases via psql
3. Update `sync_sienge.py` field mappings in `insert_*_data()` functions
4. Update `api/models.py` if creating specific filters
5. Update `google-apps-script/SchemaBuilder.gs` to expose in Looker
6. Update `google-apps-script/DataTransformer.gs` to map field
7. Rebuild and restart: `docker-compose up -d --build sync`

**Example: cost_center_name field (2025-10-02)**
- Generated column extracting from JSONB arrays
- Script: `scripts/add_cost_center_field.sql`
- Documentation: `docs/DEPLOY_COST_CENTER_FIELD.md`

### Adding New API Filters
1. Add query parameter to `api/main.py` endpoint
2. Update `build_where_clause()` in `api/database.py` to handle new filter
3. Update OpenAPI docs by modifying `Query()` description
4. Test via `/docs` endpoint

### Modifying Sync Logic
1. Edit `sync_sienge.py` sync methods
2. Test locally with `python sync_sienge.py --start-date <date> --end-date <date>`
3. Verify UPSERT behavior by running sync twice
4. Check `sync_control` table for accurate metadata
5. Rebuild Docker image: `docker-compose up -d --build sync`

## Data Freshness & Sync Strategy

**IMPORTANTE:** O banco de dados e o Looker Studio **NÃO precisam ser real-time**. A sincronização diária D-1 (dia anterior) é suficiente.

- **Frequência de Sync**: Dados do dia anterior são suficientes para análises e relatórios
- **Cron Schedule**: 2:00 AM todos os dias sincroniza os últimos 7 dias
- **Looker Studio**: Configurado para cache de 5 minutos, mas dados já são D-1
- **Expectativa de Freshness**: Usuários esperam dados de ontem, não tempo real
- **Vantagens**: Menos carga na API Sienge, melhor performance, dados mais estáveis

**Implicações:**
- Não é necessário implementar sync em tempo real ou webhooks
- Scheduler diário às 2 AM é adequado para o caso de uso
- Looker Studio pode ser configurado com cache mais longo (até 12 horas)
- Não há necessidade de otimizações de latência extrema

## Performance Considerations

- **PostgreSQL Indexes**: Already optimized for `due_date`, `company_id`, `client_id`, `creditor_id`, JSONB fields
- **API Pagination**: Max 1000 records per request to prevent memory issues
- **Looker Cache**: 5-minute cache reduces API load (pode ser aumentado para 12h dado que dados são D-1)
- **JSONB Arrays**: Expensive to process; disable "Calculate Metrics" if not needed
- **Sync Frequency**: Daily sync fetches 7 days to handle late updates; adjust if needed
- **Real-time Not Required**: D-1 data is sufficient, no need for continuous sync or webhooks

## Security Notes

- API has CORS enabled (`allow_origins=["*"]`) - restrict in production
- No authentication on API endpoints - add OAuth/JWT for production
- Database exposed on port 5436 - use firewall rules in production
- Sienge credentials stored in `.env` - use secrets manager in production
- CloudBeaver has default admin setup - secure before production use
