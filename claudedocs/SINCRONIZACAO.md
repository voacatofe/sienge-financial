# Sincronização Sienge Financial - Backfill + Incremental

## 🎯 Visão Geral

O sistema de sincronização possui **detecção automática** de modo, eliminando configuração manual de datas:

- **🎯 Backfill (Histórico)**: Primeira execução → últimos 5 anos
- **🔄 Incremental (Diário)**: Execuções subsequentes → últimos 7 dias com overlap

## 📊 Arquitetura

### Tabela sync_control

Rastreia todo histórico de sincronizações:

```sql
CREATE TABLE sync_control (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(20),           -- 'historical' ou 'daily'
  data_type VARCHAR(20),            -- 'income' ou 'outcome'
  start_date DATE,
  end_date DATE,
  records_synced INT,
  records_inserted INT,
  records_updated INT,
  status VARCHAR(20),               -- 'success', 'failed', 'running'
  error_message TEXT,
  execution_time_seconds INT,
  created_at TIMESTAMP
);
```

### Lógica de Detecção

```python
# Verifica se banco está vazio
if (income.count == 0 AND outcome.count == 0):
    # BACKFILL MODE
    start_date = today() - 5 years
    end_date = today()
    sync_type = 'historical'
else:
    # INCREMENTAL MODE
    last_sync = MAX(sync_control.end_date) WHERE status='success'
    start_date = last_sync - 7 days  # Overlap de segurança
    end_date = today()
    sync_type = 'daily'
```

## 🚀 Uso

### Modo Automático (Recomendado)

```bash
# Primeira execução (banco vazio) → Backfill automático
python sync_sienge.py

# Saída:
# [INFO] 🎯 BACKFILL MODE: Syncing last 5 years
# [INFO]    Period: 2020-01-30 to 2025-01-30
# [INFO] Income: 15,234 records synced
# [INFO] Outcome: 12,456 records synced
# [INFO] ✅ Sienge sync completed successfully

# Execuções subsequentes → Incremental automático
python sync_sienge.py

# Saída:
# [INFO] 🔄 INCREMENTAL MODE: Syncing with 7-day overlap
# [INFO]    Period: 2025-01-23 to 2025-01-30
# [INFO] Income: 45 records synced
# [INFO] Outcome: 38 records synced
# [INFO] ✅ Sienge sync completed successfully
```

### Modo Manual (Override)

```bash
# Forçar período específico
python sync_sienge.py --start-date 2024-01-01 --end-date 2024-12-31

# Saída:
# [INFO] 📅 MANUAL MODE: Using provided dates
# [INFO]    Period: 2024-01-01 to 2024-12-31
```

## ⚙️ Configuração (.env)

```env
# Backfill: Quantos anos buscar na primeira sincronização
BACKFILL_YEARS=5

# Incremental: Janela de overlap (dias)
INCREMENTAL_LOOKBACK_DAYS=7
```

### Por que Overlap de 7 dias?

**Segurança contra falhas**:
- Se sincronização falhar em um dia, não perde dados
- Garante captura de atualizações retroativas
- UPSERT evita duplicação

## 📅 Cron (Automático)

### Setup

O cron está configurado no Docker:

```cron
0 2 * * * /bin/sh /app/cron_sync.sh >> /var/log/cron.log 2>&1
```

**Tradução**: Todo dia às 2h AM, executa sincronização incremental

### Logs

```bash
# Ver logs do cron
docker logs sienge_sync

# Acompanhar em tempo real
docker exec sienge_sync tail -f /var/log/cron.log
```

## 📊 Monitoramento

### Ver Histórico de Sincronizações

```sql
-- Últimas 20 sincronizações
SELECT
  sync_type,
  data_type,
  TO_CHAR(start_date, 'YYYY-MM-DD') as start_date,
  TO_CHAR(end_date, 'YYYY-MM-DD') as end_date,
  records_synced,
  status,
  execution_time_seconds,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM sync_control
ORDER BY created_at DESC
LIMIT 20;
```

### Ver Última Sincronização por Tipo

```sql
-- Última sincronização bem-sucedida
SELECT
  sync_type,
  data_type,
  MAX(end_date) as last_sync_date,
  SUM(records_synced) as total_records
FROM sync_control
WHERE status = 'success'
GROUP BY sync_type, data_type
ORDER BY sync_type, data_type;
```

### Ver Sincronizações com Falha

```sql
-- Erros recentes
SELECT
  sync_type,
  data_type,
  start_date,
  end_date,
  error_message,
  created_at
FROM sync_control
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Dashboard Completo

```sql
-- Status geral da sincronização
WITH latest_syncs AS (
  SELECT DISTINCT ON (data_type)
    data_type,
    sync_type,
    end_date as last_sync_date,
    status,
    records_synced,
    created_at
  FROM sync_control
  WHERE sync_type IN ('historical', 'daily')
  ORDER BY data_type, created_at DESC
)
SELECT
  data_type,
  sync_type as last_mode,
  last_sync_date,
  status,
  records_synced as last_count,
  EXTRACT(DAY FROM (CURRENT_DATE - last_sync_date)) as days_since_sync
FROM latest_syncs
ORDER BY data_type;
```

## 🔄 Fluxo Completo

### 1. Primeiro Deploy

```bash
# Docker compose sobe pela primeira vez
docker-compose up -d

# Container init_sync.sh detecta banco vazio
# Executa automaticamente: python sync_sienge.py
# → BACKFILL: 5 anos de dados

# Registra em sync_control:
# sync_type='historical', status='success'
```

### 2. Sincronização Diária (Cron)

```bash
# Todo dia 2h AM, cron executa automaticamente
python sync_sienge.py

# Sistema detecta: banco tem dados
# → INCREMENTAL: últimos 7 dias

# Busca última sync bem-sucedida de sync_control
# Aplica overlap de 7 dias
# Registra nova entrada em sync_control
```

### 3. Manual Override

```bash
# Você pode forçar período específico a qualquer momento
docker exec sienge_sync python sync_sienge.py \
  --start-date 2024-06-01 \
  --end-date 2024-06-30

# Registra com sync_type='manual'
```

## 🛡️ Tratamento de Erros

### Se Sincronização Falhar

```sql
-- O sistema registra falha em sync_control
status = 'failed'
error_message = <mensagem do erro>

-- Próxima sincronização (overlap de 7 dias) recupera dados perdidos
-- Não há perda de dados!
```

### Logs de Erro

```bash
# Ver últimos erros
docker logs sienge_sync 2>&1 | grep ERROR

# Ver último erro em sync_control
docker exec sienge_db psql -U sienge_user -d sienge_financial -c \
  "SELECT * FROM sync_control WHERE status='failed' ORDER BY created_at DESC LIMIT 1;"
```

## 🔧 Troubleshooting

### Problema: Primeira sincronização não rodou

**Verificar**:
```bash
# Container está rodando?
docker ps | grep sienge_sync

# Logs do init script
docker logs sienge_sync | head -50

# Banco está acessível?
docker exec sienge_sync python sync_sienge.py --test-connection
```

### Problema: Cron não está rodando sincronização diária

**Verificar**:
```bash
# Cron service está ativo?
docker exec sienge_sync service cron status

# Cron job está configurado?
docker exec sienge_sync crontab -l

# Ver logs do cron
docker exec sienge_sync tail -20 /var/log/cron.log
```

### Problema: Sincronização muito lenta

**Análise**:
```sql
-- Ver tempo de execução médio
SELECT
  sync_type,
  AVG(execution_time_seconds) as avg_seconds,
  MAX(execution_time_seconds) as max_seconds,
  AVG(records_synced) as avg_records
FROM sync_control
WHERE status = 'success'
GROUP BY sync_type;
```

**Otimizar**:
- Reduzir `INCREMENTAL_LOOKBACK_DAYS` de 7 para 3 dias
- Aumentar CPU/RAM do container
- Verificar latência de rede com API Sienge

### Problema: Dados duplicados

**Não deveria acontecer** - o sistema usa UPSERT.

**Verificar**:
```sql
-- Buscar IDs duplicados
SELECT id, COUNT(*)
FROM income
GROUP BY id
HAVING COUNT(*) > 1;

SELECT id, COUNT(*)
FROM outcome
GROUP BY id
HAVING COUNT(*) > 1;
```

## 📈 Métricas de Performance

### Query de Análise

```sql
-- Performance por período
SELECT
  DATE_TRUNC('month', created_at) as month,
  sync_type,
  COUNT(*) as total_syncs,
  SUM(records_synced) as total_records,
  AVG(execution_time_seconds) as avg_time_sec,
  SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failures
FROM sync_control
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at), sync_type
ORDER BY month DESC, sync_type;
```

## 🎓 Casos de Uso

### Caso 1: Re-sincronizar período específico

```bash
# Suspeita de dados incorretos em junho/2024
docker exec sienge_sync python sync_sienge.py \
  --start-date 2024-06-01 \
  --end-date 2024-06-30

# UPSERT atualiza registros existentes
# Não duplica dados
```

### Caso 2: Forçar backfill completo

```bash
# Parar container
docker-compose stop sienge_sync

# Limpar dados (CUIDADO!)
docker exec sienge_db psql -U sienge_user -d sienge_financial -c "TRUNCATE income, outcome, sync_control CASCADE;"

# Reiniciar container
docker-compose start sienge_sync

# Container detecta banco vazio → Backfill automático
```

### Caso 3: Mudar janela de overlap

```bash
# Editar .env
INCREMENTAL_LOOKBACK_DAYS=14  # Aumentar para 14 dias

# Reiniciar container
docker-compose restart sienge_sync

# Próxima sincronização usa nova janela
```

## 🔐 Segurança

### Permissões do sync_control

```sql
-- Já configurado na migration 003
GRANT SELECT, INSERT, UPDATE ON sync_control TO sienge_user;
GRANT USAGE, SELECT ON SEQUENCE sync_control_id_seq TO sienge_user;
```

### Logs Sensíveis

⚠️ **Atenção**: Logs do sync podem conter:
- Quantidade de registros
- Períodos sincronizados
- Mensagens de erro (podem ter IDs)

Não expor logs publicamente.

## 📝 Resumo

| Aspecto | Backfill | Incremental |
|---------|----------|-------------|
| **Quando** | Primeira execução (banco vazio) | Execuções subsequentes |
| **Período** | Últimos 5 anos (configurável) | Últimos 7 dias com overlap |
| **Frequência** | Uma vez (manual se precisar refazer) | Diário (cron 2h AM) |
| **sync_type** | 'historical' | 'daily' |
| **Volume** | Grande (milhares de registros) | Pequeno (dezenas de registros) |
| **Tempo** | Minutos | Segundos |

**Vantagens**:
- ✅ Zero configuração manual de datas
- ✅ Detecção automática de modo
- ✅ Overlap garante não perder dados
- ✅ UPSERT evita duplicação
- ✅ Rastreabilidade completa via sync_control
- ✅ Resiliente a falhas