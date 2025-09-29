# 🚀 Deploy no Easypanel - Sienge Financial

Guia completo para deploy da aplicação Sienge Financial no Easypanel usando Docker.

## 📋 Pré-requisitos

- Conta no Easypanel configurada
- Acesso à API do Sienge (subdomínio, usuário e senha)
- Repositório Git: https://github.com/voacatofe/sienge-financial

## 🔐 Segurança - ANTES DE COMEÇAR

### ⚠️ IMPORTANTE: Proteja suas credenciais

1. **NUNCA commite o arquivo `.env` para o Git**
   - Arquivo `.env` está no `.gitignore`
   - Use apenas `.env.example` como template

2. **Use senhas FORTES**
   - `POSTGRES_PASSWORD`: Use gerador de senhas aleatórias (mínimo 20 caracteres)
   - Não use senhas óbvias como "sienge123"

3. **Configuração de variáveis no Easypanel**
   - Configure TODAS as variáveis de ambiente através da interface do Easypanel
   - Não deixe valores padrão do `.env.example`

## 📦 Estrutura da Aplicação

A aplicação é composta por 4 serviços Docker:

```
┌─────────────┐
│   API       │  Porta 8000 (FastAPI) - EXPOSTA
│  (FastAPI)  │  Endpoints: /api/income, /api/outcome
└─────────────┘
       │
       ↓
┌─────────────┐
│  PostgreSQL │  Porta 5432 - INTERNA (não expor!)
│   Database  │  Armazena dados sincronizados
└─────────────┘
       ↑
       │
┌─────────────┐
│ Sync Service│  Sincronização diária às 2h
│   (Python)  │  Busca dados da API Sienge
└─────────────┘
```

## 🔧 Passo a Passo - Deploy no Easypanel

### 1️⃣ Preparar Repositório Git

```bash
# Clone o repositório
git clone https://github.com/voacatofe/sienge-financial.git
cd sienge-financial

# Verifique se os arquivos de segurança existem
ls -la .gitignore .dockerignore .env.example

# NUNCA commite o .env
git status  # .env NÃO deve aparecer aqui
```

### 2️⃣ Criar Aplicação no Easypanel

1. **Login no Easypanel**
   - Acesse seu painel do Easypanel

2. **Criar Nova Aplicação**
   - Clique em **"Create Application"**
   - Nome: `sienge-financial`
   - Tipo: **Docker Compose**

3. **Conectar Repositório Git**
   - Repository: `https://github.com/voacatofe/sienge-financial`
   - Branch: `main`
   - Build Context: `/` (raiz do projeto)

### 3️⃣ Configurar Variáveis de Ambiente

No Easypanel, vá em **Environment Variables** e configure:

#### 🔴 OBRIGATÓRIAS - API Sienge

```env
SIENGE_SUBDOMAIN=sua-empresa
SIENGE_USERNAME=seu-usuario
SIENGE_PASSWORD_ABF=sua-senha-complexa-aqui
```

#### 🔴 OBRIGATÓRIAS - Banco de Dados

```env
POSTGRES_DB=sienge_data
POSTGRES_USER=sienge_app
POSTGRES_PASSWORD=USE_UMA_SENHA_FORTE_AQUI_MINIMO_20_CARACTERES
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

**💡 Dica**: Gere senha forte com: `openssl rand -base64 32`

#### 🟡 RECOMENDADAS - Sincronização

```env
# Período inicial de sincronização
SYNC_START_DATE=2024-01-01
SYNC_END_DATE=2024-12-31

# Ambiente
ENVIRONMENT=production
```

#### 🟢 OPCIONAIS - API

```env
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4
```

### 4️⃣ Configurar Docker Compose

No Easypanel, especifique o arquivo de configuração:

**Desenvolvimento/Teste**:
```yaml
docker-compose.yml
```

**Produção** (recomendado):
```yaml
docker-compose.yml -f docker-compose.production.yml
```

A versão de produção (`docker-compose.production.yml`) inclui:
- ✅ PostgreSQL não exposto externamente
- ✅ CloudBeaver desabilitado (use ferramenta externa)
- ✅ Logging otimizado (10MB max por arquivo, 3 arquivos)
- ✅ 4 workers do Uvicorn
- ✅ Restart automático

### 5️⃣ Configurar Rede e Portas

#### Portas a Expor no Easypanel

**Porta 8000** (API FastAPI):
- Protocolo: HTTP
- Porta Interna: 8000
- Porta Externa: Configurada automaticamente pelo Easypanel
- Domínio: Configure um domínio customizado se necessário

**⚠️ NÃO exponha a porta 5432 (PostgreSQL)**
- O banco de dados deve ser acessível APENAS internamente
- A rede `sienge_network` conecta os serviços

### 6️⃣ Configurar Volumes Persistentes

O Easypanel deve criar volumes para:

```yaml
postgres_data:  # Dados do PostgreSQL
  path: /var/lib/postgresql/data
  size: 10GB  # Ajuste conforme necessário
```

**Não é necessário volume para**:
- `cloudbeaver_data` (serviço desabilitado em produção)
- Serviço `sync` (stateless)
- Serviço `api` (stateless)

### 7️⃣ Deploy

1. **Revisar Configurações**
   - ✅ Todas variáveis de ambiente configuradas
   - ✅ Senhas fortes definidas
   - ✅ Porta 8000 exposta
   - ✅ Porta 5432 NÃO exposta
   - ✅ Volumes configurados

2. **Fazer Deploy**
   - Clique em **"Deploy"**
   - Acompanhe os logs de build e inicialização

3. **Aguardar Inicialização**
   - O serviço `sync` executará a sincronização inicial
   - Isso pode levar alguns minutos dependendo do volume de dados
   - Verifique nos logs: `✓ Initial synchronization completed successfully!`

### 8️⃣ Verificar Saúde da Aplicação

#### Testar API

```bash
# Substitua YOUR_DOMAIN pelo domínio do Easypanel
curl https://YOUR_DOMAIN/api/health

# Resposta esperada:
{
  "status": "healthy",
  "database": "connected",
  "message": "Sienge Financial API is operational"
}
```

#### Testar Endpoints de Dados

```bash
# Income (Contas a Receber)
curl https://YOUR_DOMAIN/api/income?limit=10

# Outcome (Contas a Pagar)
curl https://YOUR_DOMAIN/api/outcome?limit=10
```

### 9️⃣ Verificar Logs

No Easypanel, acesse a aba **Logs** para cada serviço:

**Serviço `sync`**:
```
✓ PostgreSQL is ready!
✓ Initial synchronization completed successfully!
Summary:
  - Income records: 1234
  - Outcome records: 567
✓ Cron service started successfully
✓ Daily sync scheduled for 2:00 AM
```

**Serviço `api`**:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Serviço `db`**:
```
PostgreSQL init process complete; ready for start up.
database system is ready to accept connections
```

## 🔄 Sincronização Diária

### Automática

O serviço `sync` executa automaticamente às **2:00 AM** todos os dias:
- Sincroniza últimos 7 dias de dados
- Atualiza registros existentes
- Insere novos registros
- Logs disponíveis em: `/var/log/cron.log`

### Manual (quando necessário)

```bash
# No Easypanel, acesse o terminal do container 'sync' e execute:
python /app/sync_sienge.py --start-date 2024-01-01 --end-date 2024-12-31
```

## 📊 Conectar ao Looker Studio

Agora você pode usar o Google Apps Script Community Connector:

1. Acesse a documentação em `google-apps-script/README.md`
2. Configure a URL da API no conector: `https://YOUR_DOMAIN`
3. Crie dashboards no Looker Studio com os dados unificados

## 🛠️ Manutenção

### Atualizar Aplicação

1. **Push para o Git**:
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   git push origin main
   ```

2. **Redesploy no Easypanel**:
   - Clique em **"Rebuild"** na interface do Easypanel
   - Aguarde o build e restart dos serviços

### Backup do Banco de Dados

```bash
# No terminal do container 'db':
pg_dump -U sienge_app sienge_data > /tmp/backup_$(date +%Y%m%d).sql

# Download do backup através do Easypanel File Manager
```

### Restaurar Backup

```bash
# No terminal do container 'db':
psql -U sienge_app sienge_data < /tmp/backup_20240101.sql
```

### Forçar Nova Sincronização Completa

```bash
# 1. Limpar dados existentes
psql -U sienge_app -d sienge_data -c "TRUNCATE income_data, outcome_data;"

# 2. Executar sincronização
python /app/sync_sienge.py --start-date 2024-01-01 --end-date 2024-12-31
```

## 🐛 Troubleshooting

### Erro: "Failed to connect to PostgreSQL"

**Causa**: Banco de dados não está pronto
**Solução**: Aguardar inicialização completa (até 30 segundos)

### Erro: "Authentication failed for user sienge_app"

**Causa**: Senha do PostgreSQL incorreta
**Solução**: Revisar variável `POSTGRES_PASSWORD` no Easypanel

### Erro: "API Sienge returned 401 Unauthorized"

**Causa**: Credenciais do Sienge incorretas
**Solução**: Revisar variáveis `SIENGE_USERNAME` e `SIENGE_PASSWORD_ABF`

### Serviço API não responde

1. **Verificar logs**:
   - Easypanel → Logs → `api`
   - Procurar por erros de conexão com banco

2. **Verificar health check**:
   ```bash
   curl https://YOUR_DOMAIN/api/health
   ```

3. **Restart do serviço**:
   - Easypanel → Services → `api` → Restart

### Sincronização não está rodando

1. **Verificar logs do cron**:
   ```bash
   # No terminal do container 'sync':
   tail -f /var/log/cron.log
   ```

2. **Verificar serviço cron**:
   ```bash
   service cron status
   ```

3. **Testar manualmente**:
   ```bash
   /app/cron_sync.sh
   ```

## 🔒 Checklist de Segurança Pós-Deploy

- [ ] Porta 5432 (PostgreSQL) NÃO está exposta publicamente
- [ ] Senha do PostgreSQL é forte (20+ caracteres aleatórios)
- [ ] Variável `POSTGRES_PASSWORD` configurada no Easypanel (não hardcoded)
- [ ] Arquivo `.env` NÃO foi commitado no Git
- [ ] CloudBeaver está desabilitado em produção
- [ ] API está respondendo apenas em HTTPS
- [ ] Logs estão sendo rotacionados corretamente
- [ ] Backup automático configurado (se aplicável)

## 📞 Suporte

- **Repositório**: https://github.com/voacatofe/sienge-financial
- **Issues**: https://github.com/voacatofe/sienge-financial/issues
- **Documentação API**: `https://YOUR_DOMAIN/docs` (FastAPI auto-docs)

## 📚 Documentações Relacionadas

- [README Principal](README.md) - Visão geral do projeto
- [Apps Script - Looker Studio](google-apps-script/README.md) - Conectar ao Looker Studio
- [Docker Compose](docker-compose.yml) - Configuração de desenvolvimento
- [Docker Compose Production](docker-compose.production.yml) - Configuração de produção

---

**Última atualização**: 2024
**Versão**: 1.0
**Plataforma**: Easypanel + Docker