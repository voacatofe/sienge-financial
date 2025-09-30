# 🧹 Guia: Limpeza de Dados Históricos em Produção

**Situação**: Você já sincronizou 5 anos de dados, mas quer manter apenas 1 ano (hot data).

**Problema**: Apps Script continua buscando TODOS os registros do banco, não importa o que está no `.env`.

**Solução**: Deletar dados > 1 ano do banco de produção.

---

## ⚠️ IMPORTANTE: Fazer Backup Primeiro!

```bash
# 1. Conectar no servidor de produção (Easypanel)
ssh seu-usuario@seu-servidor

# 2. Fazer backup completo
docker exec sienge_postgres pg_dump -U sienge_user -d sienge_financial \
  > backup_antes_limpeza_$(date +%Y%m%d).sql

# 3. Verificar que backup foi criado
ls -lh backup_antes_limpeza_*.sql
# Deve mostrar arquivo com tamanho > 0
```

---

## 🎯 Opção 1: Limpeza Interativa (RECOMENDADO)

### **Passo 1: Verificar o que será deletado**

```bash
docker exec -i sienge_postgres psql -U sienge_user -d sienge_financial <<EOF
-- Ver quantos registros serão deletados
SELECT
    'income_data' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE - INTERVAL '12 months') as ficarao,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '12 months') as serao_deletados,
    pg_size_pretty(pg_total_relation_size('income_data')) as tamanho_atual
FROM income_data;

SELECT
    'outcome_data' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE - INTERVAL '12 months') as ficarao,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '12 months') as serao_deletados,
    pg_size_pretty(pg_total_relation_size('outcome_data')) as tamanho_atual
FROM outcome_data;
EOF
```

**Resultado esperado**:
```
 tabela      | total_registros | ficarao | serao_deletados | tamanho_atual
-------------+-----------------+---------+-----------------+--------------
 income_data |           25000 |    5000 |           20000 | 150 MB
 outcome_data|           30000 |    6000 |           24000 | 180 MB
```

---

### **Passo 2: Verificar datas dos dados**

```bash
docker exec -i sienge_postgres psql -U sienge_user -d sienge_financial <<EOF
-- Ver distribuição por ano
SELECT
    EXTRACT(YEAR FROM due_date) as ano,
    COUNT(*) as registros_income
FROM income_data
GROUP BY ano
ORDER BY ano DESC;

SELECT
    EXTRACT(YEAR FROM due_date) as ano,
    COUNT(*) as registros_outcome
FROM outcome_data
GROUP BY ano
ORDER BY ano DESC;
EOF
```

**Exemplo de saída**:
```
 ano  | registros_income
------+-----------------
 2024 |            4500  ← Ficará
 2023 |            5500  ← Ficará parcial (últimos 3 meses)
 2022 |            5000  ← Será deletado
 2021 |            5000  ← Será deletado
 2020 |            5000  ← Será deletado
```

---

### **Passo 3: EXECUTAR a limpeza**

**⚠️ ATENÇÃO: Esta operação é IRREVERSÍVEL!**

```bash
docker exec -i sienge_postgres psql -U sienge_user -d sienge_financial <<EOF
BEGIN;

-- Deletar dados antigos
DELETE FROM income_data WHERE due_date < CURRENT_DATE - INTERVAL '12 months';
DELETE FROM outcome_data WHERE due_date < CURRENT_DATE - INTERVAL '12 months';

-- Verificar resultado
SELECT 'income_data' as tabela, COUNT(*) as registros_restantes FROM income_data;
SELECT 'outcome_data' as tabela, COUNT(*) as registros_restantes FROM outcome_data;

-- Se estiver OK, executar COMMIT
COMMIT;
EOF
```

**Resultado esperado**:
```
DELETE 20000  ← income_data deletados
DELETE 24000  ← outcome_data deletados

 tabela       | registros_restantes
--------------+--------------------
 income_data  |                5000
 outcome_data |                6000
```

---

### **Passo 4: Recuperar espaço em disco**

```bash
# VACUUM FULL pode demorar alguns minutos
# PostgreSQL ficará OFFLINE durante o VACUUM FULL
docker exec -i sienge_postgres psql -U sienge_user -d sienge_financial <<EOF
VACUUM FULL income_data;
VACUUM FULL outcome_data;

-- Recriar índices
REINDEX TABLE income_data;
REINDEX TABLE outcome_data;

-- Atualizar estatísticas
ANALYZE income_data;
ANALYZE outcome_data;
EOF
```

**Resultado esperado**:
```
VACUUM
REINDEX
ANALYZE
```

---

### **Passo 5: Verificar tamanho final**

```bash
docker exec -i sienge_postgres psql -U sienge_user -d sienge_financial <<EOF
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho,
    n_live_tup as registros
FROM pg_stat_user_tables
WHERE tablename IN ('income_data', 'outcome_data');
EOF
```

**Resultado esperado**:
```
 schemaname |   tablename   | tamanho | registros
------------+---------------+---------+----------
 public     | income_data   | 30 MB   |     5000  ← Reduzido de 150 MB
 public     | outcome_data  | 36 MB   |     6000  ← Reduzido de 180 MB
```

**Ganho**: ~200 MB economizados (80% de redução)

---

## 🎯 Opção 2: Script Automático (Avançado)

Se preferir executar tudo de uma vez:

```bash
# Upload do script
scp scripts/cleanup_old_data.sql seu-usuario@seu-servidor:/tmp/

# Executar (depois de fazer backup!)
docker exec -i sienge_postgres psql -U sienge_user -d sienge_financial < /tmp/cleanup_old_data.sql
```

---

## 🎯 Opção 3: Limpeza Conservadora (Manter 2 anos)

Se tiver medo de perder dados, mantenha 2 anos ao invés de 1:

```bash
docker exec -i sienge_postgres psql -U sienge_user -d sienge_financial <<EOF
BEGIN;

-- Deletar apenas dados > 2 anos
DELETE FROM income_data WHERE due_date < CURRENT_DATE - INTERVAL '24 months';
DELETE FROM outcome_data WHERE due_date < CURRENT_DATE - INTERVAL '24 months';

SELECT COUNT(*) FROM income_data;
SELECT COUNT(*) FROM outcome_data;

COMMIT;
EOF
```

---

## 📊 Verificar Performance no Looker Studio

Após a limpeza:

### **1. Teste simples (sem filtros)**

1. Abrir dashboard no Looker Studio
2. Remover todos os filtros
3. ⏱️ **Tempo esperado agora**: 1-3 segundos (antes: 15-20s)

### **2. Verificar logs do Apps Script**

```javascript
// Abrir Apps Script Editor > Executions

// Logs esperados APÓS limpeza:
[INFO] Applied default date filter: last 3 months
[INFO] Fetched 450 income records   ← Era 2.500 antes
[INFO] Fetched 380 outcome records  ← Era 3.000 antes
[INFO] Total unified records: 830   ← Era 5.500 antes!
[INFO] Transformation complete: 830 rows
```

### **3. Teste com filtro de empresa**

1. Aplicar filtro: `company_name = "SUA_EMPRESA"`
2. ⏱️ **Tempo esperado**: < 1 segundo
3. Logs: `Fetched 85 income records` (ao invés de 500)

---

## 🔄 Próxima Sincronização

Com `BACKFILL_YEARS=1`, a próxima sincronização diária (2 AM) irá:

✅ Buscar últimos 7 dias (overlap)
✅ Fazer UPSERT (atualizar existentes + inserir novos)
✅ **NÃO** buscar dados antigos novamente

---

## 🚨 Se Algo Der Errado

### **Restaurar do backup**:

```bash
# 1. Parar aplicação
docker-compose stop sienge_sync sienge_api

# 2. Dropar e recriar banco
docker exec -i sienge_postgres psql -U sienge_user -d postgres <<EOF
DROP DATABASE sienge_financial;
CREATE DATABASE sienge_financial OWNER sienge_user;
EOF

# 3. Restaurar backup
docker exec -i sienge_postgres psql -U sienge_user -d sienge_financial < backup_antes_limpeza_YYYYMMDD.sql

# 4. Reiniciar aplicação
docker-compose start sienge_sync sienge_api
```

---

## 📈 Resultados Esperados Após Limpeza

| Métrica | Antes (5 anos) | Depois (1 ano) | Ganho |
|---------|----------------|----------------|-------|
| Registros no banco | ~25.000 | **~5.000** | 80% redução |
| Tamanho do banco | ~330 MB | **~66 MB** | 80% redução |
| Query padrão Looker | 15-20s | **1-3s** | 85% mais rápido |
| Query com filtros | 12-15s | **< 1s** | 93% mais rápido |
| Dashboard (5 cards) | 45-60s | **5-10s** | 88% mais rápido |

---

## ✅ Checklist Final

- [ ] ✅ Backup completo feito
- [ ] ✅ Verificado quantos registros serão deletados
- [ ] ✅ Executado DELETE
- [ ] ✅ Verificado resultado (COUNT)
- [ ] ✅ VACUUM FULL executado
- [ ] ✅ Verificado tamanho final
- [ ] ✅ Testado no Looker Studio
- [ ] ✅ Confirmado performance melhorou
- [ ] ✅ Verificado logs do Apps Script

---

## 💡 Dica Pro

**Automatizar limpeza mensal**:

Criar cron job para deletar dados > 12 meses automaticamente:

```bash
# Adicionar ao crontab
0 3 1 * * docker exec sienge_postgres psql -U sienge_user -d sienge_financial -c "DELETE FROM income_data WHERE due_date < CURRENT_DATE - INTERVAL '12 months'; DELETE FROM outcome_data WHERE due_date < CURRENT_DATE - INTERVAL '12 months'; VACUUM ANALYZE income_data; VACUUM ANALYZE outcome_data;"
```

Isso executa todo dia 1 às 3 AM (após sync diário).

---

**Pronto para executar?** Comece pelo **Passo 1** (verificação) para ver o impacto antes de deletar!