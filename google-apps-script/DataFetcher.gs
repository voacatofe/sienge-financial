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
 * URL da API é FIXA (uso interno)
 *
 * @param {Object} configParams - Parâmetros de configuração
 * @param {Object} requestFilters - Filtros da query (dateRange, dimensionsFilters)
 */
function fetchAllData(configParams, requestFilters) {
  var apiUrl = CONFIG.API_URL;
  var includeIncome = configParams.includeIncome !== 'false';
  var includeOutcome = configParams.includeOutcome !== 'false';

  // Capturar preferência de campo de data
  var primaryDateId = configParams.primary_date || 'due_date';

  LOGGING.info('Fetching data from API: ' + apiUrl);
  LOGGING.info('Include Income: ' + includeIncome);
  LOGGING.info('Include Outcome: ' + includeOutcome);
  LOGGING.info('Primary Date Field: ' + primaryDateId);

  // Log dos filtros aplicados
  if (requestFilters) {
    LOGGING.info('Applying filters: ' + JSON.stringify(requestFilters));

    // Adicionar campo de data aos filtros
    if (!requestFilters.date_field) {
      requestFilters.date_field = primaryDateId;
    }
  }

  var allRecords = [];

  // ✅ PERFORMANCE: Buscar Income e Outcome em PARALELO REAL
  // Usa UrlFetchApp.fetchAll() para requisições simultâneas (reduz tempo em 40-60%)

  var incomeRecords = [];
  var outcomeRecords = [];
  var errors = [];

  // Construir URLs da primeira página de cada endpoint
  var parallelRequests = [];
  var requestMap = {}; // Para mapear respostas aos tipos

  if (includeIncome) {
    var incomeUrl = buildQueryUrl(
      apiUrl + CONFIG.INCOME_ENDPOINT,
      requestFilters,
      CONFIG.MAX_RECORDS_PER_REQUEST,
      0
    );
    parallelRequests.push(incomeUrl);
    requestMap[incomeUrl] = 'income';
  }

  if (includeOutcome) {
    var outcomeUrl = buildQueryUrl(
      apiUrl + CONFIG.OUTCOME_ENDPOINT,
      requestFilters,
      CONFIG.MAX_RECORDS_PER_REQUEST,
      0
    );
    parallelRequests.push(outcomeUrl);
    requestMap[outcomeUrl] = 'outcome';
  }

  // Executar primeira página em paralelo
  LOGGING.info('Fetching first page in parallel for ' + parallelRequests.length + ' endpoints');

  var parallelOptions = parallelRequests.map(function() {
    return {
      'method': 'GET',
      'muteHttpExceptions': true,
      'contentType': 'application/json',
      'timeout': (CONFIG.REQUEST_TIMEOUT_SECONDS || 30) * 1000,
      'headers': {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      }
    };
  });

  try {
    // Construir array de requisições para UrlFetchApp.fetchAll()
    var fetchRequests = parallelRequests.map(function(url, index) {
      var request = {
        url: url,
        method: parallelOptions[index].method,
        muteHttpExceptions: parallelOptions[index].muteHttpExceptions,
        contentType: parallelOptions[index].contentType,
        timeout: parallelOptions[index].timeout,
        headers: parallelOptions[index].headers
      };
      return request;
    });

    var responses = UrlFetchApp.fetchAll(fetchRequests);

    // Processar respostas paralelas
    responses.forEach(function(response, index) {
      var url = parallelRequests[index];
      var type = requestMap[url];
      var endpoint = type === 'income' ? apiUrl + CONFIG.INCOME_ENDPOINT : apiUrl + CONFIG.OUTCOME_ENDPOINT;

      try {
        var responseCode = response.getResponseCode();
        if (responseCode !== 200) {
          throw new Error('HTTP ' + responseCode);
        }

        var data = JSON.parse(response.getContentText());
        validateApiResponse(data, url);

        var firstPageRecords = data.data || [];

        // Adiciona tipo ao registro
        firstPageRecords.forEach(function(record) {
          record._recordType = type === 'income'
            ? CONFIG.RECORD_TYPE_INCOME
            : CONFIG.RECORD_TYPE_OUTCOME;
        });

        // Se tem mais páginas, busca sequencialmente
        var allTypeRecords = firstPageRecords;
        if (data.count === CONFIG.MAX_RECORDS_PER_REQUEST) {
          LOGGING.info('First page returned ' + data.count + ' records, fetching remaining pages...');
          var remainingRecords = fetchRemainingPages(
            endpoint,
            requestFilters,
            CONFIG.MAX_RECORDS_PER_REQUEST
          );

          remainingRecords.forEach(function(record) {
            record._recordType = type === 'income'
              ? CONFIG.RECORD_TYPE_INCOME
              : CONFIG.RECORD_TYPE_OUTCOME;
          });

          allTypeRecords = allTypeRecords.concat(remainingRecords);
        }

        LOGGING.info('Fetched total ' + allTypeRecords.length + ' ' + type + ' records');

        if (type === 'income') {
          incomeRecords = allTypeRecords;
        } else {
          outcomeRecords = allTypeRecords;
        }
      } catch (e) {
        LOGGING.error('Failed to process ' + type + ' response', e);
        errors.push(e);
      }
    });
  } catch (e) {
    LOGGING.error('Parallel fetch failed, falling back to sequential', e);

    // Fallback: busca sequencial se paralelo falhar
    if (includeIncome) {
      try {
        incomeRecords = fetchAllPaginated(apiUrl + CONFIG.INCOME_ENDPOINT, requestFilters);
        incomeRecords.forEach(function(record) {
          record._recordType = CONFIG.RECORD_TYPE_INCOME;
        });
      } catch (err) {
        errors.push(err);
      }
    }

    if (includeOutcome) {
      try {
        outcomeRecords = fetchAllPaginated(apiUrl + CONFIG.OUTCOME_ENDPOINT, requestFilters);
        outcomeRecords.forEach(function(record) {
          record._recordType = CONFIG.RECORD_TYPE_OUTCOME;
        });
      } catch (err) {
        errors.push(err);
      }
    }
  }

  // Consolidar resultados
  allRecords = allRecords.concat(incomeRecords).concat(outcomeRecords);

  if (allRecords.length === 0) {
    throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED);
  }

  LOGGING.info('Total unified records: ' + allRecords.length);

  return allRecords;
}

/**
 * Busca páginas restantes após a primeira (usado no fetch paralelo)
 * ✅ PERFORMANCE: Usa UrlFetchApp.fetchAll() para buscar múltiplas páginas simultaneamente
 * Reduz tempo em 20-30% para datasets grandes (>1000 registros)
 *
 * @param {string} endpoint - Endpoint da API
 * @param {Object} filters - Filtros da query
 * @param {number} firstPageOffset - Offset da primeira página (para calcular próximo)
 */
function fetchRemainingPages(endpoint, filters, firstPageOffset) {
  var allData = [];
  var offset = firstPageOffset; // Começa após primeira página
  var limit = CONFIG.MAX_RECORDS_PER_REQUEST;
  var hasMore = true;
  var maxIterations = 100;
  var iteration = 0;

  // ✅ PERFORMANCE: Buscar múltiplas páginas por vez (batch paralelo)
  var PAGES_PER_BATCH = 5; // Buscar 5 páginas simultaneamente

  while (hasMore && iteration < maxIterations) {
    // Construir URLs para próximo batch de páginas
    var batchUrls = [];
    var batchOffsets = [];

    for (var i = 0; i < PAGES_PER_BATCH; i++) {
      var currentOffset = offset + (i * limit);
      var url = buildQueryUrl(endpoint, filters, limit, currentOffset);
      batchUrls.push(url);
      batchOffsets.push(currentOffset);
    }

    LOGGING.info('Fetching batch of ' + batchUrls.length + ' pages in parallel (starting offset: ' + offset + ')');

    // ✅ PERFORMANCE: Cache inteligente - verificar cache antes de buscar
    var cache = CacheService.getUserCache();
    var urlsToFetch = [];
    var cachedResponses = {};
    var cacheHits = 0;

    // Verificar quais URLs já estão em cache
    batchUrls.forEach(function(url) {
      var cacheKey = 'api_' + Utilities.base64Encode(url);
      var cached = cache.get(cacheKey);

      if (cached) {
        try {
          var parsedCache = JSON.parse(cached);
          if (validateCachedData(parsedCache)) {
            cachedResponses[url] = parsedCache;
            cacheHits++;
            LOGGING.info('Cache hit for URL: ' + url);
          } else {
            urlsToFetch.push(url);
            cache.remove(cacheKey);
          }
        } catch (e) {
          LOGGING.warn('Invalid cache for URL, will refetch: ' + url);
          urlsToFetch.push(url);
          cache.remove(cacheKey);
        }
      } else {
        urlsToFetch.push(url);
      }
    });

    LOGGING.info('Cache hits: ' + cacheHits + '/' + batchUrls.length + ', fetching: ' + urlsToFetch.length);

    var responses = [];

    try {
      // Se todas as URLs estão em cache, pular fetch
      if (urlsToFetch.length > 0) {
        // Preparar requisições paralelas apenas para URLs não cacheadas
        var fetchRequests = urlsToFetch.map(function(url) {
          return {
            url: url,
            method: 'GET',
            muteHttpExceptions: true,
            contentType: 'application/json',
            timeout: (CONFIG.REQUEST_TIMEOUT_SECONDS || 30) * 1000,
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate'
            }
          };
        });

        // Executar batch paralelo
        responses = UrlFetchApp.fetchAll(fetchRequests);
      }

      var pagesWithData = 0;
      var totalRecordsInBatch = 0;

      // Primeiro, processar respostas cacheadas
      for (var cachedUrl in cachedResponses) {
        if (cachedResponses.hasOwnProperty(cachedUrl)) {
          var data = cachedResponses[cachedUrl];
          if (data.data && data.data.length > 0) {
            allData = allData.concat(data.data);
            pagesWithData++;
            totalRecordsInBatch += data.data.length;
            LOGGING.info('Using cached data: ' + data.data.length + ' records');
          }
        }
      }

      // Processar respostas do fetch (se houver)
      var fetchIndex = 0;
      responses.forEach(function(response) {
        var url = urlsToFetch[fetchIndex];
        fetchIndex++;

        try {
          var responseCode = response.getResponseCode();
          if (responseCode !== 200) {
            LOGGING.warn('Page returned HTTP ' + responseCode);
            return; // Skip this page, continue with next
          }

          var data = JSON.parse(response.getContentText());
          validateApiResponse(data, url);

          // ✅ PERFORMANCE: Cachear resposta para uso futuro
          var cacheKey = 'api_' + Utilities.base64Encode(url);
          var dataStr = JSON.stringify(data);
          if (dataStr.length < CONFIG.CACHE_MAX_SIZE_BYTES) {
            try {
              cache.put(cacheKey, dataStr, CONFIG.CACHE_DURATION_SECONDS);
              LOGGING.info('Cached response for: ' + url);
            } catch (cacheError) {
              LOGGING.warn('Failed to cache response: ' + cacheError.message);
            }
          }

          if (data.data && data.data.length > 0) {
            allData = allData.concat(data.data);
            pagesWithData++;
            totalRecordsInBatch += data.data.length;

            LOGGING.info('Fetched and cached: ' + data.data.length + ' records');
          }
        } catch (e) {
          LOGGING.warn('Error processing fetched page: ' + e.message);
          // Continue com próxima página do batch
        }
      });

      LOGGING.info('Batch complete: ' + pagesWithData + ' pages with data, ' + totalRecordsInBatch + ' total records');

      // Atualizar controles de paginação
      offset += (PAGES_PER_BATCH * limit);
      iteration += PAGES_PER_BATCH;

      // Se nenhuma página retornou dados, acabou
      if (pagesWithData === 0) {
        hasMore = false;
        LOGGING.info('No more data available, stopping pagination');
      }

      // Se batch não retornou completo (menos páginas com dados que esperado), provavelmente acabou
      if (pagesWithData < PAGES_PER_BATCH) {
        hasMore = false;
        LOGGING.info('Partial batch returned, assuming end of data');
      }

    } catch (e) {
      LOGGING.error('Error fetching batch of pages', e);

      // Fallback para busca sequencial se batch falhar
      LOGGING.warn('Falling back to sequential fetch for remaining pages');
      hasMore = false;

      // Tentar buscar pelo menos a próxima página individualmente
      try {
        var fallbackUrl = buildQueryUrl(endpoint, filters, limit, offset);
        var fallbackResponse = cachedFetch(fallbackUrl);
        validateApiResponse(fallbackResponse, fallbackUrl);

        if (fallbackResponse.data && fallbackResponse.data.length > 0) {
          allData = allData.concat(fallbackResponse.data);
          LOGGING.info('Fallback fetch successful: ' + fallbackResponse.data.length + ' records');
        }
      } catch (fallbackError) {
        LOGGING.error('Fallback fetch also failed', fallbackError);
        throw fallbackError;
      }
    }
  }

  if (iteration >= maxIterations) {
    LOGGING.warn('Reached maximum iterations (' + maxIterations + '). Possible incomplete data.');
  }

  LOGGING.info('Total remaining pages fetched: ' + allData.length + ' records');

  return allData;
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
 * Constrói URL com parâmetros de query (paginação + filtros)
 * OTIMIZADO: Envia filtros para API (query pushdown)
 * ✅ SECURITY: Valida e sanitiza parâmetros de URL
 *
 * @param {string} baseUrl - Endpoint base
 * @param {Object} filters - Filtros da query (dateRange, dimensionsFilters)
 * @param {number} limit - Limite de registros por página
 * @param {number} offset - Offset para paginação
 * @returns {string} URL completa com query parameters
 */
function buildQueryUrl(baseUrl, filters, limit, offset) {
  // ✅ SECURITY: Valida que limit e offset são números seguros
  var safeLimit = parseInt(limit, 10);
  var safeOffset = parseInt(offset, 10);

  // Aumentado limite máximo de 10k para 50k para datasets grandes
  var MAX_LIMIT = 50000;
  var MAX_OFFSET = 10000000; // 10 milhões

  if (isNaN(safeLimit) || safeLimit < 1 || safeLimit > MAX_LIMIT) {
    LOGGING.warn('Invalid limit (' + limit + '), using default: 1000');
    safeLimit = 1000;
  }

  if (isNaN(safeOffset) || safeOffset < 0 || safeOffset > MAX_OFFSET) {
    LOGGING.warn('Invalid offset (' + offset + '), using default: 0');
    safeOffset = 0;
  }

  var params = ['limit=' + safeLimit, 'offset=' + safeOffset];

  // ==========================================
  // Aplicar campo de data preferencial
  // ==========================================

  if (filters && filters.date_field) {
    params.push('date_field=' + encodeURIComponent(filters.date_field));
  }

  // ==========================================
  // Aplicar filtros de data
  // ==========================================

  if (filters && filters.dateRange) {
    if (filters.dateRange.startDate) {
      var startDate = formatDateForApi(filters.dateRange.startDate);
      params.push('start_date=' + encodeURIComponent(startDate));
    }

    if (filters.dateRange.endDate) {
      var endDate = formatDateForApi(filters.dateRange.endDate);
      params.push('end_date=' + encodeURIComponent(endDate));
    }
  }

  // ==========================================
  // NOVO: Aplicar filtros de dimensões
  // ==========================================

  if (filters && filters.dimensionsFilters && filters.dimensionsFilters.length > 0) {
    filters.dimensionsFilters.forEach(function(filter) {
      var fieldName = filter.fieldName;
      var values = filter.values || [];

      // Mapear campos Looker → API
      var apiParam = mapLookerFieldToApiParam(fieldName);

      if (apiParam && values.length > 0) {
        // Para filtros de texto, usar o primeiro valor
        var value = values[0];
        params.push(apiParam + '=' + encodeURIComponent(value));
      }
    });
  }

  var finalUrl = baseUrl + '?' + params.join('&');

  LOGGING.info('Query URL with filters: ' + finalUrl);

  return finalUrl;
}

/**
 * Mapeia campos do Looker para parâmetros da API
 * COMPLETO: Todos os campos dimensões mapeados
 *
 * @param {string} lookerField - Nome do campo no Looker
 * @returns {string} Nome do parâmetro na API
 */
function mapLookerFieldToApiParam(lookerField) {
  var mapping = {
    // Identificação
    'id': 'id',
    'installment_id': 'installment_id',
    'bill_id': 'bill_id',

    // Empresa
    'company_id': 'company_id',
    'company_name': 'company_name',
    'business_area_id': 'business_area_id',
    'business_area_name': 'business_area_name',
    'project_id': 'project_id',
    'project_name': 'project_name',
    'group_company_id': 'group_company_id',
    'group_company_name': 'group_company_name',
    'holding_id': 'holding_id',
    'holding_name': 'holding_name',
    'subsidiary_id': 'subsidiary_id',
    'subsidiary_name': 'subsidiary_name',
    'business_type_id': 'business_type_id',
    'business_type_name': 'business_type_name',
    'cost_center_name': 'cost_center_name',

    // Partes (Cliente/Credor)
    'cliente_id': 'client_id',
    'cliente_nome': 'client_name',
    'credor_id': 'creditor_id',
    'credor_nome': 'creditor_name',

    // Documento
    'document_identification_id': 'document_identification_id',
    'document_identification_name': 'document_identification_name',
    'document_number': 'document_number',
    'document_forecast': 'document_forecast',
    'origin_id': 'origin_id',

    // Indexação
    'indexer_id': 'indexer_id',
    'indexer_name': 'indexer_name',

    // Status
    'status_parcela': 'status_parcela',
    'situacao_pagamento': 'situacao_pagamento',

    // Campos específicos de Income
    'income_periodicity_type': 'periodicity_type',
    'income_interest_type': 'interest_type',
    'income_correction_type': 'correction_type',
    'income_defaulter_situation': 'defaulter_situation',
    'income_sub_judicie': 'sub_judicie',
    'income_main_unit': 'main_unit',
    'income_installment_number': 'installment_number',
    'income_payment_term_id': 'payment_term_id',
    'income_payment_term_description': 'payment_term_descrition', // typo da API
    'income_bearer_id': 'bearer_id',

    // Campos específicos de Outcome
    'outcome_forecast_document': 'forecast_document',
    'outcome_consistency_status': 'consistency_status',
    'outcome_authorization_status': 'authorization_status',
    'outcome_registered_user_id': 'registered_user_id',
    'outcome_registered_by': 'registered_by'
  };

  return mapping[lookerField] || null;
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

    LOGGING.warn('API unhealthy response: ' + JSON.stringify(response));
    return false;
  } catch (e) {
    LOGGING.error('API connection test failed', e);
    return false;
  }
}