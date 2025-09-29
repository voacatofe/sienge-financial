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
 */
function fetchAllData(configParams) {
  var apiUrl = CONFIG.API_URL;
  var includeIncome = configParams.includeIncome !== 'false';
  var includeOutcome = configParams.includeOutcome !== 'false';

  LOGGING.info('Fetching data from API: ' + apiUrl);
  LOGGING.info('Include Income: ' + includeIncome);
  LOGGING.info('Include Outcome: ' + includeOutcome);

  var allRecords = [];

  // Buscar Income
  if (includeIncome) {
    try {
      var incomeRecords = fetchIncomeData(apiUrl);
      LOGGING.info('Fetched ' + incomeRecords.length + ' income records');

      // Adiciona tipo ao registro
      incomeRecords.forEach(function(record) {
        record._recordType = CONFIG.RECORD_TYPE_INCOME;
      });

      allRecords = allRecords.concat(incomeRecords);
    } catch (e) {
      LOGGING.error('Failed to fetch income data', e);
      // Não para o processo se apenas um endpoint falhar
      // Mas se ambos falharem, vai dar erro
    }
  }

  // Buscar Outcome
  if (includeOutcome) {
    try {
      var outcomeRecords = fetchOutcomeData(apiUrl);
      LOGGING.info('Fetched ' + outcomeRecords.length + ' outcome records');

      // Adiciona tipo ao registro
      outcomeRecords.forEach(function(record) {
        record._recordType = CONFIG.RECORD_TYPE_OUTCOME;
      });

      allRecords = allRecords.concat(outcomeRecords);
    } catch (e) {
      LOGGING.error('Failed to fetch outcome data', e);
    }
  }

  if (allRecords.length === 0) {
    throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED);
  }

  LOGGING.info('Total unified records: ' + allRecords.length);

  return allRecords;
}

/**
 * Busca dados de Income com paginação
 */
function fetchIncomeData(apiUrl) {
  var endpoint = apiUrl + CONFIG.INCOME_ENDPOINT;
  return fetchAllPaginated(endpoint);
}

/**
 * Busca dados de Outcome com paginação
 */
function fetchOutcomeData(apiUrl) {
  var endpoint = apiUrl + CONFIG.OUTCOME_ENDPOINT;
  return fetchAllPaginated(endpoint);
}

/**
 * Busca todos os dados com paginação automática
 */
function fetchAllPaginated(baseUrl) {
  var allData = [];
  var offset = 0;
  var limit = CONFIG.MAX_RECORDS_PER_REQUEST;
  var hasMore = true;
  var maxIterations = 100; // Segurança contra loops infinitos
  var iteration = 0;

  while (hasMore && iteration < maxIterations) {
    iteration++;

    var url = baseUrl + '?limit=' + limit + '&offset=' + offset;

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