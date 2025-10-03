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

  // ✅ PERFORMANCE: Toggle para métricas de aging
  config.newCheckbox()
    .setId(USER_CONFIG_OPTIONS.CALCULATE_AGING.id)
    .setName(USER_CONFIG_OPTIONS.CALCULATE_AGING.name)
    .setHelpText(USER_CONFIG_OPTIONS.CALCULATE_AGING.helpText)
    .setAllowOverride(true);

  // ==========================================
  // Seleção do Campo de Data Principal
  // ==========================================

  config.newSelectSingle()
    .setId('primary_date')
    .setName('Data Principal')
    .setHelpText('Qual data será o padrão da fonte (pode ser trocada por gráfico)')
    .addOption(config.newOptionBuilder().setLabel('Data de Vencimento').setValue('due_date'))
    .addOption(config.newOptionBuilder().setLabel('Data de Pagamento').setValue('payment_date'))
    .addOption(config.newOptionBuilder().setLabel('Data de Emissão').setValue('issue_date'))
    .addOption(config.newOptionBuilder().setLabel('Data da Conta').setValue('bill_date'))
    .addOption(config.newOptionBuilder().setLabel('Data Base da Parcela').setValue('installment_base_date'))
    .addOption(config.newOptionBuilder().setLabel('Data da Última Movimentação').setValue('data_ultima_movimentacao'))
    .setAllowOverride(true);

  // ==========================================
  // Date Range (OBRIGATÓRIO para performance)
  // ==========================================
  // NOTA: Mantemos setDateRangeRequired(true) para garantir que filtros de data sejam
  // sempre aplicados. O campo padrão é definido via fields.setDefaultDimension() no
  // SchemaBuilder.gs, não aqui. Se mudássemos para false, o usuário teria que escolher
  // manualmente o campo de data toda vez, o que não é desejado.

  config.setDateRangeRequired(true);

  return config.build();
}

/**
 * Retorna o schema de campos do conector
 * Schema com campos baseado em configuração
 */
function getSchema(request) {
  LOGGING.info('Building schema for Looker Studio');

  // Validar configuração
  validateConfiguration(request.configParams);

  // Extrair preferências de configuração
  var showIdsKey = (USER_CONFIG_OPTIONS.SHOW_IDS && USER_CONFIG_OPTIONS.SHOW_IDS.id) || 'showIds';
  var showIds = request.configParams && request.configParams[showIdsKey] === 'true';

  // Extrair preferência de campo de data principal
  var primaryDateId = (request.configParams && request.configParams.primary_date) || 'due_date';

  return { schema: getFields(showIds, primaryDateId).build() };
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
    // ETAPA 1.5: Aplicar Default Date Filter (3 meses)
    // ==========================================

    // Se usuário não especificou date range, aplicar padrão de 3 meses
    if (!request.dateRange || !request.dateRange.startDate) {
      var today = new Date();
      var threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(today.getMonth() - 3);

      request.dateRange = {
        startDate: Utilities.formatDate(threeMonthsAgo, 'GMT', 'yyyyMMdd'),
        endDate: Utilities.formatDate(today, 'GMT', 'yyyyMMdd')
      };

      LOGGING.info('Applied default date filter: last 3 months (' + request.dateRange.startDate + ' to ' + request.dateRange.endDate + ')');
    } else {
      LOGGING.info('Using user-specified date range: ' + request.dateRange.startDate + ' to ' + request.dateRange.endDate);
    }

    // ==========================================
    // ETAPA 2: Buscar Dados da API (com filtros)
    // ==========================================

    LOGGING.info('Fetching data from API with server-side filters');

    // Construir objeto de filtros para passar à API
    var requestFilters = {
      dateRange: request.dateRange,
      dimensionsFilters: request.dimensionsFilters || [],
      metricFilters: request.metricFilters || []
    };

    // Buscar dados com filtros aplicados
    var allRecords = fetchAllData(request.configParams, requestFilters);

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

    // Extrair preferências de configuração
    var showIdsKey = (USER_CONFIG_OPTIONS.SHOW_IDS && USER_CONFIG_OPTIONS.SHOW_IDS.id) || 'showIds';
    var showIds = request.configParams && request.configParams[showIdsKey] === 'true';

    // Extrair preferência de campo de data principal
    var primaryDateId = (request.configParams && request.configParams.primary_date) || 'due_date';

    // Construir schema correto usando forIds()
    var requestedSchema = getFields(showIds, primaryDateId).forIds(requestedFieldIds).build();

    // Sempre calcular métricas (simplificado) + PASSAR configParams (Passo 4)
    var rows = transformRecords(
      allRecords,
      request.fields,
      true,
      request.configParams
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
  LOGGING.info('Using API URL (fixed): ' + CONFIG.API_URL);
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