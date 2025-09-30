#!/bin/bash
# =========================================
# Script de Limpeza de Dados em Produção
# Execute este script no servidor de produção
# =========================================

set -e  # Para em caso de erro

echo "============================================"
echo "🧹 Limpeza de Dados Históricos - Sienge Financial"
echo "============================================"
echo ""

# Configurações
DB_HOST="147.93.15.121"
DB_PORT="5432"
DB_NAME="sienge_data"
DB_USER="sienge_app"
RETENTION_MONTHS="12"

echo "📋 Configurações:"
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo "   Retenção: $RETENTION_MONTHS meses"
echo ""

# =========================================
# PASSO 1: BACKUP
# =========================================
echo "📦 PASSO 1: Criando backup..."
BACKUP_FILE="backup_sienge_$(date +%Y%m%d_%H%M%S).sql"

docker exec sienge_postgres pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_FILE

if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "   ✅ Backup criado: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "   ❌ Erro ao criar backup!"
    exit 1
fi
echo ""

# =========================================
# PASSO 2: VERIFICAR DADOS
# =========================================
echo "🔍 PASSO 2: Verificando dados atuais..."

docker exec -i sienge_postgres psql -U $DB_USER -d $DB_NAME <<'EOF'
\echo '📊 Situação Atual:'
\echo ''

SELECT
    'income_data' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE - INTERVAL '12 months') as permanecerão,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '12 months') as serão_deletados,
    pg_size_pretty(pg_total_relation_size('income_data')) as tamanho_atual
FROM income_data;

SELECT
    'outcome_data' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE - INTERVAL '12 months') as permanecerão,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '12 months') as serão_deletados,
    pg_size_pretty(pg_total_relation_size('outcome_data')) as tamanho_atual
FROM outcome_data;

\echo ''
\echo '📅 Distribuição por Ano (Income):'
SELECT
    EXTRACT(YEAR FROM due_date) as ano,
    COUNT(*) as registros
FROM income_data
GROUP BY ano
ORDER BY ano DESC;

\echo ''
\echo '📅 Distribuição por Ano (Outcome):'
SELECT
    EXTRACT(YEAR FROM due_date) as ano,
    COUNT(*) as registros
FROM outcome_data
GROUP BY ano
ORDER BY ano DESC;
EOF

echo ""
echo "============================================"
echo "⚠️  ATENÇÃO: Revise os números acima!"
echo "============================================"
echo ""
read -p "❓ Deseja continuar com a limpeza? (digite 'SIM' para confirmar): " confirmacao

if [ "$confirmacao" != "SIM" ]; then
    echo "❌ Operação cancelada pelo usuário."
    exit 0
fi

# =========================================
# PASSO 3: DELETAR DADOS ANTIGOS
# =========================================
echo ""
echo "🗑️  PASSO 3: Deletando dados antigos (> $RETENTION_MONTHS meses)..."

docker exec -i sienge_postgres psql -U $DB_USER -d $DB_NAME <<EOF
BEGIN;

\echo '🗑️  Deletando income_data...'
DELETE FROM income_data WHERE due_date < CURRENT_DATE - INTERVAL '$RETENTION_MONTHS months';

\echo '🗑️  Deletando outcome_data...'
DELETE FROM outcome_data WHERE due_date < CURRENT_DATE - INTERVAL '$RETENTION_MONTHS months';

\echo ''
\echo '✅ Dados deletados com sucesso!'
\echo ''
\echo '📊 Registros restantes:'
SELECT 'income_data' as tabela, COUNT(*) as registros FROM income_data;
SELECT 'outcome_data' as tabela, COUNT(*) as registros FROM outcome_data;

COMMIT;
EOF

echo "   ✅ Deleção concluída!"
echo ""

# =========================================
# PASSO 4: VACUUM E REINDEX
# =========================================
echo "🔧 PASSO 4: Recuperando espaço em disco..."
echo "   ⚠️  Esta etapa pode demorar 5-10 minutos..."
echo "   ⚠️  Banco ficará OFFLINE durante o VACUUM FULL"
echo ""

docker exec -i sienge_postgres psql -U $DB_USER -d $DB_NAME <<'EOF'
\echo '🧹 Executando VACUUM FULL em income_data...'
VACUUM FULL income_data;

\echo '🧹 Executando VACUUM FULL em outcome_data...'
VACUUM FULL outcome_data;

\echo '🔄 Recriando índices em income_data...'
REINDEX TABLE income_data;

\echo '🔄 Recriando índices em outcome_data...'
REINDEX TABLE outcome_data;

\echo '📊 Atualizando estatísticas...'
ANALYZE income_data;
ANALYZE outcome_data;

\echo '✅ Otimização concluída!'
EOF

echo "   ✅ Vacuum e reindex concluídos!"
echo ""

# =========================================
# PASSO 5: VERIFICAR RESULTADO
# =========================================
echo "✅ PASSO 5: Verificando resultado final..."

docker exec -i sienge_postgres psql -U $DB_USER -d $DB_NAME <<'EOF'
\echo '📊 Resultado Final:'
\echo ''

SELECT
    tablename as tabela,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho_final,
    n_live_tup as registros
FROM pg_stat_user_tables
WHERE tablename IN ('income_data', 'outcome_data')
ORDER BY tablename;

\echo ''
\echo '📅 Período de dados mantido:'
SELECT
    'income_data' as tabela,
    MIN(due_date) as data_mais_antiga,
    MAX(due_date) as data_mais_recente,
    COUNT(*) as total_registros
FROM income_data
UNION ALL
SELECT
    'outcome_data',
    MIN(due_date),
    MAX(due_date),
    COUNT(*)
FROM outcome_data;
EOF

echo ""
echo "============================================"
echo "🎉 Limpeza concluída com sucesso!"
echo "============================================"
echo ""
echo "📋 Próximos passos:"
echo "   1. Testar dashboard no Looker Studio"
echo "   2. Verificar logs do Apps Script"
echo "   3. Confirmar queries < 3 segundos"
echo ""
echo "💾 Backup salvo em: $BACKUP_FILE"
echo "   Mantenha este backup por pelo menos 7 dias!"
echo ""