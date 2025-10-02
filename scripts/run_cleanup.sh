#!/bin/bash

# ==========================================
# Script de Limpeza de Dados Inválidos
# ==========================================
# Uso:
#   ./run_cleanup.sh analyze          # Apenas análise
#   ./run_cleanup.sh backup           # Análise + Backup
#   ./run_cleanup.sh cleanup          # Análise + Backup + Limpeza
#   ./run_cleanup.sh vacuum           # Todas as etapas + VACUUM
# ==========================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuração do banco
DB_HOST="${POSTGRES_HOST:-147.93.15.121}"
DB_PORT="${POSTGRES_EXTERNAL_PORT:-5436}"
DB_NAME="${POSTGRES_DB:-sienge_data}"
DB_USER="${POSTGRES_USER:-sienge_app}"
DB_PASS="${POSTGRES_PASSWORD:-TROQUE_ESTA_SENHA_EM_PRODUCAO}"

# Função para executar SQL
run_sql() {
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
}

# Verificar argumento
MODE="${1:-analyze}"

echo -e "${GREEN}========================================"
echo "LIMPEZA DE DADOS INVÁLIDOS - MODO: $MODE"
echo -e "========================================${NC}"
echo ""

# ==========================================
# ETAPA 1: ANÁLISE
# ==========================================

echo -e "${YELLOW}Analisando dados inválidos...${NC}"

run_sql -c "
SELECT 'Income < 2020' as tipo, COUNT(*) as total FROM income_data WHERE due_date < '2020-01-01'
UNION ALL
SELECT 'Income > 2030', COUNT(*) FROM income_data WHERE due_date > '2030-12-31'
UNION ALL
SELECT 'Outcome < 2020', COUNT(*) FROM outcome_data WHERE due_date < '2020-01-01'
UNION ALL
SELECT 'Outcome > 2030', COUNT(*) FROM outcome_data WHERE due_date > '2030-12-31';
"

if [ "$MODE" = "analyze" ]; then
    echo ""
    echo -e "${GREEN}Análise completa!${NC}"
    echo "Execute '$0 backup' para criar backup dos dados inválidos"
    exit 0
fi

# ==========================================
# ETAPA 2: BACKUP
# ==========================================

if [ "$MODE" = "backup" ] || [ "$MODE" = "cleanup" ] || [ "$MODE" = "vacuum" ]; then
    echo ""
    echo -e "${YELLOW}Criando backup dos dados inválidos...${NC}"

    run_sql <<EOF
-- Criar tabelas de backup
CREATE TABLE IF NOT EXISTS income_data_invalid_backup (LIKE income_data INCLUDING ALL);
CREATE TABLE IF NOT EXISTS outcome_data_invalid_backup (LIKE outcome_data INCLUDING ALL);

-- Backup income
INSERT INTO income_data_invalid_backup
SELECT * FROM income_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31'
ON CONFLICT (id) DO NOTHING;

-- Backup outcome
INSERT INTO outcome_data_invalid_backup
SELECT * FROM outcome_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31'
ON CONFLICT (id) DO NOTHING;

-- Verificar backup
SELECT 'income_backup' as tabela, COUNT(*) as registros FROM income_data_invalid_backup
UNION ALL
SELECT 'outcome_backup', COUNT(*) FROM outcome_data_invalid_backup;
EOF

    echo -e "${GREEN}Backup criado com sucesso!${NC}"
fi

if [ "$MODE" = "backup" ]; then
    echo ""
    echo "Execute '$0 cleanup' para remover dados inválidos"
    exit 0
fi

# ==========================================
# ETAPA 3: LIMPEZA
# ==========================================

if [ "$MODE" = "cleanup" ] || [ "$MODE" = "vacuum" ]; then
    echo ""
    echo -e "${RED}ATENÇÃO: Iniciando limpeza de dados inválidos!${NC}"
    echo -e "${YELLOW}Pressione Ctrl+C nos próximos 5 segundos para cancelar...${NC}"
    sleep 5

    echo ""
    echo -e "${YELLOW}Removendo dados inválidos...${NC}"

    run_sql <<EOF
-- Deletar income inválidos
DELETE FROM income_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31';

-- Deletar outcome inválidos
DELETE FROM outcome_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31';

-- Verificar
SELECT 'income_data' as tabela, COUNT(*) as registros_restantes,
       MIN(due_date) as min_date, MAX(due_date) as max_date
FROM income_data
UNION ALL
SELECT 'outcome_data', COUNT(*), MIN(due_date), MAX(due_date)
FROM outcome_data;
EOF

    echo -e "${GREEN}Limpeza concluída!${NC}"
fi

if [ "$MODE" = "cleanup" ]; then
    echo ""
    echo "Execute '$0 vacuum' para recuperar espaço em disco"
    exit 0
fi

# ==========================================
# ETAPA 4: VACUUM FULL
# ==========================================

if [ "$MODE" = "vacuum" ]; then
    echo ""
    echo -e "${YELLOW}Executando VACUUM FULL (pode demorar)...${NC}"

    run_sql <<EOF
VACUUM FULL income_data;
VACUUM FULL outcome_data;
ANALYZE income_data;
ANALYZE outcome_data;

-- Tamanho final
SELECT tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename = 'income_data' OR tablename = 'outcome_data');
EOF

    echo -e "${GREEN}VACUUM completo!${NC}"
fi

echo ""
echo -e "${GREEN}========================================"
echo "PROCESSO CONCLUÍDO COM SUCESSO!"
echo -e "========================================${NC}"
