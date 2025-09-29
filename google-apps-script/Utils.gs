/**
 * Utils.gs
 * Funções Utilitárias para o Conector Sienge Financial
 *
 * Contém funções auxiliares para manipulação de dados, formatação, cache, etc.
 */

// ==========================================
// Validação de Dados
// ==========================================

/**
 * Retorna valor seguro, tratando null/undefined
 */
function safeValue(value, defaultValue) {
  if (value === null || value === undefined || value === '') {
    return defaultValue !== undefined ? defaultValue : '';
  }
  return value;
}

/**
 * Retorna valor padrão baseado no tipo de campo
 */
function getDefaultValue(fieldType) {
  switch (fieldType) {
    case FIELD_TYPES.NUMBER:
    case FIELD_TYPES.CURRENCY_BRL:
    case FIELD_TYPES.PERCENT:
      return 0;
    case FIELD_TYPES.BOOLEAN:
      return false;
    case FIELD_TYPES.TEXT:
    case FIELD_TYPES.YEAR_MONTH_DAY:
    case FIELD_TYPES.YEAR_MONTH_DAY_HOUR:
    default:
      return '';
  }
}

/**
 * Valida se é um número válido
 */
function isValidNumber(value) {
  return value !== null && value !== undefined && !isNaN(parseFloat(value));
}

/**
 * Converte para número de forma segura
 */
function toNumber(value, defaultValue) {
  if (!isValidNumber(value)) {
    return defaultValue !== undefined ? defaultValue : 0;
  }
  return parseFloat(value);
}

// ==========================================
// Formatação de Datas
// ==========================================

/**
 * Formata data para YYYYMMDD (formato Looker Studio)
 */
function formatDate(dateString) {
  if (!dateString) return '';

  try {
    var date = new Date(dateString);

    // Verifica se é data válida
    if (isNaN(date.getTime())) {
      return '';
    }

    var year = date.getFullYear();
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);

    return year + month + day;
  } catch (e) {
    LOGGING.warn('Error formatting date: ' + dateString);
    return '';
  }
}

/**
 * Formata datetime para YYYYMMDDHH (formato Looker Studio)
 */
function formatDateTime(dateString) {
  if (!dateString) return '';

  try {
    var date = new Date(dateString);

    // Verifica se é data válida
    if (isNaN(date.getTime())) {
      return '';
    }

    var year = date.getFullYear();
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);
    var hour = ('0' + date.getHours()).slice(-2);

    return year + month + day + hour;
  } catch (e) {
    LOGGING.warn('Error formatting datetime: ' + dateString);
    return '';
  }
}

// ==========================================
// Manipulação de Arrays JSONB
// ==========================================

/**
 * Soma valores de um campo específico em array JSONB
 */
function sumJsonbArray(jsonbArray, field) {
  if (!jsonbArray || !Array.isArray(jsonbArray) || jsonbArray.length === 0) {
    return 0;
  }

  var total = 0;
  jsonbArray.forEach(function(item) {
    if (item && item[field]) {
      var value = toNumber(item[field], 0);
      total += value;
    }
  });

  return total;
}

/**
 * Retorna a data mais recente de um array JSONB
 */
function getLastDate(jsonbArray, field) {
  if (!jsonbArray || !Array.isArray(jsonbArray) || jsonbArray.length === 0) {
    return '';
  }

  var dates = jsonbArray
    .filter(function(item) {
      return item && item[field];
    })
    .map(function(item) {
      return new Date(item[field]);
    })
    .filter(function(date) {
      return !isNaN(date.getTime());
    })
    .sort(function(a, b) {
      return b - a; // Ordem decrescente
    });

  return dates.length > 0 ? formatDate(dates[0]) : '';
}

/**
 * Conta elementos válidos em array JSONB
 */
function countJsonbArray(jsonbArray) {
  if (!jsonbArray || !Array.isArray(jsonbArray)) {
    return 0;
  }
  return jsonbArray.length;
}

// ==========================================
// Cache Management
// ==========================================

/**
 * Busca dados com cache
 */
function cachedFetch(url) {
  var cache = CacheService.getUserCache();
  var cacheKey = 'api_' + Utilities.base64Encode(url);

  // Tenta pegar do cache
  var cached = cache.get(cacheKey);
  if (cached) {
    LOGGING.info('Cache hit for: ' + url);
    return JSON.parse(cached);
  }

  // Não tem cache, busca da API
  LOGGING.info('Cache miss, fetching: ' + url);

  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true
    });

    var responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      throw new Error('HTTP ' + responseCode + ': ' + response.getContentText());
    }

    var data = JSON.parse(response.getContentText());

    // Salva no cache
    cache.put(cacheKey, JSON.stringify(data), CONFIG.CACHE_DURATION_SECONDS);

    return data;
  } catch (e) {
    LOGGING.error('Failed to fetch URL: ' + url, e);
    throw e;
  }
}

/**
 * Limpa cache do usuário
 */
function clearCache() {
  var cache = CacheService.getUserCache();
  cache.removeAll(cache.getKeys());
  LOGGING.info('Cache cleared successfully');
}

// ==========================================
// Validação de URL
// ==========================================

/**
 * Valida se URL está em formato correto
 */
function isValidUrl(url) {
  if (!url) return false;

  // Remove trailing slash
  url = url.replace(/\/$/, '');

  // Regex simples para validar URL
  var urlPattern = /^https?:\/\/.+/i;
  return urlPattern.test(url);
}

/**
 * Normaliza URL removendo trailing slash
 */
function normalizeUrl(url) {
  if (!url) return '';
  return url.replace(/\/$/, '');
}

// ==========================================
// Error Handling
// ==========================================

/**
 * Cria mensagem de erro amigável
 */
function createUserError(message, details) {
  LOGGING.error(message, details);

  return cc.newUserError()
    .setText(message)
    .setDebugText(details || message)
    .throwException();
}

/**
 * Trata erros de fetch da API
 */
function handleFetchError(error, endpoint) {
  var message = ERROR_MESSAGES.API_CONNECTION_FAILED;

  if (error.message && error.message.indexOf('HTTP') !== -1) {
    message = 'Erro ao acessar API: ' + error.message;
  }

  return createUserError(message, 'Endpoint: ' + endpoint + ', Error: ' + error.toString());
}

// ==========================================
// Payment Status Calculation
// ==========================================

/**
 * Calcula status de pagamento unificado
 */
function calculatePaymentStatus(record, isIncome) {
  var movements = isIncome ? record.receipts : record.payments;
  var balance = toNumber(record.balance_amount, 0);
  var original = toNumber(record.original_amount, 0);

  // Sem movimentações
  if (!movements || movements.length === 0) {
    return CONFIG.STATUS_PENDING;
  }

  // Saldo zerado ou quase (tolerância de R$ 0.01)
  if (balance <= 0.01) {
    return CONFIG.STATUS_PAID;
  }

  // Tem movimentações mas ainda tem saldo
  if (balance < original) {
    return CONFIG.STATUS_PARTIAL;
  }

  return CONFIG.STATUS_PENDING;
}

// ==========================================
// Data Validation
// ==========================================

/**
 * Valida estrutura de resposta da API
 */
function validateApiResponse(response, endpoint) {
  if (!response) {
    throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED + ' (' + endpoint + ')');
  }

  if (typeof response !== 'object') {
    throw new Error(ERROR_MESSAGES.INVALID_JSON_RESPONSE + ' (' + endpoint + ')');
  }

  if (response.success === false) {
    throw new Error('API returned error: ' + (response.error || 'Unknown error'));
  }

  if (!response.data || !Array.isArray(response.data)) {
    throw new Error('Invalid response structure. Expected "data" array.');
  }

  return true;
}

// ==========================================
// String Utilities
// ==========================================

/**
 * Trunca string para tamanho máximo
 */
function truncateString(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Remove espaços extras e trim
 */
function cleanString(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}