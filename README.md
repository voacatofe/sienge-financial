# Sienge Financial Data Sync

Sistema de sincronização de dados financeiros do Sienge para PostgreSQL com:
- **Sincronização automática no primeiro deploy**
- **Sincronização diária às 2h da manhã**
- **Interface web CloudBeaver para visualização dos dados**

## Estrutura

O projeto sincroniza dados de dois endpoints do Sienge:
- **Income** (Contas a Receber): parcelas, recebimentos, categorias
- **Outcome** (Contas a Pagar): parcelas, pagamentos, custos, autorizações

## Instalação

### 1. Pré-requisitos
- Docker e Docker Compose
- Python 3.8+

### 2. Configurar ambiente

Verifique o arquivo `.env` com as credenciais:
```
SIENGE_SUBDOMAIN=abf
SIENGE_USERNAME=abf-gfragoso
SIENGE_PASSWORD_ABF=2grGSPuKaEyFtwhrKVttAIimPbP2AfNJ
POSTGRES_DB=sienge_data
POSTGRES_USER=sienge_app
POSTGRES_PASSWORD=sienge123
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

### 3. Deploy com Sincronização Automática

```bash
# Subir todos os serviços (PostgreSQL + Sync + CloudBeaver)
docker-compose up -d --build

# No primeiro deploy, o sistema automaticamente:
# 1. Cria as tabelas no banco de dados
# 2. Aguarda o PostgreSQL estar pronto
# 3. Executa sincronização dos últimos 3 meses
# 4. Configura sincronização diária às 2h da manhã
# 5. Inicia CloudBeaver na porta 8978

# Verificar se está rodando
docker ps

# Ver logs da sincronização automática
docker logs sienge_sync

# Ver logs do cron (sincronização diária)
docker exec sienge_sync tail -f /var/log/cron.log
```

### 4. Instalar dependências Python (apenas para desenvolvimento local)

```bash
# Não necessário se usando Docker
pip install -r requirements.txt
```

## Uso

### CloudBeaver - Interface Web

Acesse o banco de dados através da interface web:

1. **URL**: http://localhost:8978
2. **Primeiro Acesso**:
   - Aceite os termos de uso
   - Crie um usuário administrador (qualquer nome/senha)
   - Configure a conexão PostgreSQL com:
     - Host: sienge_postgres (ou localhost se acessando de fora do Docker)
     - Port: 5432
     - Database: sienge_data
     - Username: sienge_app
     - Password: sienge123

Após configuração inicial:
- Você pode executar queries SQL diretamente na interface
- Exportar dados em CSV/Excel
- Criar visualizações e relatórios

### API REST - Consumo Externo de Dados

A aplicação inclui uma API REST completa para consumo externo dos dados financeiros:

**URL Base**: http://localhost:8000

#### Documentação Interativa
- **Swagger UI**: http://localhost:8000/docs (recomendado - interface interativa)
- **ReDoc**: http://localhost:8000/redoc (documentação alternativa)

#### Endpoints Disponíveis

**1. Income (Contas a Receber)**
```bash
# Listar todos os income records (paginado)
GET /api/income

# Buscar income específico por ID
GET /api/income/{id}
```

**2. Outcome (Contas a Pagar)**
```bash
# Listar todos os outcome records (paginado)
GET /api/outcome

# Buscar outcome específico por ID
GET /api/outcome/{id}
```

**3. Utilitários**
```bash
# Informações da API
GET /

# Health check
GET /api/health
```

#### Filtros Disponíveis (Income)

Todos os filtros são opcionais e podem ser combinados:

- `company_id` - ID da empresa
- `company_name` - Busca parcial no nome da empresa
- `client_id` - ID do cliente
- `client_name` - Busca parcial no nome do cliente
- `project_id` - ID do projeto
- `business_area_id` - ID da área de negócio
- `start_date` - Data inicial (formato: YYYY-MM-DD)
- `end_date` - Data final (formato: YYYY-MM-DD)
- `min_amount` - Valor mínimo
- `max_amount` - Valor máximo
- `limit` - Registros por página (padrão: 100, máximo: 1000)
- `offset` - Paginação (padrão: 0)

#### Filtros Disponíveis (Outcome)

- `company_id` - ID da empresa
- `company_name` - Busca parcial no nome da empresa
- `creditor_id` - ID do credor/fornecedor
- `creditor_name` - Busca parcial no nome do credor
- `project_id` - ID do projeto
- `business_area_id` - ID da área de negócio
- `start_date` - Data inicial (formato: YYYY-MM-DD)
- `end_date` - Data final (formato: YYYY-MM-DD)
- `min_amount` - Valor mínimo
- `max_amount` - Valor máximo
- `authorization_status` - Status de autorização
- `limit` - Registros por página (padrão: 100, máximo: 1000)
- `offset` - Paginação (padrão: 0)

#### Exemplos de Uso

```bash
# Listar primeiros 5 income records
curl "http://localhost:8000/api/income?limit=5"

# Filtrar por empresa
curl "http://localhost:8000/api/income?company_name=ALFA"

# Filtrar por período
curl "http://localhost:8000/api/income?start_date=2025-01-01&end_date=2025-12-31"

# Filtrar por cliente e valor mínimo
curl "http://localhost:8000/api/income?client_name=SILVA&min_amount=1000"

# Paginação
curl "http://localhost:8000/api/income?limit=50&offset=100"

# Buscar registro específico
curl "http://localhost:8000/api/income/47_635"

# Filtrar outcome por fornecedor
curl "http://localhost:8000/api/outcome?creditor_name=FORNECEDOR"
```

#### Formato de Resposta

**Lista de Registros:**
```json
{
  "success": true,
  "total": 6518,
  "count": 100,
  "limit": 100,
  "offset": 0,
  "data": [
    {
      "id": "47_635",
      "sync_date": "2025-09-29T19:49:14.373Z",
      "installment_id": 47,
      "bill_id": 635,
      "company_name": "INCORPORADORA ALFA SPE LTDA",
      "client_name": "JOÃO DA SILVA",
      "original_amount": 5000.00,
      "due_date": "2025-10-15",
      // ... todos os outros campos
    }
  ]
}
```

**Registro Único:**
```json
{
  "success": true,
  "data": {
    "id": "47_635",
    // ... todos os campos do registro
  }
}
```

**Erro:**
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "detail": "Detalhes adicionais"
}
```

#### Recursos da API

- ✅ Documentação automática (Swagger UI)
- ✅ CORS habilitado para consumo externo
- ✅ Validação automática de parâmetros
- ✅ Paginação com limite de 1000 registros
- ✅ Filtros flexíveis e combináveis
- ✅ Busca parcial por nomes (case-insensitive)
- ✅ Queries otimizadas com índices

### Sincronização Automática

#### Primeiro Deploy
No primeiro `docker-compose up`, o sistema automaticamente:
- Detecta que o banco está vazio
- Executa sincronização dos últimos 3 meses
- Mostra resumo dos dados sincronizados

#### Sincronização Diária
O sistema executa automaticamente todos os dias às **2:00 AM**:
- Sincroniza os últimos 7 dias de dados
- Registra logs em `/var/log/cron.log`
- Atualiza registros existentes (UPSERT)

### Sincronização Manual

```bash
# Dentro do container Docker
docker exec sienge_sync python sync_sienge.py

# Sincronizar período específico
docker exec sienge_sync python sync_sienge.py --start-date 2024-01-01 --end-date 2024-12-31

# Para desenvolvimento local (sem Docker)
python sync_sienge.py --start-date 2024-01-01 --end-date 2024-12-31
```

### Conectar ao banco de dados

#### Interface Web (Recomendado)
Acesse http://localhost:8978 e use o CloudBeaver para:
- Visualizar tabelas e dados
- Executar queries SQL
- Exportar dados em CSV/Excel
- Criar gráficos e relatórios

#### Via Terminal
```bash
# Usar Docker exec
docker exec -it sienge_postgres psql -U sienge_app -d sienge_data
```

#### Dentro do container:
```bash
docker exec -it sienge_postgres sh
PGPASSWORD='sienge123' psql -U sienge_app -d sienge_data
```

## Estrutura do Banco de Dados

### Tabela `income_data` (47 campos)
- Campos principais: installment_id, bill_id, client_id, client_name, due_date, etc.
- Arrays em JSONB: receipts, receipts_categories

### Tabela `outcome_data` (44 campos)
- Campos principais: installment_id, bill_id, creditor_id, creditor_name, due_date, etc.
- Arrays em JSONB: payments, payments_categories, departments_costs, buildings_costs, authorizations

## Queries Úteis

```sql
-- Parcelas vencidas (Income)
SELECT * FROM income_data
WHERE due_date < CURRENT_DATE
AND balance_amount > 0;

-- Total por cliente
SELECT client_name, SUM(original_amount) as total
FROM income_data
GROUP BY client_name
ORDER BY total DESC;

-- Parcelas vencidas (Outcome)
SELECT * FROM outcome_data
WHERE due_date < CURRENT_DATE
AND balance_amount > 0;

-- Total por fornecedor
SELECT creditor_name, SUM(original_amount) as total
FROM outcome_data
GROUP BY creditor_name
ORDER BY total DESC;

-- Visualizar recebimentos (do JSONB)
SELECT
    installment_id,
    jsonb_array_elements(receipts)->>'paymentDate' as payment_date,
    jsonb_array_elements(receipts)->>'netAmount' as amount
FROM income_data
WHERE receipts IS NOT NULL AND receipts != '[]';
```

## Troubleshooting

### Erro de conexão com PostgreSQL

Se receber erro de autenticação ao conectar do host Windows:
1. Conecte usando `docker exec` ao invés de conexão direta
2. Ou ajuste pg_hba.conf no container para permitir conexões do host

### Erro ao instalar psycopg2-binary no Windows

O projeto usa `psycopg` (versão 3) ao invés de `psycopg2-binary` para evitar problemas de compilação no Windows.

### Container não inicia

Verifique se a porta 5432 está livre:
```bash
netstat -an | findstr :5432
```

## Estrutura dos Arquivos

```
sienge-financial/
├── sync_sienge.py       # Script principal de sincronização
├── init_sync.sh         # Script de inicialização automática
├── schema.sql           # DDL das tabelas do banco
├── Dockerfile           # Container para serviço de sincronização
├── docker-compose.yml   # Orquestração dos containers
├── requirements.txt     # Dependências Python
├── test_db.py          # Script de teste de conexão
├── .env                # Variáveis de ambiente
└── api_financas/       # Documentação da API
    ├── bulk-data-income-v1.yaml
    ├── bulk-data-outcome-v1.yaml
    ├── response_income.json     # Exemplo de resposta
    └── response_outcome.json    # Exemplo de resposta
```

## Arquitetura Docker

O projeto usa quatro containers:

1. **sienge_postgres**: PostgreSQL 15 com as tabelas de dados
   - Porta: 5432
   - Armazena todos os dados financeiros (income e outcome)

2. **sienge_sync**: Python com script de sincronização
   - Executa sincronização automática no primeiro deploy
   - Cron job para sincronização diária às 2:00 AM
   - Permanece ativo para sincronizações manuais

3. **sienge_api**: FastAPI REST API para consumo externo
   - Porta: 8000
   - Documentação Swagger em /docs
   - Endpoints de consulta com filtros flexíveis
   - CORS habilitado para acesso externo

4. **sienge_cloudbeaver**: Interface web para o banco de dados
   - Porta: 8978
   - Visualização e manipulação dos dados
   - Execução de queries SQL

## Fluxo de Inicialização

1. Container PostgreSQL inicia e cria as tabelas (schema.sql)
2. Containers Sync e API aguardam PostgreSQL estar saudável
3. Script de sincronização verifica se é primeiro deploy (tabelas vazias)
4. Se primeiro deploy: executa sincronização automática
5. Configura cron job para sincronização diária às 2:00 AM
6. API REST inicia e fica disponível na porta 8000
7. CloudBeaver inicia com conexão pré-configurada na porta 8978
8. Containers permanecem ativos para operações contínuas

## Funcionalidades

### Sincronização
- ✅ Automática no primeiro deploy (últimos 3 meses)
- ✅ Diária às 2:00 AM (últimos 7 dias)
- ✅ Manual via comando Docker
- ✅ UPSERT para evitar duplicações
- ✅ Filtro selectionType=I aplicado automaticamente

### API REST
- ✅ Endpoints RESTful para income e outcome
- ✅ Documentação automática (Swagger UI)
- ✅ Filtros flexíveis e combináveis
- ✅ Paginação inteligente (máximo 1000 registros)
- ✅ Busca por ID único
- ✅ CORS habilitado para consumo externo
- ✅ Validação automática de parâmetros

### Visualização
- ✅ CloudBeaver interface web
- ✅ Queries SQL direto no navegador
- ✅ Exportação de dados (CSV/Excel)
- ✅ Visualização de tabelas e relacionamentos

### Monitoramento
- ✅ Logs de sincronização
- ✅ Logs do cron job
- ✅ Healthcheck dos containers
- ✅ Contadores de registros sincronizados
- ✅ API health check endpoint