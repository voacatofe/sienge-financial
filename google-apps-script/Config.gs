/**
 * Config.gs
 * Configurações e constantes do Conector Sienge Financial
 *
 * Este arquivo contém todas as configurações centralizadas do conector
 */

// ==========================================
// Community Connector Instance
// ==========================================
var cc = DataStudioApp.createCommunityConnector();

// ==========================================
// Constantes de Configuração
// ==========================================

var CONFIG = {
  // API Configuration (FIXED - não solicita ao usuário)
  API_URL: 'https://sienge-app.hvlihi.easypanel.host',
  MAX_RECORDS_PER_REQUEST: 1000,

  // Security Configuration
  REQUEST_TIMEOUT_SECONDS: 30, // Timeout de 30 segundos para requisições
  MAX_RETRIES: 2, // Máximo de tentativas em caso de falha
  VALIDATE_HTTPS: true, // Força validação de HTTPS

  // Cache Configuration
  // ✅ PERFORMANCE: Aumentado de 5min para 30min
  // Dados financeiros não mudam frequentemente, cache mais longo reduz chamadas de API
  CACHE_DURATION_SECONDS: 1800, // 30 minutos (era 300 = 5min)
  CACHE_MAX_SIZE_BYTES: 95000, // Limite de 95KB por item (limite do Apps Script é 100KB)

  // Record Types
  RECORD_TYPE_INCOME: 'income',
  RECORD_TYPE_OUTCOME: 'outcome',

  // Display Names
  RECORD_TYPE_INCOME_DISPLAY: 'Contas a Receber',
  RECORD_TYPE_OUTCOME_DISPLAY: 'Contas a Pagar',

  // API Endpoints
  INCOME_ENDPOINT: '/api/income',
  OUTCOME_ENDPOINT: '/api/outcome',

  // Field Prefixes
  PREFIX_INCOME: 'income_',
  PREFIX_OUTCOME: 'outcome_',

  // Payment Status
  STATUS_PAID: 'Pago',
  STATUS_PARTIAL: 'Parcial',
  STATUS_PENDING: 'Pendente',

  // Counterparty Types
  COUNTERPARTY_CLIENT: 'Cliente',
  COUNTERPARTY_SUPPLIER: 'Fornecedor'
};

// ==========================================
// Field Types (Data Studio)
// ==========================================

var FIELD_TYPES = cc.FieldType;
var AGGREGATION_TYPES = cc.AggregationType;

// ==========================================
// Error Messages (PT-BR)
// ==========================================

var ERROR_MESSAGES = {
  MISSING_API_URL: 'URL da API não configurada. Por favor, configure a URL da API.',
  INVALID_API_URL: 'URL da API inválida. Verifique o formato (ex: http://localhost:8000)',
  API_CONNECTION_FAILED: 'Falha ao conectar com a API. Verifique se o servidor está ativo.',
  NO_DATA_RETURNED: 'Nenhum dado retornado pela API.',
  INVALID_JSON_RESPONSE: 'Resposta inválida da API. Esperado JSON válido.',
  FETCH_TIMEOUT: 'Timeout ao buscar dados da API. Tente novamente.',
  UNKNOWN_ERROR: 'Erro desconhecido ao processar dados.'
};

// ==========================================
// Configuration Options
// ==========================================

/**
 * Opções disponíveis para o usuário configurar
 * SIMPLIFICADO: Apenas 2 checkboxes
 */
var USER_CONFIG_OPTIONS = {
  INCLUDE_INCOME: {
    id: 'includeIncome',
    name: 'Incluir Contas a Receber',
    helpText: 'Buscar dados de contas a receber',
    defaultValue: true
  },

  INCLUDE_OUTCOME: {
    id: 'includeOutcome',
    name: 'Incluir Contas a Pagar',
    helpText: 'Buscar dados de contas a pagar',
    defaultValue: true
  },

  SHOW_IDS: {
    id: 'showIds',
    name: 'Mostrar campos de ID',
    helpText: 'Exibir campos técnicos de ID no relatório (IDs de empresa, projeto, cliente, etc)',
    defaultValue: false
  }
};

// ==========================================
// Logging Configuration
// ==========================================

var LOGGING = {
  enabled: true,

  log: function(message, data) {
    if (this.enabled) {
      Logger.log('[Sienge Connector] ' + message);
      if (data) {
        Logger.log(JSON.stringify(data, null, 2));
      }
    }
  },

  error: function(message, error) {
    Logger.log('[ERROR] ' + message);
    if (error) {
      Logger.log('Error details: ' + error.toString());
    }
  },

  warn: function(message) {
    Logger.log('[WARNING] ' + message);
  },

  info: function(message) {
    if (this.enabled) {
      Logger.log('[INFO] ' + message);
    }
  }
};