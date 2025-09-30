# Google Apps Script - Sienge Financial Connector
## Arquitetura Completa e Documentação Técnica

**Versão**: 1.0
**Última Atualização**: 2025-01-30
**Tipo**: Looker Studio Community Connector
**Linguagem**: Google Apps Script (JavaScript ES5)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Componentes Principais](#componentes-principais)
4. [Fluxo de Dados Completo](#fluxo-de-dados-completo)
5. [Schema e Campos](#schema-e-campos)
6. [Processamento de Datas](#processamento-de-datas)
7. [Sistema de Cache](#sistema-de-cache)
8. [Tratamento de Erros](#tratamento-de-erros)
9. [Configuração e Deployment](#configuração-e-deployment)
10. [Referência de APIs](#referência-de-apis)

---

## 1. Visão Geral

### 1.1 Propósito

O Sienge Financial Connector é um **Community Connector para Looker Studio** que integra dados financeiros do sistema Sienge (Contas a Receber e Contas a Pagar) diretamente em dashboards e relatórios do Looker Studio.

### 1.2 Características Principais

- ✅ **Integração Unificada**: Combina Income (Contas a Receber) e Outcome (Contas a Pagar) em um único dataset
- ✅ **80+ Campos**: Schema rico com dimensões e métricas para análise financeira completa
- ✅ **Paginação Automática**: Busca eficiente de grandes volumes de dados
- ✅ **Cache Inteligente**: Sistema de cache de 5 minutos para otimização de performance
- ✅ **Transformação de Dados**: Unificação e normalização automática de campos
- ✅ **Zero Configuração**: URL da API fixa, apenas checkboxes para o usuário

### 1.3 Tecnologias Utilizadas

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Google Apps Script | N/A | Runtime e plataforma de execução |
| Looker Studio API | Community Connector V1 | Interface com Looker Studio |
| JavaScript | ES5 | Linguagem de programação |
| REST API | HTTP/JSON | Comunicação com backend |

---

## 2. Arquitetura do Sistema

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LOOKER STUDIO                                   │
│                      (Interface do Usuário)                              │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ getData(), getSchema(), getConfig()
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  SiengeFinancialConnector.gs                             │
│                  (Orquestrador Principal)                                │
│  • getAuthType() - Define autenticação (NONE)                           │
│  • getConfig() - Interface de configuração                              │
│  • getSchema() - Definição de campos                                    │
│  • getData() - Pipeline completo de dados                               │
└────────────┬──────────────────────────┬─────────────────────────────────┘
             │                          │
             │ Validação               │ Schema
             ▼                          ▼
┌────────────────────────┐   ┌────────────────────────┐
│   SchemaBuilder.gs     │   │   DataFetcher.gs       │
│   (Schema de Campos)   │   │   (Busca de Dados)     │
│                        │   │                        │
│ • getFields()          │   │ • fetchAllData()       │
│ • 80+ campos           │   │ • fetchIncomeData()    │
│ • 7 grupos semânticos  │   │ • fetchOutcomeData()   │
└────────────────────────┘   │ • Paginação            │
                              └──────────┬─────────────┘
                                         │
                                         │ cachedFetch()
                                         ▼
                              ┌────────────────────────┐
                              │     Utils.gs           │
                              │  (Utilitários)         │
                              │                        │
                              │ • cachedFetch()        │
                              │ • formatDate()         │
                              │ • formatDateTime()     │
                              │ • Cache Management     │
                              │ • Error Handling       │
                              └──────────┬─────────────┘
                                         │
                                         │ UrlFetchApp.fetch()
                                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SIENGE API (Backend)                              │
│                  https://sienge-app.hvlihi.easypanel.host               │
│                                                                          │
│  GET /api/income?limit=1000&offset=0                                    │
│  GET /api/outcome?limit=1000&offset=0                                   │
└─────────────────────────────────────────────────────────────────────────┘
             │
             │ JSON Response
             ▼
┌────────────────────────┐
│  DataTransformer.gs    │
│  (Transformação)       │
│                        │
│ • transformRecords()   │
│ • getFieldValue()      │
│ • Unificação Income/   │
│   Outcome              │
│ • Cálculo de métricas  │
└────────────────────────┘
```

### 2.2 Padrão de Arquitetura

O sistema segue o padrão **Pipeline de Dados** com separação clara de responsabilidades:

1. **Interface Layer** (`SiengeFinancialConnector.gs`)
   - Implementa funções obrigatórias do Community Connector
   - Valida configurações do usuário
   - Orquestra o pipeline de dados

2. **Data Access Layer** (`DataFetcher.gs`)
   - Gerencia comunicação com API
   - Implementa paginação automática
   - Unifica dados de múltiplos endpoints

3. **Transformation Layer** (`DataTransformer.gs`)
   - Normaliza estruturas de dados
   - Calcula métricas derivadas
   - Mapeia campos para schema unificado

4. **Schema Layer** (`SchemaBuilder.gs`)
   - Define estrutura de campos
   - Organiza campos em grupos semânticos
   - Configura tipos e agregações

5. **Utility Layer** (`Utils.gs`)
   - Funções auxiliares reutilizáveis
   - Gerenciamento de cache
   - Formatação e validação de dados

6. **Configuration Layer** (`Config.gs`)
   - Constantes centralizadas
   - Mensagens de erro
   - Configurações globais

---

## 3. Componentes Principais

### 3.1 Config.gs

**Responsabilidade**: Configurações centralizadas e constantes

#### Constantes Principais

```javascript
var CONFIG = {
  // API Configuration
  API_URL: 'https://sienge-app.hvlihi.easypanel.host',
  MAX_RECORDS_PER_REQUEST: 1000,

  // Cache
  CACHE_DURATION_SECONDS: 300, // 5 minutos

  // Record Types
  RECORD_TYPE_INCOME: 'income',
  RECORD_TYPE_OUTCOME: 'outcome',

  // Display Names
  RECORD_TYPE_INCOME_DISPLAY: 'Contas a Receber',
  RECORD_TYPE_OUTCOME_DISPLAY: 'Contas a Pagar',

  // Endpoints
  INCOME_ENDPOINT: '/api/income',
  OUTCOME_ENDPOINT: '/api/outcome',

  // Payment Status
  STATUS_PAID: 'Pago',
  STATUS_PARTIAL: 'Parcial',
  STATUS_PENDING: 'Pendente'
};
```

#### Sistema de Logging

```javascript
var LOGGING = {
  enabled: true,

  log: function(message, data) { /* ... */ },
  error: function(message, error) { /* ... */ },
  warn: function(message) { /* ... */ },
  info: function(message) { /* ... */ }
};
```

#### Mensagens de Erro (PT-BR)

```javascript
var ERROR_MESSAGES = {
  MISSING_API_URL: 'URL da API não configurada...',
  INVALID_API_URL: 'URL da API inválida...',
  API_CONNECTION_FAILED: 'Falha ao conectar com a API...',
  NO_DATA_RETURNED: 'Nenhum dado retornado pela API.',
  INVALID_JSON_RESPONSE: 'Resposta inválida da API...',
  // ...
};
```

---

### 3.2 SiengeFinancialConnector.gs

**Responsabilidade**: Interface principal com Looker Studio

#### Funções Obrigatórias do Community Connector

##### 3.2.1 getAuthType()
```javascript
function getAuthType() {
  return cc.newAuthTypeResponse()
    .setAuthType(cc.AuthType.NONE)
    .build();
}
```
- **Propósito**: Define que a API é pública (sem autenticação)
- **Retorno**: Configuração de autenticação NONE

##### 3.2.2 getConfig()
```javascript
function getConfig(request) {
  var config = cc.getConfig();

  // Checkbox: Incluir Contas a Receber
  config.newCheckbox()
    .setId('includeIncome')
    .setName('Incluir Contas a Receber')
    .setHelpText('Buscar dados de contas a receber')
    .setAllowOverride(true);

  // Checkbox: Incluir Contas a Pagar
  config.newCheckbox()
    .setId('includeOutcome')
    .setName('Incluir Contas a Pagar')
    .setHelpText('Buscar dados de contas a pagar')
    .setAllowOverride(true);

  // Checkbox: Mostrar IDs
  config.newCheckbox()
    .setId('showIds')
    .setName('Mostrar campos de ID')
    .setHelpText('Exibir campos técnicos de ID no relatório')
    .setAllowOverride(true);

  config.setDateRangeRequired(false);

  return config.build();
}
```

**Interface de Configuração**:
- ✅ **3 checkboxes simples** (includeIncome, includeOutcome, showIds)
- ✅ **Sem campos de texto** (URL da API é fixa)
- ✅ **allowOverride(true)** - Permite sobrescrever por report

##### 3.2.3 getSchema()
```javascript
function getSchema(request) {
  validateConfiguration(request.configParams);

  var showIds = request.configParams.showIds === 'true';

  return { schema: getFields(showIds).build() };
}
```

**Fluxo**:
1. Valida configuração do usuário
2. Determina se deve mostrar campos de ID
3. Chama `getFields()` do SchemaBuilder
4. Retorna schema construído

##### 3.2.4 getData()
```javascript
function getData(request) {
  try {
    // ETAPA 1: Validação
    validateConfiguration(request.configParams);
    validateRequestedFields(request.fields);

    // ETAPA 2: Buscar dados
    var allRecords = fetchAllData(request.configParams, null);

    // ETAPA 3: Transformar
    var requestedFieldIds = request.fields.map(function(f) { return f.name; });
    var showIds = request.configParams.showIds === 'true';
    var requestedSchema = getFields(showIds).forIds(requestedFieldIds).build();

    var rows = transformRecords(allRecords, request.fields, true);

    // ETAPA 4: Retornar
    return {
      schema: requestedSchema,
      rows: rows
    };
  } catch (e) {
    return createUserError('Erro ao buscar dados: ' + e.message, e.toString());
  }
}
```

**Pipeline de Dados**:
1. **Validação**: Verifica configuração e campos solicitados
2. **Busca**: Obtém dados da API via `fetchAllData()`
3. **Transformação**: Converte para formato Looker via `transformRecords()`
4. **Retorno**: Schema + Rows no formato esperado

---

### 3.3 DataFetcher.gs

**Responsabilidade**: Busca e unificação de dados da API

#### 3.3.1 fetchAllData()
```javascript
function fetchAllData(configParams, requestFilters) {
  var includeIncome = configParams.includeIncome !== 'false';
  var includeOutcome = configParams.includeOutcome !== 'false';

  var allRecords = [];

  // Buscar Income
  if (includeIncome) {
    var incomeRecords = fetchIncomeData(apiUrl, requestFilters);
    incomeRecords.forEach(function(record) {
      record._recordType = CONFIG.RECORD_TYPE_INCOME;
    });
    allRecords = allRecords.concat(incomeRecords);
  }

  // Buscar Outcome
  if (includeOutcome) {
    var outcomeRecords = fetchOutcomeData(apiUrl, requestFilters);
    outcomeRecords.forEach(function(record) {
      record._recordType = CONFIG.RECORD_TYPE_OUTCOME;
    });
    allRecords = allRecords.concat(outcomeRecords);
  }

  return allRecords;
}
```

**Características**:
- ✅ Busca condicional baseada em checkboxes
- ✅ Adiciona `_recordType` para identificar origem
- ✅ Concatena registros de ambos os endpoints
- ✅ Tratamento de erro independente por endpoint

#### 3.3.2 fetchAllPaginated()
```javascript
function fetchAllPaginated(baseUrl, filters) {
  var allData = [];
  var offset = 0;
  var limit = CONFIG.MAX_RECORDS_PER_REQUEST; // 1000
  var hasMore = true;
  var maxIterations = 100;

  while (hasMore && iteration < maxIterations) {
    var url = buildQueryUrl(baseUrl, filters, limit, offset);
    var response = cachedFetch(url);

    validateApiResponse(response, url);

    if (response.data && response.data.length > 0) {
      allData = allData.concat(response.data);
      offset += limit;
      hasMore = response.count === limit;
    } else {
      hasMore = false;
    }
  }

  return allData;
}
```

**Lógica de Paginação**:
1. **Iterativo**: Loop while com controle de offset
2. **Seguro**: maxIterations=100 previne loops infinitos
3. **Eficiente**: Busca 1000 registros por vez
4. **Inteligente**: Para quando `response.count < limit`

#### 3.3.3 buildQueryUrl()
```javascript
function buildQueryUrl(baseUrl, filters, limit, offset) {
  var params = ['limit=' + limit, 'offset=' + offset];
  return baseUrl + '?' + params.join('&');
}
```

**Nota Importante**:
- ⚠️ **Filters são ignorados** - Busca TODOS os dados
- ✅ **Looker Studio faz filtragem client-side**
- ✅ **Simplifica lógica e evita bugs de query**

---

### 3.4 DataTransformer.gs

**Responsabilidade**: Transformação e unificação de dados

#### 3.4.1 transformRecords()
```javascript
function transformRecords(records, requestedFields, calculateMetrics) {
  return records.map(function(record) {
    var isIncome = record._recordType === CONFIG.RECORD_TYPE_INCOME;
    return transformSingleRecord(record, requestedFields, isIncome, calculateMetrics);
  });
}
```

#### 3.4.2 getFieldValue() - Lógica Central
```javascript
function getFieldValue(record, fieldName, isIncome, calculateMetrics) {
  // GRUPO 1: IDENTIFICAÇÃO
  if (fieldName === 'record_type') {
    return isIncome ? 'Contas a Receber' : 'Contas a Pagar';
  }

  // GRUPO 2: EMPRESA (campos comuns)
  var empresaFields = ['company_name', 'project_name', ...];
  if (empresaFields.indexOf(fieldName) !== -1) {
    return safeValue(record[fieldName], '');
  }

  // GRUPO 3: CLIENTE (Income only)
  if (fieldName === 'cliente_nome') {
    return isIncome ? safeValue(record.client_name, '') : '';
  }

  // GRUPO 4: CREDOR (Outcome only)
  if (fieldName === 'credor_nome') {
    return !isIncome ? safeValue(record.creditor_name, '') : '';
  }

  // GRUPO 5: DATAS (campos comuns)
  var dateFields = ['due_date', 'issue_date', 'bill_date', ...];
  if (dateFields.indexOf(fieldName) !== -1) {
    return formatDate(record[fieldName]); // ⚠️ PONTO DE ATENÇÃO
  }

  // GRUPO 6: VALORES FINANCEIROS (campos comuns)
  var financeFields = ['original_amount', 'balance_amount', ...];
  if (financeFields.indexOf(fieldName) !== -1) {
    return toNumber(record[fieldName], 0);
  }

  // GRUPO 7: MOVIMENTAÇÕES (calculados)
  if (fieldName === 'total_movimentacoes') {
    var movements = isIncome ? record.receipts : record.payments;
    return countJsonbArray(movements);
  }

  // ... (outros grupos)

  return '';
}
```

**Estratégia de Unificação**:
- ✅ **Campos Comuns** → Mesma coluna (ex: company_name)
- ✅ **Campos Específicos** → Prefixo (ex: income_*, outcome_*)
- ✅ **Campos Calculados** → Lógica condicional
- ✅ **Valores Default** → String vazia ou 0 baseado no tipo

---

### 3.5 SchemaBuilder.gs

**Responsabilidade**: Definição de estrutura de campos

#### 3.5.1 Estrutura de Grupos

```
80 Campos totais organizados em 7 grupos:

┌─────────────────────────────────────────────────────┐
│ GRUPO 1: IDs (16 campos) - OPCIONAL                │
│ ─────────────────────────────────────────────────── │
│ • id, installment_id, bill_id                       │
│ • company_id, project_id, business_area_id          │
│ • cliente_id, credor_id                             │
│ • document_identification_id, origin_id             │
│ • indexer_id, income_bearer_id                      │
│ • holding_id, subsidiary_id, group_company_id       │
│ • business_type_id                                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ GRUPO 2: BÁSICOS (7 campos)                        │
│ ─────────────────────────────────────────────────── │
│ • record_type (Contas a Receber / Contas a Pagar)  │
│ • sync_date                                         │
│ • due_date ⚠️                                       │
│ • issue_date                                        │
│ • bill_date                                         │
│ • installment_base_date                             │
│ • data_ultima_movimentacao                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ GRUPO 3: EMPRESA (7 campos)                        │
│ ─────────────────────────────────────────────────── │
│ • company_name, business_area_name                  │
│ • project_name, group_company_name                  │
│ • holding_name, subsidiary_name                     │
│ • business_type_name                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ GRUPO 4: PARTES (4 campos)                         │
│ ─────────────────────────────────────────────────── │
│ • cliente_nome (apenas Income)                      │
│ • credor_nome (apenas Outcome)                      │
│ • document_identification_name                      │
│ • document_number                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ GRUPO 5: FINANCEIRO (11 campos)                    │
│ ─────────────────────────────────────────────────── │
│ Dimensões:                                          │
│ • status_parcela, situacao_pagamento                │
│ • document_forecast, indexer_name                   │
│                                                     │
│ Métricas:                                           │
│ • original_amount, discount_amount                  │
│ • tax_amount, balance_amount                        │
│ • corrected_balance_amount                          │
│ • total_movimentacoes, valor_liquido                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ GRUPO 6: CONTAS A RECEBER (13 campos)              │
│ ─────────────────────────────────────────────────── │
│ • income_periodicity_type                           │
│ • income_interest_type, income_correction_type      │
│ • income_interest_base_date                         │
│ • income_defaulter_situation, income_sub_judicie    │
│ • income_main_unit, income_installment_number       │
│ • income_payment_term_id                            │
│ • income_payment_term_description                   │
│ • income_embedded_interest_amount (métrica)         │
│ • income_interest_rate (métrica)                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ GRUPO 7: CONTAS A PAGAR (9 campos)                 │
│ ─────────────────────────────────────────────────── │
│ • outcome_forecast_document                         │
│ • outcome_consistency_status                        │
│ • outcome_authorization_status                      │
│ • outcome_registered_user_id                        │
│ • outcome_registered_by                             │
│ • outcome_registered_date                           │
│ • outcome_total_departamentos (métrica)             │
│ • outcome_total_edificacoes (métrica)               │
│ • outcome_total_autorizacoes (métrica)              │
└─────────────────────────────────────────────────────┘
```

#### 3.5.2 Tipos de Campos Looker Studio

```javascript
fields.newDimension()
  .setId('due_date')
  .setName('Data de Vencimento')
  .setType(types.YEAR_MONTH_DAY)  // ⚠️ Formato: YYYYMMDD
  .setGroup('Basicos');

fields.newMetric()
  .setId('original_amount')
  .setName('Valor Original')
  .setType(types.CURRENCY_BRL)
  .setAggregation(aggregations.SUM)
  .setGroup('Financeiro');
```

**Tipos Utilizados**:
- `YEAR_MONTH_DAY` - Data no formato YYYYMMDD (string)
- `YEAR_MONTH_DAY_HOUR` - DateTime no formato YYYYMMDDHH (string)
- `TEXT` - Strings
- `NUMBER` - Números inteiros
- `CURRENCY_BRL` - Valores monetários em R$
- `PERCENT` - Percentuais

---

### 3.6 Utils.gs

**Responsabilidade**: Funções auxiliares e utilitárias

#### 3.6.1 Formatação de Datas

##### formatDate() - ⚠️ PONTO CRÍTICO
```javascript
function formatDate(dateString) {
  if (!dateString) return '';

  try {
    var date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return '';
    }

    var year = date.getFullYear();      // ⚠️ USA TIMEZONE LOCAL
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);

    return year + month + day;
  } catch (e) {
    LOGGING.warn('Error formatting date: ' + dateString);
    return '';
  }
}
```

**⚠️ PROBLEMA IDENTIFICADO**: Veja seção [6. Processamento de Datas](#6-processamento-de-datas) para detalhes.

##### formatDateTime()
```javascript
function formatDateTime(dateString) {
  // Similar ao formatDate(), mas inclui hora
  // ⚠️ MESMO PROBLEMA de timezone
}
```

#### 3.6.2 Sistema de Cache

##### cachedFetch()
```javascript
function cachedFetch(url) {
  var cache = CacheService.getUserCache();
  var cacheKey = 'api_' + Utilities.base64Encode(url);

  // Tenta pegar do cache
  var cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Busca da API
  var response = UrlFetchApp.fetch(url, options);
  var data = JSON.parse(response.getContentText());

  // Salva no cache (5 minutos)
  cache.put(cacheKey, JSON.stringify(data), CONFIG.CACHE_DURATION_SECONDS);

  return data;
}
```

**Características do Cache**:
- ✅ **Cache por usuário** (CacheService.getUserCache())
- ✅ **TTL de 5 minutos** (CONFIG.CACHE_DURATION_SECONDS)
- ✅ **Chave baseada em URL** (Base64 encode)
- ✅ **Parsing JSON automático**
- ✅ **Fallback gracioso** se cache falhar

#### 3.6.3 Manipulação de Arrays JSONB

```javascript
function sumJsonbArray(jsonbArray, field) {
  // Soma valores de um campo específico
  // Ex: sumJsonbArray(payments, 'netAmount')
}

function countJsonbArray(jsonbArray) {
  // Conta elementos em array
}

function getLastDate(jsonbArray, field) {
  // Retorna data mais recente
  // Ex: getLastDate(payments, 'paymentDate')
}
```

#### 3.6.4 Validação de Dados

```javascript
function safeValue(value, defaultValue) {
  return (value === null || value === undefined || value === '')
    ? (defaultValue !== undefined ? defaultValue : '')
    : value;
}

function toNumber(value, defaultValue) {
  return isValidNumber(value)
    ? parseFloat(value)
    : (defaultValue !== undefined ? defaultValue : 0);
}

function isValidNumber(value) {
  return value !== null && value !== undefined && !isNaN(parseFloat(value));
}
```

---

## 4. Fluxo de Dados Completo

### 4.1 Fluxo de Execução - getData()

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOOKER STUDIO REQUEST                         │
│  request = {                                                     │
│    fields: [{name: 'due_date'}, {name: 'original_amount'}],     │
│    configParams: {includeIncome: true, includeOutcome: true}    │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 1: VALIDAÇÃO                                               │
│ validateConfiguration(request.configParams)                      │
│ • Verifica se pelo menos um tipo está selecionado               │
│ • Lança erro se ambos desabilitados                             │
│                                                                  │
│ validateRequestedFields(request.fields)                          │
│ • Verifica se fields não está vazio                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 2: BUSCA DE DADOS                                          │
│ fetchAllData(request.configParams, null)                         │
│   │                                                              │
│   ├─► fetchIncomeData()                                          │
│   │     └─► fetchAllPaginated('/api/income')                    │
│   │           ├─► GET /api/income?limit=1000&offset=0           │
│   │           ├─► GET /api/income?limit=1000&offset=1000        │
│   │           └─► ... (até response.count < 1000)               │
│   │                                                              │
│   └─► fetchOutcomeData()                                         │
│         └─► fetchAllPaginated('/api/outcome')                   │
│               ├─► GET /api/outcome?limit=1000&offset=0          │
│               └─► ... (paginação automática)                    │
│                                                                  │
│ allRecords = [                                                   │
│   {_recordType: 'income', due_date: '2025-01-15T00:00:00Z', ...},│
│   {_recordType: 'outcome', due_date: '2025-02-20T00:00:00Z', ...}│
│ ]                                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 3: TRANSFORMAÇÃO                                           │
│ transformRecords(allRecords, request.fields, calculateMetrics)   │
│   │                                                              │
│   └─► Para cada record:                                         │
│       transformSingleRecord(record, request.fields, isIncome)    │
│         │                                                        │
│         └─► Para cada field solicitado:                         │
│             getFieldValue(record, 'due_date', isIncome, true)    │
│               │                                                  │
│               └─► if (fieldName === 'due_date'):                │
│                   return formatDate(record['due_date'])          │
│                     │                                            │
│                     └─► Utils.formatDate('2025-01-15T00:00:00Z')│
│                         Input:  "2025-01-15T00:00:00Z"          │
│                         Output: "20250115"  ⚠️                   │
│                                                                  │
│ rows = [                                                         │
│   {values: ["20250115", 5000.00]},                              │
│   {values: ["20250220", 3000.00]}                               │
│ ]                                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 4: CONSTRUÇÃO DO SCHEMA                                    │
│ requestedSchema = getFields(showIds).forIds(['due_date', ...])  │
│                                                                  │
│ schema = [                                                       │
│   {name: 'due_date', dataType: 'YEAR_MONTH_DAY'},              │
│   {name: 'original_amount', dataType: 'CURRENCY_BRL'}          │
│ ]                                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 5: RETORNO PARA LOOKER STUDIO                              │
│ return {                                                         │
│   schema: requestedSchema,                                       │
│   rows: rows                                                     │
│ }                                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOOKER STUDIO RENDERING                       │
│ • Processa dados no formato recebido                            │
│ • Aplica filtros client-side                                    │
│ • Renderiza visualizações                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Fluxo de Cache

```
Request → cachedFetch(url)
            │
            ├─► Cache Hit?
            │   YES → Parse JSON → Return
            │   NO  ↓
            │
            └─► UrlFetchApp.fetch(url)
                  │
                  └─► Parse Response
                        │
                        ├─► Save to Cache (5min TTL)
                        └─► Return Data
```

---

## 5. Schema e Campos

### 5.1 Categorização de Campos

#### Dimensões (53 campos)
- **IDs** (16): Identificadores técnicos (opcional)
- **Básicos** (7): Tipo, datas principais
- **Empresa** (7): Hierarquia organizacional
- **Partes** (4): Cliente/Credor, documentos
- **Financeiro** (4): Status, indexador
- **Income** (11): Específicos de Contas a Receber
- **Outcome** (6): Específicos de Contas a Pagar

#### Métricas (12 campos)
- **Financeiro** (7): Valores, saldos, movimentações
- **Income** (2): Juros embutidos, taxa de juros
- **Outcome** (3): Qtd. departamentos, edificações, autorizações

### 5.2 Campos Calculados

#### total_movimentacoes
```javascript
var movements = isIncome ? record.receipts : record.payments;
return countJsonbArray(movements);
```
Conta número de recebimentos/pagamentos na parcela.

#### valor_liquido
```javascript
var movements = isIncome ? record.receipts : record.payments;
return sumJsonbArray(movements, 'netAmount');
```
Soma valores líquidos de todos os movimentos.

#### data_ultima_movimentacao
```javascript
var movements = isIncome ? record.receipts : record.payments;
return getLastDate(movements, 'paymentDate');
```
Data do último recebimento/pagamento.

#### situacao_pagamento
```javascript
return calculatePaymentStatus(record, isIncome);
```
Calcula status baseado em:
- Sem movimentos → "Pendente"
- Saldo zerado → "Pago"
- Saldo parcial → "Parcial"

---

## 6. Processamento de Datas

### 6.1 Campos de Data no Sistema

| Campo | Tipo | Fonte | Criticidade |
|-------|------|-------|-------------|
| due_date | YEAR_MONTH_DAY | API | 🔴 CRÍTICO |
| issue_date | YEAR_MONTH_DAY | API | 🟡 IMPORTANTE |
| bill_date | YEAR_MONTH_DAY | API | 🟡 IMPORTANTE |
| installment_base_date | YEAR_MONTH_DAY | API | 🟡 IMPORTANTE |
| sync_date | YEAR_MONTH_DAY_HOUR | API | 🟢 INFO |
| income_interest_base_date | YEAR_MONTH_DAY | API (Income) | 🟡 IMPORTANTE |
| outcome_registered_date | YEAR_MONTH_DAY_HOUR | API (Outcome) | 🟢 INFO |
| data_ultima_movimentacao | YEAR_MONTH_DAY | Calculado | 🟡 IMPORTANTE |

### 6.2 Fluxo de Processamento de Datas

```
┌─────────────────────────────────────────────────────────────────┐
│                      API RESPONSE                                │
│  {                                                               │
│    "due_date": "2025-01-15T00:00:00Z"   ← ISO 8601, UTC        │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│             DataTransformer.getFieldValue()                      │
│  if (fieldName === 'due_date') {                                │
│    return formatDate(record['due_date']);                       │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                Utils.formatDate()                                │
│  Input:  "2025-01-15T00:00:00Z"                                 │
│    │                                                             │
│    ▼                                                             │
│  var date = new Date("2025-01-15T00:00:00Z");                  │
│  // Date object criado em UTC                                   │
│    │                                                             │
│    ▼                                                             │
│  var year = date.getFullYear();     // ⚠️ PROBLEMA!             │
│  var month = date.getMonth() + 1;   // ⚠️ USA TIMEZONE LOCAL!   │
│  var day = date.getDate();          // ⚠️                       │
│    │                                                             │
│    ▼                                                             │
│  return "20250115" ou "20250114"?   // Depende do timezone!     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOOKER STUDIO                                 │
│  Recebe: "20250114" (errado para UTC-3)                         │
│  Esperado: "20250115"                                           │
│  Δ = -1 dia  ⚠️ ERRO CRÍTICO                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Problema Identificado

**⚠️ BUG CRÍTICO: Conversão de Timezone**

**Arquivo**: `Utils.gs`, linhas 65-85
**Função**: `formatDate()`

**Causa Raiz**:
```javascript
var year = date.getFullYear();      // ❌ USA TIMEZONE LOCAL
var month = date.getMonth() + 1;    // ❌ USA TIMEZONE LOCAL
var day = date.getDate();           // ❌ USA TIMEZONE LOCAL
```

**Deveria ser**:
```javascript
var year = date.getUTCFullYear();   // ✅ USA TIMEZONE UTC
var month = date.getUTCMonth() + 1; // ✅ USA TIMEZONE UTC
var day = date.getUTCDate();        // ✅ USA TIMEZONE UTC
```

### 6.4 Impacto do Bug

#### Cenários de Erro

| Timezone do Script | API Date (UTC) | Conversão Local | Output | Esperado | Erro |
|-------------------|----------------|-----------------|--------|----------|------|
| America/Sao_Paulo (UTC-3) | 2025-01-15 00:00 UTC | 2025-01-14 21:00 | 20250114 | 20250115 | -1 dia |
| America/New_York (UTC-5) | 2025-01-15 00:00 UTC | 2025-01-14 19:00 | 20250114 | 20250115 | -1 dia |
| Europe/London (UTC+0) | 2025-01-15 00:00 UTC | 2025-01-15 00:00 | 20250115 | 20250115 | ✅ OK |
| Asia/Tokyo (UTC+9) | 2025-01-15 00:00 UTC | 2025-01-15 09:00 | 20250115 | 20250115 | ✅ OK |

**Para usuários brasileiros (UTC-3)**: Datas aparecem como DIA ANTERIOR!

#### Campos Afetados
1. ✅ `due_date` - **CRÍTICO** (data de vencimento errada!)
2. ✅ `issue_date` - Data de emissão errada
3. ✅ `bill_date` - Data da conta errada
4. ✅ `installment_base_date` - Data base da parcela errada
5. ✅ `data_ultima_movimentacao` - Última movimentação errada
6. ✅ `sync_date` - Sincronização errada (formatDateTime)
7. ✅ `outcome_registered_date` - Data de cadastro errada (formatDateTime)

**Total**: 7 campos de data afetados pelo bug!

### 6.5 Impacto no Negócio

#### Contas a Pagar
- ❌ Relatórios de vencimento incorretos
- ❌ Risco de pagamentos atrasados (data errada = multa/juros)
- ❌ Projeção de fluxo de caixa comprometida
- ❌ Análise de aging report incorreta

#### Contas a Receber
- ❌ Inadimplência calculada incorretamente
- ❌ Análise de recebimentos futuros errada
- ❌ DSO (Days Sales Outstanding) incorreto
- ❌ Previsões de fluxo de caixa comprometidas

#### Impacto Geral
- 🔴 **Gravidade**: CRÍTICA
- 🔴 **Prevalência**: Afeta todos os usuários em timezones com offset negativo (UTC-3 a UTC-12)
- 🔴 **Detecção**: Difícil (erro silencioso, -1 dia pode passar despercebido)
- 🔴 **Correção**: Simples (usar métodos UTC)

---

## 7. Sistema de Cache

### 7.1 Implementação

**Serviço**: `CacheService.getUserCache()`
**Duração**: 300 segundos (5 minutos)
**Escopo**: Por usuário

### 7.2 Estratégia de Chave

```javascript
var cacheKey = 'api_' + Utilities.base64Encode(url);
```

**Exemplo**:
- URL: `https://sienge-app.hvlihi.easypanel.host/api/income?limit=1000&offset=0`
- Key: `api_aHR0cHM6Ly9zaWVuZ2UtYXBwLmh2bGloaS5l...`

### 7.3 Vantagens

✅ **Performance**: Reduz chamadas à API
✅ **Quota Management**: Economiza quota do UrlFetchApp
✅ **User Experience**: Respostas mais rápidas
✅ **Cost**: Reduz carga no backend

### 7.4 Considerações

⚠️ **Staleness**: Dados podem ficar desatualizados por até 5 minutos
⚠️ **Inconsistency**: Usuários diferentes podem ver dados diferentes
⚠️ **Memory Limit**: Cache tem limite de tamanho (pode falhar em datasets grandes)

### 7.5 Limpeza de Cache

```javascript
function clearCache() {
  var cache = CacheService.getUserCache();
  cache.removeAll(cache.getKeys());
  LOGGING.info('Cache cleared successfully');
}
```

**Quando limpar**:
- Após correção de bugs de dados
- Quando dados parecem desatualizados
- Em troubleshooting

---

## 8. Tratamento de Erros

### 8.1 Hierarquia de Erros

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIPOS DE ERROS                                │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────┐
│  1. Erros de Configuração │
│  ─────────────────────────│
│  • Validação de checkboxes│
│  • Campos obrigatórios    │
│  Handler: createUserError()│
└───────────────────────────┘

┌───────────────────────────┐
│  2. Erros de Comunicação  │
│  ─────────────────────────│
│  • HTTP errors (4xx, 5xx) │
│  • Timeout                │
│  • Network failures       │
│  Handler: handleFetchError()│
└───────────────────────────┘

┌───────────────────────────┐
│  3. Erros de Dados        │
│  ─────────────────────────│
│  • JSON inválido          │
│  • Estrutura inesperada   │
│  • Campos faltando        │
│  Handler: validateApiResponse()│
└───────────────────────────┘

┌───────────────────────────┐
│  4. Erros de Transformação│
│  ─────────────────────────│
│  • Datas inválidas        │
│  • Números inválidos      │
│  • Campos não reconhecidos│
│  Handler: safeValue(), toNumber()│
└───────────────────────────┘
```

### 8.2 Funções de Error Handling

#### createUserError()
```javascript
function createUserError(message, details) {
  LOGGING.error(message, details);

  return cc.newUserError()
    .setText(message)           // Mensagem amigável (PT-BR)
    .setDebugText(details)      // Detalhes técnicos
    .throwException();
}
```

**Uso**: Erros exibidos ao usuário no Looker Studio

#### handleFetchError()
```javascript
function handleFetchError(error, endpoint) {
  var message = ERROR_MESSAGES.API_CONNECTION_FAILED;

  if (error.message && error.message.indexOf('HTTP') !== -1) {
    message = 'Erro ao acessar API: ' + error.message;
  }

  return createUserError(message, 'Endpoint: ' + endpoint + ', Error: ' + error.toString());
}
```

**Uso**: Erros de comunicação com API

#### validateApiResponse()
```javascript
function validateApiResponse(response, endpoint) {
  if (!response) {
    throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED + ' (' + endpoint + ')');
  }

  if (typeof response !== 'object') {
    throw new Error(ERROR_MESSAGES.INVALID_JSON_RESPONSE + ' (' + endpoint + ')');
  }

  if (response.success === false) {
    throw new Error('API returned error: ' + (response.error || 'Unknown error'));
  }

  if (!response.data || !Array.isArray(response.data)) {
    throw new Error('Invalid response structure. Expected "data" array.');
  }

  return true;
}
```

**Uso**: Validação de estrutura de resposta da API

### 8.3 Mensagens de Erro (PT-BR)

```javascript
var ERROR_MESSAGES = {
  MISSING_API_URL: 'URL da API não configurada. Por favor, configure a URL da API.',
  INVALID_API_URL: 'URL da API inválida. Verifique o formato (ex: http://localhost:8000)',
  API_CONNECTION_FAILED: 'Falha ao conectar com a API. Verifique se o servidor está ativo.',
  NO_DATA_RETURNED: 'Nenhum dado retornado pela API.',
  INVALID_JSON_RESPONSE: 'Resposta inválida da API. Esperado JSON válido.',
  FETCH_TIMEOUT: 'Timeout ao buscar dados da API. Tente novamente.',
  UNKNOWN_ERROR: 'Erro desconhecido ao processar dados.'
};
```

### 8.4 Logging

```javascript
LOGGING.info('Normal operation log');
LOGGING.warn('Warning - potential issue');
LOGGING.error('Error occurred', errorObject);
```

**Onde ver logs**:
1. Google Apps Script Editor → Execuções
2. Ver → Registros (Ctrl+Enter)
3. Looker Studio → Inspector → Connector logs

---

## 9. Configuração e Deployment

### 9.1 Pré-requisitos

- ✅ Conta Google
- ✅ Acesso ao Google Apps Script
- ✅ Permissões no projeto do Google Cloud
- ✅ API backend acessível e funcionando

### 9.2 Estrutura de Arquivos

```
sienge-financial-connector/
├── Config.gs                    # Configurações e constantes
├── SiengeFinancialConnector.gs  # Interface Looker Studio
├── DataFetcher.gs               # Busca de dados
├── DataTransformer.gs           # Transformação de dados
├── SchemaBuilder.gs             # Definição de schema
├── Utils.gs                     # Funções utilitárias
└── TEST.gs                      # Testes (se existir)
```

### 9.3 Configuração do Script

#### Timezone
```
File → Project Properties → Info → Timezone
Recomendado: UTC (para evitar bugs de timezone)
```

#### Manifesto (appsscript.json)
```json
{
  "timeZone": "UTC",
  "dependencies": {
    "enabledAdvancedServices": []
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "dataStudio": {
    "name": "Sienge Financial Connector",
    "logoUrl": "https://...",
    "company": "...",
    "companyUrl": "https://...",
    "addOnUrl": "https://...",
    "supportUrl": "https://...",
    "description": "Conector para dados financeiros do Sienge",
    "sources": ["income", "outcome"]
  }
}
```

### 9.4 Deployment

1. **Deploy como Community Connector**:
   ```
   Publish → Deploy from manifest → Latest version
   ```

2. **Obter Deployment ID**:
   ```
   Deploy → Manage deployments → Copy ID
   ```

3. **Testar no Looker Studio**:
   ```
   Looker Studio → Create → Data Source → Community Connectors → Build your own
   Cole o Deployment ID
   ```

### 9.5 Versionamento

- **Development**: HEAD deployment (auto-atualiza)
- **Production**: Versioned deployment (ex: v1, v2, v3)

**Best Practice**: Sempre testar em HEAD antes de criar versão

---

## 10. Referência de APIs

### 10.1 API Backend Esperada

#### Endpoint: GET /api/income

**Request**:
```
GET https://sienge-app.hvlihi.easypanel.host/api/income?limit=1000&offset=0
```

**Response**:
```json
{
  "success": true,
  "count": 1000,
  "data": [
    {
      "id": "uuid-here",
      "company_id": 123,
      "company_name": "Empresa Exemplo",
      "project_id": 456,
      "project_name": "Projeto Exemplo",
      "client_id": 789,
      "client_name": "Cliente Exemplo",
      "bill_id": 1001,
      "installment_id": 1,
      "due_date": "2025-01-15T00:00:00Z",
      "issue_date": "2025-01-01T00:00:00Z",
      "original_amount": 5000.00,
      "balance_amount": 5000.00,
      "discount_amount": 0,
      "tax_amount": 0,
      "status_parcela": "A Receber",
      "receipts": [
        {
          "paymentDate": "2025-01-15T10:30:00Z",
          "netAmount": 5000.00
        }
      ],
      "sync_date": "2025-01-30T14:22:00Z",
      ...
    }
  ]
}
```

#### Endpoint: GET /api/outcome

**Request**:
```
GET https://sienge-app.hvlihi.easypanel.host/api/outcome?limit=1000&offset=0
```

**Response**: Similar ao `/api/income`, mas com campos específicos:
- `creditor_id`, `creditor_name` (ao invés de client_*)
- `payments` (ao invés de receipts)
- Campos outcome específicos (authorization_status, consistency_status, etc.)

### 10.2 Looker Studio Community Connector API

#### getAuthType()
**Retorno**:
```javascript
{
  type: 'NONE'
}
```

#### getConfig()
**Retorno**:
```javascript
{
  configParams: [
    {
      type: 'CHECKBOX',
      name: 'includeIncome',
      displayName: 'Incluir Contas a Receber',
      ...
    }
  ],
  dateRangeRequired: false
}
```

#### getSchema()
**Request**:
```javascript
{
  configParams: {
    includeIncome: true,
    includeOutcome: true,
    showIds: false
  }
}
```

**Retorno**:
```javascript
{
  schema: [
    {
      name: 'due_date',
      label: 'Data de Vencimento',
      dataType: 'YEAR_MONTH_DAY',
      semantics: {
        conceptType: 'DIMENSION'
      }
    },
    {
      name: 'original_amount',
      label: 'Valor Original',
      dataType: 'CURRENCY_BRL',
      semantics: {
        conceptType: 'METRIC',
        aggregationType: 'SUM'
      }
    }
  ]
}
```

#### getData()
**Request**:
```javascript
{
  configParams: {
    includeIncome: true,
    includeOutcome: true,
    showIds: false
  },
  fields: [
    {name: 'due_date'},
    {name: 'original_amount'}
  ]
}
```

**Retorno**:
```javascript
{
  schema: [...],
  rows: [
    {values: ['20250115', 5000.00]},
    {values: ['20250220', 3000.00]}
  ]
}
```

---

## 📌 Resumo Executivo

### Pontos Fortes ✅
1. Arquitetura modular e bem organizada
2. Separação clara de responsabilidades
3. Sistema de cache eficiente
4. Tratamento de erros robusto
5. Schema rico com 80+ campos
6. Unificação inteligente de Income/Outcome
7. Paginação automática para grandes datasets

### Pontos de Atenção ⚠️
1. **BUG CRÍTICO**: Conversão de timezone em formatDate()
2. Ausência de testes automatizados
3. Cache pode causar inconsistência temporária
4. Sem validação de ranges de datas
5. Logging poderia ser mais detalhado

### Prioridades de Melhoria
1. 🔴 **URGENTE**: Corrigir bug de timezone (usar UTC methods)
2. 🟡 **IMPORTANTE**: Adicionar testes unitários
3. 🟡 **IMPORTANTE**: Implementar validação de datas
4. 🟢 **DESEJÁVEL**: Melhorar logging e observabilidade
5. 🟢 **DESEJÁVEL**: Adicionar métricas de performance

---

**Fim da Documentação de Arquitetura**

Para informações sobre correção do bug de datas, veja: `due-date-error-analysis.md`
