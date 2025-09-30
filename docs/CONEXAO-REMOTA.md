# 🔌 Guia: Conexão Remota ao PostgreSQL

**Objetivo**: Permitir conexão remota ao banco de dados PostgreSQL para executar limpeza de dados e operações de manutenção.

---

## ✅ Mudanças Implementadas

### **1. Docker Compose** (`docker-compose.yml`)

```yaml
db:
  ports:
    - "${POSTGRES_EXTERNAL_PORT:-5432}:5432"  # Expõe porta externamente
```

### **2. Variável de Ambiente** (`.env`)

```env
# Porta externa para conexões remotas
POSTGRES_EXTERNAL_PORT=5432
```

---

## 🚀 Como Habilitar Conexão Remota

### **Passo 1: Atualizar `.env` em Produção**

No servidor Easypanel, adicione ao `.env`:

```env
POSTGRES_EXTERNAL_PORT=5432
```

### **Passo 2: Reiniciar o Container**

```bash
# Via Easypanel UI: Services → sienge_postgres → Restart

# Ou via SSH:
cd /path/to/sienge-financial
docker-compose restart db
```

### **Passo 3: Verificar Porta Exposta**

```bash
docker ps | grep sienge_postgres
```

**Resultado esperado**:
```
sienge_postgres   0.0.0.0:5432->5432/tcp   ← Porta exposta!
```

---

## 🔒 Configuração de Firewall (IMPORTANTE!)

⚠️ **ATENÇÃO**: Expor PostgreSQL publicamente é um **risco de segurança**!

### **Opção 1: Permitir Apenas Seu IP** (RECOMENDADO)

No Easypanel ou servidor:

```bash
# Permitir apenas seu IP (substitua 203.0.113.42 pelo seu IP)
sudo ufw allow from 203.0.113.42 to any port 5432 proto tcp

# Verificar regras
sudo ufw status
```

### **Opção 2: Usar SSH Tunnel** (MAIS SEGURO)

Não expor porta 5432 publicamente, usar túnel SSH:

```bash
# Da sua máquina local, criar túnel SSH
ssh -L 5432:localhost:5432 root@147.93.15.121

# Agora conectar em localhost:5432
psql "postgresql://sienge_app:SENHA@localhost:5432/sienge_data"
```

Neste caso, **NÃO** precisa expor porta no docker-compose (remover `ports:`)

### **Opção 3: VPN** (IDEAL para Produção)

Configure VPN e conecte apenas via rede privada.

---

## 🐍 Uso do Script Python

### **Instalação**

```bash
# Instalar dependência
pip install psycopg
```

### **Configurar Credenciais**

**Opção A: Via Variáveis de Ambiente** (RECOMENDADO)

```bash
# Windows (PowerShell)
$env:POSTGRES_PASSWORD="SUA_SENHA_AQUI"
python scripts/cleanup_remote.py

# Linux/Mac
export POSTGRES_PASSWORD="SUA_SENHA_AQUI"
python scripts/cleanup_remote.py
```

**Opção B: Editar Script Diretamente**

Abrir `scripts/cleanup_remote.py` e alterar:

```python
'password': os.getenv('POSTGRES_PASSWORD', 'SUA_SENHA_AQUI')
```

### **Executar**

```bash
cd sienge-financial
python scripts/cleanup_remote.py
```

**Saída esperada**:

```
============================================================
🧹 LIMPEZA DE DADOS HISTÓRICOS - SIENGE FINANCIAL
============================================================

🎯 Configuração:
   Host: 147.93.15.121
   Database: sienge_data
   Retenção: 12 meses

✅ Conectado ao banco de dados

============================================================
🔍 VERIFICANDO DADOS ATUAIS
============================================================

📊 income_data:
   Total atual: 24,523 registros
   Permanecerão: 4,890 registros
   Serão deletados: 19,633 registros (80.1%)
   Tamanho atual: 150 MB

📊 outcome_data:
   Total atual: 28,765 registros
   Permanecerão: 5,234 registros
   Serão deletados: 23,531 registros (81.8%)
   Tamanho atual: 180 MB

📅 Distribuição por Ano (Income):
   2024: 4,500 registros
   2023: 5,500 registros
   2022: 5,000 registros  ← Será deletado
   2021: 5,000 registros  ← Será deletado
   2020: 4,523 registros  ← Será deletado

============================================================
⚠️  ATENÇÃO: Revise os números acima!
============================================================

❓ Deseja continuar com a limpeza? (digite SIM): SIM

============================================================
🗑️  DELETANDO DADOS ANTIGOS
============================================================

🗑️  Deletando income_data (> 12 meses)...
   ✅ 19,633 registros deletados

🗑️  Deletando outcome_data (> 12 meses)...
   ✅ 23,531 registros deletados

📊 Registros restantes:
   income_data: 4,890
   outcome_data: 5,234

✅ Transação commitada com sucesso!

============================================================
🔧 RECUPERANDO ESPAÇO E OTIMIZANDO
============================================================
⚠️  Esta etapa pode demorar 5-10 minutos...
⚠️  Banco ficará OFFLINE durante o processo

❓ Executar VACUUM FULL? (digite SIM): SIM

🧹 VACUUM FULL income_data...
   ✅ Concluído

🧹 VACUUM FULL outcome_data...
   ✅ Concluído

🔄 REINDEX income_data...
   ✅ Concluído

🔄 REINDEX outcome_data...
   ✅ Concluído

📊 ANALYZE (atualizando estatísticas)...
   ✅ Concluído

============================================================
✅ RESULTADO FINAL
============================================================

📊 Tamanhos finais:
   income_data: 28 MB (4,890 registros)
   outcome_data: 32 MB (5,234 registros)

📅 Período de dados mantido:
   income_data: 2023-10-01 a 2024-09-30 (4,890 registros)
   outcome_data: 2023-10-01 a 2024-09-30 (5,234 registros)

============================================================
🎉 LIMPEZA CONCLUÍDA COM SUCESSO!
============================================================

📋 Próximos passos:
   1. Testar dashboard no Looker Studio
   2. Verificar logs do Apps Script
   3. Confirmar queries < 3 segundos

💾 Backup recomendado antes de próxima execução!

🔌 Conexão fechada
```

---

## 🔍 Testar Conexão Manual

### **Via psql**

```bash
# Windows (PowerShell)
$env:PGPASSWORD="SUA_SENHA"
psql -h 147.93.15.121 -U sienge_app -d sienge_data -c "SELECT COUNT(*) FROM income_data;"

# Linux/Mac
PGPASSWORD="SUA_SENHA" psql -h 147.93.15.121 -U sienge_app -d sienge_data -c "SELECT COUNT(*) FROM income_data;"
```

### **Via Python (teste simples)**

```python
import psycopg

conn = psycopg.connect(
    "postgresql://sienge_app:SUA_SENHA@147.93.15.121:5432/sienge_data"
)

with conn.cursor() as cur:
    cur.execute("SELECT COUNT(*) FROM income_data")
    print(f"Total de registros: {cur.fetchone()[0]}")

conn.close()
```

---

## 🚨 Troubleshooting

### **Erro: Connection refused**

```
psql: error: connection to server at "147.93.15.121", port 5432 failed: Connection refused
```

**Solução**:
1. Verificar se porta está exposta: `docker ps | grep 5432`
2. Verificar firewall do servidor
3. Verificar se `POSTGRES_EXTERNAL_PORT` está no `.env`

---

### **Erro: Password authentication failed**

```
psql: error: password authentication failed for user "sienge_app"
```

**Solução**:
1. Verificar senha no `.env` do servidor
2. Tentar: `docker exec -i sienge_postgres psql -U sienge_app -d sienge_data -c "\du"` para ver usuários

---

### **Erro: SSL negotiation failed**

```
psql: error: received invalid response to SSL negotiation
```

**Solução**:
Adicionar `sslmode=disable` à connection string:

```python
conn_str = "postgresql://sienge_app:SENHA@147.93.15.121:5432/sienge_data?sslmode=disable"
```

Ou via psql:

```bash
psql "postgresql://sienge_app:SENHA@147.93.15.121:5432/sienge_data?sslmode=disable"
```

---

### **Erro: Timeout**

```
psql: error: timeout expired
```

**Solução**:
1. Verificar se IP do servidor está correto
2. Verificar se firewall permite conexão
3. Usar `ping 147.93.15.121` para testar conectividade

---

## 🛡️ Segurança - Boas Práticas

### ✅ **FAZER**:

1. ✅ Usar firewall para restringir IPs
2. ✅ Usar senhas fortes (mínimo 20 caracteres)
3. ✅ Rotacionar senhas regularmente
4. ✅ Usar SSH tunnel quando possível
5. ✅ Monitorar logs de conexão: `docker logs sienge_postgres`
6. ✅ Fazer backup antes de operações de manutenção

### ❌ **NÃO FAZER**:

1. ❌ Expor PostgreSQL na internet sem firewall
2. ❌ Usar senhas fracas ou padrão
3. ❌ Commitar senhas no Git
4. ❌ Deixar porta 5432 aberta para 0.0.0.0 em produção
5. ❌ Executar operações sem backup

---

## 📊 Monitorar Conexões Ativas

```bash
# Ver conexões ativas ao banco
docker exec -i sienge_postgres psql -U sienge_app -d sienge_data -c "
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    client_port,
    backend_start,
    state,
    query
FROM pg_stat_activity
WHERE datname = 'sienge_data';
"
```

---

## 🔐 Desabilitar Acesso Remoto

Se quiser desabilitar depois:

### **Opção 1: Comentar porta no docker-compose.yml**

```yaml
db:
  # ports:
  #   - "${POSTGRES_EXTERNAL_PORT:-5432}:5432"
```

### **Opção 2: Mudar porta no .env**

```env
# Usar porta não padrão (mais difícil de encontrar)
POSTGRES_EXTERNAL_PORT=54320
```

### **Opção 3: Remover do firewall**

```bash
sudo ufw delete allow 5432/tcp
```

---

## 📝 Resumo

| Método | Segurança | Facilidade | Recomendado Para |
|--------|-----------|-----------|------------------|
| **Porta Exposta + Firewall** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Desenvolvimento, manutenção ocasional |
| **SSH Tunnel** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Produção, operações regulares |
| **VPN** | ⭐⭐⭐⭐⭐ | ⭐⭐ | Produção enterprise |

---

**Pronto para usar!** Escolha o método que melhor se adequa ao seu ambiente. 🚀