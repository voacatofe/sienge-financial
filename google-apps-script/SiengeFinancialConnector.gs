/**
 * SiengeFinancialConnector.gs
 * Conector Principal para Looker Studio
 *
 * Implementa as 4 funções obrigatórias do Community Connector:
 * - getAuthType()
 * - getConfig()
 * - getSchema()
 * - getData()
 */

/**
 * Retorna o tipo de autenticação do conector
 * API pública, sem necessidade de autenticação
 */
function getAuthType() {
  return cc.newAuthTypeResponse()
    .setAuthType(cc.AuthType.NONE)
    .build();
}

/**
 * Constrói a interface de configuração do conector
 * Permite ao usuário configurar URL da API e opções de dados
 */
function getConfig(request) {
  var config = cc.getConfig();

  LOGGING.info('Building configuration UI');

  // ==========================================
  // Configuração da API
  // ==========================================

  config.newInfo()
    .setId('instructions')
    .setText('Configure a conexão com sua API Sienge Financial');

  config.newTextInput()
    .setId(USER_CONFIG_OPTIONS.API_URL.id)
    .setName(USER_CONFIG_OPTIONS.API_URL.name)
    .setHelpText(USER_CONFIG_OPTIONS.API_URL.helpText)
    .setPlaceholder(USER_CONFIG_OPTIONS.API_URL.placeholder)
    .setAllowOverride(true);

  // ==========================================
  // Opções de Dados
  // ==========================================

  config.newInfo()
    .setId('dataOptions')
    .setText('Selecione quais dados deseja incluir');

  config.newCheckbox()
    .setId(USER_CONFIG_OPTIONS.INCLUDE_INCOME.id)
    .setName(USER_CONFIG_OPTIONS.INCLUDE_INCOME.name)
    .setHelpText(USER_CONFIG_OPTIONS.INCLUDE_INCOME.helpText)
    .setAllowOverride(true);

  config.newCheckbox()
    .setId(USER_CONFIG_OPTIONS.INCLUDE_OUTCOME.id)
    .setName(USER_CONFIG_OPTIONS.INCLUDE_OUTCOME.name)
    .setHelpText(USER_CONFIG_OPTIONS.INCLUDE_OUTCOME.helpText)
    .setAllowOverride(true);

  // ==========================================
  // Opções de Performance
  // ==========================================

  config.newInfo()
    .setId('performanceOptions')
    .setText('Opções de performance (desmarque para melhorar velocidade)');

  config.newCheckbox()
    .setId(USER_CONFIG_OPTIONS.CALCULATE_METRICS.id)
    .setName(USER_CONFIG_OPTIONS.CALCULATE_METRICS.name)
    .setHelpText(USER_CONFIG_OPTIONS.CALCULATE_METRICS.helpText)
    .setAllowOverride(true);

  config.newCheckbox()
    .setId(USER_CONFIG_OPTIONS.INCLUDE_SPECIFIC_FIELDS.id)
    .setName(USER_CONFIG_OPTIONS.INCLUDE_SPECIFIC_FIELDS.name)
    .setHelpText(USER_CONFIG_OPTIONS.INCLUDE_SPECIFIC_FIELDS.helpText)
    .setAllowOverride(true);

  // ==========================================
  // Validação da configuração
  // ==========================================

  config.setDateRangeRequired(false);

  return config.build();
}

/**
 * Retorna o schema de campos do conector
 * Constrói schema unificado com 79 campos
 */
function getSchema(request) {
  LOGGING.info('Building schema for Looker Studio');

  // Validar configuração
  validateConfiguration(request.configParams);

  // Determinar se deve incluir campos específicos
  var includeSpecificFields = request.configParams.includeSpecificFields !== 'false';

  // Construir schema
  var fields = buildSchema(includeSpecificFields);

  LOGGING.info('Schema built successfully');

  return { schema: fields.build() };
}

/**
 * Busca e transforma os dados para o Looker Studio
 * Orquestra todo o pipeline de dados
 */
function getData(request) {
  LOGGING.info('getData called');
  LOGGING.log('Request', {
    fields: request.fields.length,
    configParams: request.configParams
  });

  try {
    // ==========================================
    // ETAPA 1: Validação
    // ==========================================

    validateConfiguration(request.configParams);
    validateRequestedFields(request.fields);

    // ==========================================
    // ETAPA 2: Buscar Dados da API
    // ==========================================

    LOGGING.info('Fetching data from API...');

    var allRecords = fetchAllData(request.configParams);

    if (allRecords.length === 0) {
      LOGGING.warn('No records returned from API');
      return {
        schema: request.fields,
        rows: []
      };
    }

    LOGGING.info('Records fetched: ' + allRecords.length);

    // ==========================================
    // ETAPA 3: Transformar Dados
    // ==========================================

    LOGGING.info('Transforming records...');

    var calculateMetrics = request.configParams.calculateMetrics !== 'false';

    var rows = transformRecords(
      allRecords,
      request.fields,
      calculateMetrics
    );

    LOGGING.info('Transformation complete: ' + rows.length + ' rows');

    // ==========================================
    // ETAPA 4: Retornar Dados
    // ==========================================

    return {
      schema: request.fields,
      rows: rows
    };

  } catch (e) {
    LOGGING.error('Error in getData', e);
    return createUserError(
      'Erro ao buscar dados: ' + e.message,
      e.toString()
    );
  }
}

/**
 * Valida a configuração do usuário
 */
function validateConfiguration(configParams) {
  // Validar URL da API
  if (!configParams.apiUrl) {
    return createUserError(
      ERROR_MESSAGES.MISSING_API_URL,
      'configParams.apiUrl is missing'
    );
  }

  if (!isValidUrl(configParams.apiUrl)) {
    return createUserError(
      ERROR_MESSAGES.INVALID_API_URL,
      'Invalid URL format: ' + configParams.apiUrl
    );
  }

  // Validar que pelo menos um tipo está selecionado
  var includeIncome = configParams.includeIncome !== 'false';
  var includeOutcome = configParams.includeOutcome !== 'false';

  if (!includeIncome && !includeOutcome) {
    return createUserError(
      'Selecione pelo menos um tipo de dado (Contas a Receber ou Contas a Pagar)',
      'Both includeIncome and includeOutcome are false'
    );
  }

  LOGGING.info('Configuration validated successfully');
  return true;
}

/**
 * Valida que os campos solicitados são válidos
 */
function validateRequestedFields(fields) {
  if (!fields || fields.length === 0) {
    return createUserError(
      'Nenhum campo solicitado',
      'request.fields is empty'
    );
  }

  LOGGING.info('Requested ' + fields.length + ' fields');
  return true;
}

/**
 * Verifica se o conector está funcionando
 * Útil para debug e testes
 */
function isAdminUser() {
  return true;
}