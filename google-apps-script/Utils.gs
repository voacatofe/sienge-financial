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

    // ✅ FIX: Usa métodos UTC para garantir data correta independente do timezone
    var year = date.getUTCFullYear();
    var month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
    var day = ('0' + date.getUTCDate()).slice(-2);

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

    // ✅ FIX: Usa métodos UTC para garantir datetime correto independente do timezone
    var year = date.getUTCFullYear();
    var month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
    var day = ('0' + date.getUTCDate()).slice(-2);
    var hour = ('0' + date.getUTCHours()).slice(-2);

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
  LOGGING.info('Fetching URL: ' + url);

  var cache = CacheService.getUserCache();
  var cacheKey = 'api_' + Utilities.base64Encode(url);

  // Tenta pegar do cache
  var cached = cache.get(cacheKey);
  if (cached) {
    LOGGING.info('Cache hit for: ' + url);
    try {
      return JSON.parse(cached);
    } catch (e) {
      LOGGING.warn('Failed to parse cached data, fetching fresh');
      cache.remove(cacheKey);
    }
  }

  // Não tem cache, busca da API
  LOGGING.info('Cache miss, fetching: ' + url);

  try {
    var options = {
      'method': 'GET',
      'muteHttpExceptions': true,
      'contentType': 'application/json',
      'headers': {
        'Accept': 'application/json',
        // ✅ PERFORMANCE: Ativa compressão GZIP (reduz tráfego em 60-80%)
        'Accept-Encoding': 'gzip, deflate'
      }
    };

    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var contentText = response.getContentText();

    LOGGING.info('Response code: ' + responseCode);
    LOGGING.info('Response length: ' + contentText.length);

    if (responseCode !== 200) {
      LOGGING.error('HTTP error ' + responseCode + ': ' + contentText.substring(0, 500));
      throw new Error('HTTP ' + responseCode + ': ' + contentText.substring(0, 200));
    }

    if (!contentText || contentText.length === 0) {
      throw new Error('Empty response from API');
    }

    var data = JSON.parse(contentText);

    // Salva no cache
    try {
      cache.put(cacheKey, JSON.stringify(data), CONFIG.CACHE_DURATION_SECONDS);
    } catch (cacheError) {
      LOGGING.warn('Failed to cache response: ' + cacheError);
      // Continue mesmo se cache falhar
    }

    return data;
  } catch (e) {
    LOGGING.error('Failed to fetch URL: ' + url);
    LOGGING.error('Error details: ' + e.toString());
    throw new Error('API fetch failed: ' + e.message + ' (URL: ' + url + ')');
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

// ==========================================
// Testes de Validação
// ==========================================

/**
 * Testa formatação de datas após correção de timezone
 * Execute esta função para validar que as datas estão corretas
 */
function testDateFormatting() {
  Logger.log('=== TESTE DE FORMATAÇÃO DE DATAS (Pós-Fix UTC) ===');
  Logger.log('Timezone do script: ' + Session.getScriptTimeZone());
  Logger.log('');

  var testCases = [
    {
      input: '2025-09-24T00:00:00Z',
      expected: '20250924',
      description: 'Data normal - 24/09/2025'
    },
    {
      input: '2025-01-15T00:00:00Z',
      expected: '20250115',
      description: 'Meia-noite UTC - 15/01/2025'
    },
    {
      input: '2025-02-01T00:00:00Z',
      expected: '20250201',
      description: 'Virada de mês - 01/02/2025'
    },
    {
      input: '2025-08-31T00:00:00Z',
      expected: '20250831',
      description: 'Último dia do mês - 31/08/2025'
    },
    {
      input: '2026-01-01T00:00:00Z',
      expected: '20260101',
      description: 'Virada de ano - 01/01/2026'
    },
    {
      input: '2025-12-31T23:59:59Z',
      expected: '20251231',
      description: 'Último segundo do ano - 31/12/2025'
    },
    {
      input: '2024-02-29T00:00:00Z',
      expected: '20240229',
      description: 'Ano bissexto - 29/02/2024'
    },
    {
      input: null,
      expected: '',
      description: 'Null input (deve retornar vazio)'
    },
    {
      input: '',
      expected: '',
      description: 'Empty string (deve retornar vazio)'
    },
    {
      input: 'invalid-date',
      expected: '',
      description: 'Data inválida (deve retornar vazio)'
    }
  ];

  var passed = 0;
  var failed = 0;

  testCases.forEach(function(test) {
    var result = formatDate(test.input);
    var status = result === test.expected ? '✅ PASS' : '❌ FAIL';

    if (result === test.expected) {
      passed++;
    } else {
      failed++;
    }

    Logger.log(status + ': ' + test.description);
    Logger.log('  Input: ' + test.input);
    Logger.log('  Expected: ' + test.expected);
    Logger.log('  Got: ' + result);

    if (result !== test.expected) {
      Logger.log('  ⚠️ DIFERENÇA DETECTADA!');
    }
    Logger.log('');
  });

  Logger.log('=== RESULTADO DOS TESTES ===');
  Logger.log('Passou: ' + passed + '/' + testCases.length);
  Logger.log('Falhou: ' + failed + '/' + testCases.length);
  Logger.log('');

  if (failed === 0) {
    Logger.log('✅ TODOS OS TESTES PASSARAM! Bug de timezone corrigido.');
  } else {
    Logger.log('❌ ALGUNS TESTES FALHARAM! Verifique a implementação.');
  }

  return failed === 0;
}

/**
 * Testa formatação de datetimes após correção de timezone
 */
function testDateTimeFormatting() {
  Logger.log('=== TESTE DE FORMATAÇÃO DE DATETIMES (Pós-Fix UTC) ===');

  var testCases = [
    {
      input: '2025-09-24T14:30:00Z',
      expected: '2025092414',
      description: 'DateTime com hora - 24/09/2025 14:30'
    },
    {
      input: '2025-01-01T00:00:00Z',
      expected: '2025010100',
      description: 'Meia-noite ano novo - 01/01/2025 00:00'
    },
    {
      input: '2025-12-31T23:00:00Z',
      expected: '2025123123',
      description: 'Último dia ano - 31/12/2025 23:00'
    }
  ];

  var passed = 0;
  var failed = 0;

  testCases.forEach(function(test) {
    var result = formatDateTime(test.input);
    var status = result === test.expected ? '✅ PASS' : '❌ FAIL';

    if (result === test.expected) {
      passed++;
    } else {
      failed++;
    }

    Logger.log(status + ': ' + test.description);
    Logger.log('  Expected: ' + test.expected + ' | Got: ' + result);
  });

  Logger.log('');
  Logger.log('DateTime Tests: ' + passed + '/' + testCases.length + ' passed');

  return failed === 0;
}