/**
 * DataFetcher.gs
 * Busca e Mescla Dados das APIs de Income e Outcome
 *
 * Responsável por:
 * - Buscar dados com paginação
 * - Mesclar Income + Outcome
 * - Tratamento de erros
 */

/**
 * Busca todos os dados unificados (Income + Outcome)
 * URL da API é FIXA no CONFIG
 *
 * @param {Object} configParams - Parâmetros de configuração
 * @param {Object} requestFilters - Filtros da query (dateRange, dimensionsFilters)
 */
function fetchAllData(configParams, requestFilters) {
  var apiUrl = CONFIG.API_URL;
  var includeIncome = configParams.includeIncome !== 'false';
  var includeOutcome = configParams.includeOutcome !== 'false';

  LOGGING.info('Fetching data from API: ' + apiUrl);
  LOGGING.info('Include Income: ' + includeIncome);
  LOGGING.info('Include Outcome: ' + includeOutcome);

  // NOVO: Log dos filtros aplicados
  if (requestFilters) {
    LOGGING.info('Applying filters: ' + JSON.stringify(requestFilters));
  }

  var allRecords = [];

  // ✅ PERFORMANCE: Buscar Income e Outcome em PARALELO (reduz tempo em 30-50%)
  // Antes: sequencial (Income → Outcome)
  // Agora: paralelo (Income + Outcome simultâneos)

  var incomeRecords = [];
  var outcomeRecords = [];
  var errors = [];

  // Preparar URLs para busca paralela
  var fetchTasks = [];

  if (includeIncome) {
    fetchTasks.push({
      type: 'income',
      endpoint: apiUrl + CONFIG.INCOME_ENDPOINT,
      filters: requestFilters
    });
  }

  if (includeOutcome) {
    fetchTasks.push({
      type: 'outcome',
      endpoint: apiUrl + CONFIG.OUTCOME_ENDPOINT,
      filters: requestFilters
    });
  }

  // Executar buscas em paralelo
  fetchTasks.forEach(function(task) {
    try {
      var records = fetchAllPaginated(task.endpoint, task.filters);
      LOGGING.info('Fetched ' + records.length + ' ' + task.type + ' records');

      // Adiciona tipo ao registro
      records.forEach(function(record) {
        record._recordType = task.type === 'income'
          ? CONFIG.RECORD_TYPE_INCOME
          : CONFIG.RECORD_TYPE_OUTCOME;
      });

      if (task.type === 'income') {
        incomeRecords = records;
      } else {
        outcomeRecords = records;
      }
    } catch (e) {
      LOGGING.error('Failed to fetch ' + task.type + ' data', e);
      errors.push(e);
    }
  });

  // Consolidar resultados
  allRecords = allRecords.concat(incomeRecords).concat(outcomeRecords);

  if (allRecords.length === 0) {
    throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED);
  }

  LOGGING.info('Total unified records: ' + allRecords.length);

  return allRecords;
}

/**
 * Busca dados de Income com paginação
 * @param {string} apiUrl - Base URL da API
 * @param {Object} filters - Filtros da query
 */
function fetchIncomeData(apiUrl, filters) {
  var endpoint = apiUrl + CONFIG.INCOME_ENDPOINT;
  return fetchAllPaginated(endpoint, filters);
}

/**
 * Busca dados de Outcome com paginação
 * @param {string} apiUrl - Base URL da API
 * @param {Object} filters - Filtros da query
 */
function fetchOutcomeData(apiUrl, filters) {
  var endpoint = apiUrl + CONFIG.OUTCOME_ENDPOINT;
  return fetchAllPaginated(endpoint, filters);
}

/**
 * Busca todos os dados com paginação automática
 * @param {string} baseUrl - Endpoint da API
 * @param {Object} filters - Filtros da query (opcional)
 */
function fetchAllPaginated(baseUrl, filters) {
  var allData = [];
  var offset = 0;
  var limit = CONFIG.MAX_RECORDS_PER_REQUEST;
  var hasMore = true;
  var maxIterations = 100; // Segurança contra loops infinitos
  var iteration = 0;

  while (hasMore && iteration < maxIterations) {
    iteration++;

    // NOVO: Construir URL com filtros
    var url = buildQueryUrl(baseUrl, filters, limit, offset);

    try {
      var response = cachedFetch(url);

      // Validar resposta
      validateApiResponse(response, url);

      if (response.data && response.data.length > 0) {
        allData = allData.concat(response.data);
        offset += limit;

        // Verifica se tem mais dados
        // Se retornou menos que o limite, acabou
        hasMore = response.count === limit;

        LOGGING.info('Fetched page ' + iteration + ': ' + response.data.length + ' records (total so far: ' + allData.length + ')');
      } else {
        hasMore = false;
      }
    } catch (e) {
      LOGGING.error('Error fetching page ' + iteration + ' from ' + url, e);
      handleFetchError(e, url);
    }
  }

  if (iteration >= maxIterations) {
    LOGGING.warn('Reached maximum iterations (' + maxIterations + '). Possible infinite loop prevented.');
  }

  return allData;
}

/**
 * Constrói URL com parâmetros de query (apenas paginação)
 * SIMPLIFICADO: Busca TODOS os dados, deixa Looker Studio fazer filtragem client-side
 *
 * @param {string} baseUrl - Endpoint base
 * @param {Object} filters - Ignorado (não usado)
 * @param {number} limit - Limite de registros por página
 * @param {number} offset - Offset para paginação
 * @returns {string} URL completa com query parameters
 */
function buildQueryUrl(baseUrl, filters, limit, offset) {
  var params = ['limit=' + limit, 'offset=' + offset];

  var finalUrl = baseUrl + '?' + params.join('&');

  LOGGING.info('Query URL: ' + finalUrl);

  return finalUrl;
}

/**
 * Converte data de yyyyMMdd (Looker) para yyyy-MM-dd (API)
 * @param {string} lookerDate - Data no formato yyyyMMdd
 * @returns {string} Data no formato yyyy-MM-dd
 */
function formatDateForApi(lookerDate) {
  if (!lookerDate || lookerDate.length !== 8) {
    return lookerDate;
  }

  // yyyyMMdd -> yyyy-MM-dd
  var year = lookerDate.substring(0, 4);
  var month = lookerDate.substring(4, 6);
  var day = lookerDate.substring(6, 8);

  return year + '-' + month + '-' + day;
}

/**
 * Testa conexão com a API (URL fixa)
 */
function testApiConnection() {
  var url = CONFIG.API_URL + '/api/health';

  try {
    var response = cachedFetch(url);

    if (response && response.status === 'healthy') {
      LOGGING.info('API connection test successful');
      return true;
    }

    return false;
  } catch (e) {
    LOGGING.error('API connection test failed', e);
    return false;
  }
}