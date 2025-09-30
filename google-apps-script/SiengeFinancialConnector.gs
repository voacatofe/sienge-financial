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
 * SIMPLIFICADO: Apenas 2 checkboxes
 */
function getConfig(request) {
  var config = cc.getConfig();

  LOGGING.info('Building simplified configuration UI');

  // ==========================================
  // Instruções
  // ==========================================

  config.newInfo()
    .setId('instructions')
    .setText('Selecione quais tipos de dados financeiros deseja visualizar no Looker Studio');

  // ==========================================
  // Opções de Dados
  // ==========================================

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

  // Verificar se SHOW_IDS existe antes de usar
  if (USER_CONFIG_OPTIONS.SHOW_IDS) {
    config.newCheckbox()
      .setId(USER_CONFIG_OPTIONS.SHOW_IDS.id)
      .setName(USER_CONFIG_OPTIONS.SHOW_IDS.name)
      .setHelpText(USER_CONFIG_OPTIONS.SHOW_IDS.helpText)
      .setAllowOverride(true);
  } else {
    // Fallback caso Config.gs não esteja carregado
    config.newCheckbox()
      .setId('showIds')
      .setName('Mostrar campos de ID')
      .setHelpText('Exibir campos técnicos de ID no relatório')
      .setAllowOverride(true);
  }

  config.setDateRangeRequired(false);

  return config.build();
}

/**
 * Retorna o schema de campos do conector
 * Schema com campos baseado em configuração (IDs opcionais)
 */
function getSchema(request) {
  LOGGING.info('Building schema for Looker Studio');

  // Validar configuração
  validateConfiguration(request.configParams);

  // Passar configParams para getFields
  var showIdsKey = (USER_CONFIG_OPTIONS.SHOW_IDS && USER_CONFIG_OPTIONS.SHOW_IDS.id) || 'showIds';
  var showIds = request.configParams && request.configParams[showIdsKey] === 'true';

  LOGGING.info('Schema built successfully. Show IDs: ' + showIds);

  return { schema: getFields(showIds).build() };
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

    // Obter IDs dos campos solicitados
    var requestedFieldIds = request.fields.map(function(f) { return f.name; });

    // Verificar configuração de IDs
    var showIdsKey = (USER_CONFIG_OPTIONS.SHOW_IDS && USER_CONFIG_OPTIONS.SHOW_IDS.id) || 'showIds';
    var showIds = request.configParams && request.configParams[showIdsKey] === 'true';

    // Construir schema correto usando forIds()
    var requestedSchema = getFields(showIds).forIds(requestedFieldIds).build();

    // Sempre calcular métricas (simplificado)
    var rows = transformRecords(
      allRecords,
      request.fields,
      true
    );

    LOGGING.info('Transformation complete: ' + rows.length + ' rows');

    // ==========================================
    // ETAPA 4: Retornar Dados
    // ==========================================

    return {
      schema: requestedSchema,
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
 * SIMPLIFICADO: URL é fixa, só valida checkboxes
 */
function validateConfiguration(configParams) {
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