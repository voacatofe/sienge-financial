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

  // Buscar Income
  if (includeIncome) {
    try {
      var incomeRecords = fetchIncomeData(apiUrl, requestFilters);
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
      var outcomeRecords = fetchOutcomeData(apiUrl, requestFilters);
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
 * Constrói URL com parâmetros de query (filtros + paginação)
 * OTIMIZAÇÃO: Query pushdown - envia filtros para API ao invés de filtrar client-side
 *
 * @param {string} baseUrl - Endpoint base
 * @param {Object} filters - Filtros do Looker (dateRange, dimensionsFilters)
 * @param {number} limit - Limite de registros por página
 * @param {number} offset - Offset para paginação
 * @returns {string} URL completa com query parameters
 */
function buildQueryUrl(baseUrl, filters, limit, offset) {
  var params = ['limit=' + limit, 'offset=' + offset];

  // Se não tem filtros, retornar URL básica
  if (!filters) {
    return baseUrl + '?' + params.join('&');
  }

  // Date Range Filter (mais comum e impactante)
  if (filters.dateRange) {
    if (filters.dateRange.startDate) {
      // Converter de yyyyMMdd para yyyy-MM-dd
      var startDate = formatDateForApi(filters.dateRange.startDate);
      params.push('start_date=' + startDate);
    }
    if (filters.dateRange.endDate) {
      var endDate = formatDateForApi(filters.dateRange.endDate);
      params.push('end_date=' + endDate);
    }
  }

  // Dimension Filters (company, client, project, etc.)
  if (filters.dimensionsFilters && filters.dimensionsFilters.length > 0) {
    filters.dimensionsFilters.forEach(function(filter) {
      var fieldName = filter.fieldName;
      var values = filter.values;

      // Mapear campos do Looker para parâmetros da API
      if (fieldName === 'company_id' && values && values.length > 0) {
        params.push('company_id=' + values[0]);
      }
      else if (fieldName === 'company_name' && values && values.length > 0) {
        params.push('company_name=' + encodeURIComponent(values[0]));
      }
      else if (fieldName === 'cliente_id' && values && values.length > 0) {
        params.push('client_id=' + values[0]);
      }
      else if (fieldName === 'cliente_nome' && values && values.length > 0) {
        params.push('client_name=' + encodeURIComponent(values[0]));
      }
      else if (fieldName === 'credor_id' && values && values.length > 0) {
        params.push('creditor_id=' + values[0]);
      }
      else if (fieldName === 'credor_nome' && values && values.length > 0) {
        params.push('creditor_name=' + encodeURIComponent(values[0]));
      }
      else if (fieldName === 'project_id' && values && values.length > 0) {
        params.push('project_id=' + values[0]);
      }
      else if (fieldName === 'business_area_id' && values && values.length > 0) {
        params.push('business_area_id=' + values[0]);
      }
    });
  }

  // Metric Filters (min/max amount)
  if (filters.metricFilters && filters.metricFilters.length > 0) {
    filters.metricFilters.forEach(function(filter) {
      if (filter.fieldName === 'original_amount') {
        if (filter.min !== undefined) {
          params.push('min_amount=' + filter.min);
        }
        if (filter.max !== undefined) {
          params.push('max_amount=' + filter.max);
        }
      }
    });
  }

  return baseUrl + '?' + params.join('&');
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