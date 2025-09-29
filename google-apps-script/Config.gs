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
  // API Configuration
  DEFAULT_API_URL: 'http://localhost:8000',
  MAX_RECORDS_PER_REQUEST: 1000,

  // Cache Configuration
  CACHE_DURATION_SECONDS: 300, // 5 minutos

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
 */
var USER_CONFIG_OPTIONS = {
  API_URL: {
    id: 'apiUrl',
    name: 'URL da API',
    helpText: 'URL base da sua API Sienge Financial',
    placeholder: 'http://seu-servidor:8000',
    required: true
  },

  INCLUDE_INCOME: {
    id: 'includeIncome',
    name: 'Incluir Contas a Receber',
    helpText: 'Buscar dados de contas a receber da API',
    defaultValue: true
  },

  INCLUDE_OUTCOME: {
    id: 'includeOutcome',
    name: 'Incluir Contas a Pagar',
    helpText: 'Buscar dados de contas a pagar da API',
    defaultValue: true
  },

  CALCULATE_METRICS: {
    id: 'calculateMetrics',
    name: 'Calcular Métricas de Movimentações',
    helpText: 'Processar arrays JSONB para calcular totais de recebimentos/pagamentos (pode aumentar tempo de processamento)',
    defaultValue: true
  },

  INCLUDE_SPECIFIC_FIELDS: {
    id: 'includeSpecificFields',
    name: 'Incluir Campos Específicos',
    helpText: 'Incluir campos específicos de cada tipo (income_* e outcome_*)',
    defaultValue: true
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