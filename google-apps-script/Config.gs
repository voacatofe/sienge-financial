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
  // API Configuration (FIXED - uso interno)
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
  MISSING_API_URL: 'URL da API não configurada.\n\n📝 Solução: Configure a URL da API nas configurações da fonte de dados.\nExemplo: http://localhost:8000 ou https://api.empresa.com',

  INVALID_API_URL: 'URL da API inválida.\n\n📝 Formato esperado:\n• http://servidor:porta\n• https://dominio.com\n\n❌ Não use:\n• URLs sem protocolo (http/https)\n• Espaços ou caracteres especiais',

  API_CONNECTION_FAILED: 'Falha ao conectar com a API.\n\n🔍 Verifique:\n• API está rodando?\n• URL está correta?\n• Firewall bloqueando?\n• Rede acessível?',

  NO_DATA_RETURNED: 'Nenhum dado retornado pela API.\n\n🔍 Possíveis causas:\n• Filtros muito restritivos\n• Período sem dados\n• API sem registros\n• Ambos "Income" e "Outcome" desmarcados',

  INVALID_JSON_RESPONSE: 'Resposta inválida da API.\n\n📝 Esperado:\n{\n  "success": true,\n  "count": 100,\n  "data": [...]\n}\n\n🔧 Verifique:\n• Endpoint retorna JSON válido\n• Estrutura da resposta está correta',

  FETCH_TIMEOUT: 'Timeout ao buscar dados (limite: 30s).\n\n🔧 Soluções:\n• Reduza o período de datas\n• Desmarque "Calcular Métricas"\n• Verifique performance da API\n• Use filtros para reduzir dados',

  UNKNOWN_ERROR: 'Erro desconhecido ao processar dados.\n\n🔍 Verifique os logs do Apps Script:\n1. Extensões > Apps Script\n2. Execuções\n3. Busque detalhes do erro'
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
  },

  CALCULATE_AGING: {
    id: 'calculateAging',
    name: 'Calcular Métricas de Aging',
    helpText: '✅ PERFORMANCE: Desmarque para melhorar velocidade (desabilita dias_atraso, faixa_aging, taxa_inadimplencia, situacao_vencimento)',
    defaultValue: true
  },

  DATE_FIELD_PREFERENCE: {
    id: 'dateFieldPreference',
    name: 'Campo de Data Principal',
    helpText: 'Escolha qual campo de data usar como padrão para filtros de intervalo de data',
    defaultValue: 'due_date',
    options: [
      { label: 'Data de Vencimento', value: 'due_date' },
      { label: 'Data de Pagamento', value: 'payment_date' },
      { label: 'Data de Emissão', value: 'issue_date' },
      { label: 'Data da Última Movimentação', value: 'data_ultima_movimentacao' }
    ]
    // COMO FUNCIONA: O SchemaBuilder.gs usa fields.setDefaultDimension(dateFieldPreference)
    // para marcar o campo escolhido como padrão. O Looker Studio então usa este campo
    // automaticamente para novos filtros de intervalo de data e controles de date range.
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