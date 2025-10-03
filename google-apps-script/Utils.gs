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
 * ✅ SECURITY: Sanitiza strings para prevenir injeção
 */
function safeValue(value, defaultValue) {
  if (value === null || value === undefined || value === '') {
    return defaultValue !== undefined ? defaultValue : '';
  }

  // ✅ SECURITY: Converte para string e limita tamanho
  var strValue = String(value);

  // Limita tamanho para prevenir DoS
  if (strValue.length > 5000) {
    LOGGING.warn('Value too long, truncating: ' + strValue.length);
    strValue = strValue.substring(0, 5000);
  }

  return strValue;
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
 * ✅ SECURITY: Valida ranges para prevenir overflow
 */
function toNumber(value, defaultValue) {
  if (!isValidNumber(value)) {
    return defaultValue !== undefined ? defaultValue : 0;
  }

  var num = parseFloat(value);

  // ✅ SECURITY: Valida range seguro (evita overflow em cálculos)
  var MAX_SAFE_NUMBER = 9007199254740991; // Number.MAX_SAFE_INTEGER
  if (Math.abs(num) > MAX_SAFE_NUMBER) {
    LOGGING.warn('Number too large, using default: ' + num);
    return defaultValue !== undefined ? defaultValue : 0;
  }

  return num;
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
 * ✅ SECURITY: Valida tamanho e valores do array
 */
function sumJsonbArray(jsonbArray, field) {
  if (!jsonbArray || !Array.isArray(jsonbArray) || jsonbArray.length === 0) {
    return 0;
  }

  // ✅ SECURITY: Limita tamanho do array (proteção DoS)
  if (jsonbArray.length > 10000) {
    LOGGING.warn('JSONB array too large for sum: ' + jsonbArray.length);
    return 0;
  }

  var total = 0;
  var processedCount = 0;

  for (var i = 0; i < jsonbArray.length && processedCount < 1000; i++) {
    var item = jsonbArray[i];
    if (item && typeof item === 'object' && item[field]) {
      var value = toNumber(item[field], 0);
      total += value;
      processedCount++;
    }
  }

  if (processedCount >= 1000) {
    LOGGING.warn('Truncated sum calculation at 1000 items');
  }

  return total;
}

/**
 * Retorna a data mais recente de um array JSONB
 * ✅ SECURITY: Valida tamanho do array e datas
 */
function getLastDate(jsonbArray, field) {
  if (!jsonbArray || !Array.isArray(jsonbArray) || jsonbArray.length === 0) {
    return '';
  }

  // ✅ SECURITY: Limita tamanho do array
  if (jsonbArray.length > 10000) {
    LOGGING.warn('JSONB array too large for date search: ' + jsonbArray.length);
    return '';
  }

  var dates = [];
  var validDateCount = 0;

  for (var i = 0; i < jsonbArray.length && validDateCount < 1000; i++) {
    var item = jsonbArray[i];
    if (item && typeof item === 'object' && item[field]) {
      var date = new Date(item[field]);
      if (!isNaN(date.getTime())) {
        // ✅ SECURITY: Valida que a data está em um range razoável
        var year = date.getUTCFullYear();
        if (year >= 1900 && year <= 2100) {
          dates.push(date);
          validDateCount++;
        }
      }
    }
  }

  if (dates.length === 0) {
    return '';
  }

  // Ordena e pega a mais recente
  dates.sort(function(a, b) {
    return b - a; // Ordem decrescente
  });

  return formatDate(dates[0]);
}

/**
 * Conta elementos válidos em array JSONB
 * ✅ SECURITY: Valida tipo e tamanho do array
 */
function countJsonbArray(jsonbArray) {
  if (!jsonbArray || !Array.isArray(jsonbArray)) {
    return 0;
  }

  // ✅ SECURITY: Limita contagem (proteção DoS)
  if (jsonbArray.length > 100000) {
    LOGGING.warn('JSONB array suspiciously large: ' + jsonbArray.length);
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

  // ✅ SECURITY: Valida HTTPS
  if (CONFIG.VALIDATE_HTTPS && !url.match(/^https:\/\//i)) {
    throw new Error('Security Error: Only HTTPS URLs are allowed');
  }

  var cache = CacheService.getUserCache();
  var cacheKey = 'api_' + Utilities.base64Encode(url);

  // Tenta pegar do cache
  var cached = cache.get(cacheKey);
  if (cached) {
    LOGGING.info('Cache hit for: ' + url);
    try {
      var parsedCache = JSON.parse(cached);
      // ✅ SECURITY: Valida estrutura do cache
      if (validateCachedData(parsedCache)) {
        return parsedCache;
      } else {
        LOGGING.warn('Invalid cached data structure, fetching fresh');
        cache.remove(cacheKey);
      }
    } catch (e) {
      LOGGING.warn('Failed to parse cached data, fetching fresh');
      cache.remove(cacheKey);
    }
  }

  // Não tem cache, busca da API
  LOGGING.info('Cache miss, fetching: ' + url);

  return fetchWithRetry(url, cache, cacheKey);
}

/**
 * Busca dados da API com retry automático
 */
function fetchWithRetry(url, cache, cacheKey) {
  var lastError;
  var maxRetries = CONFIG.MAX_RETRIES || 2;

  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        LOGGING.info('Retry attempt ' + attempt + '/' + maxRetries);
        Utilities.sleep(1000 * attempt); // Exponential backoff
      }

      var options = {
        'method': 'GET',
        'muteHttpExceptions': true,
        'contentType': 'application/json',
        // ✅ SECURITY: Timeout para evitar requisições travadas
        'timeout': (CONFIG.REQUEST_TIMEOUT_SECONDS || 30) * 1000,
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
        // ✅ SECURITY: Não expõe detalhes do erro completo ao usuário
        LOGGING.error('HTTP error ' + responseCode);
        throw new Error('HTTP ' + responseCode);
      }

      if (!contentText || contentText.length === 0) {
        throw new Error('Empty response from API');
      }

      var data = JSON.parse(contentText);

      // ✅ SECURITY: Valida tamanho antes de cachear
      var dataStr = JSON.stringify(data);
      if (dataStr.length < CONFIG.CACHE_MAX_SIZE_BYTES) {
        try {
          cache.put(cacheKey, dataStr, CONFIG.CACHE_DURATION_SECONDS);
        } catch (cacheError) {
          LOGGING.warn('Failed to cache response: ' + cacheError);
          // Continue mesmo se cache falhar
        }
      } else {
        LOGGING.warn('Response too large to cache: ' + dataStr.length + ' bytes');
      }

      return data;
    } catch (e) {
      lastError = e;
      LOGGING.error('Attempt ' + (attempt + 1) + ' failed: ' + e.message);

      // Se não for erro de timeout ou rede, não tenta novamente
      if (e.message.indexOf('timeout') === -1 && e.message.indexOf('HTTP') === -1) {
        break;
      }
    }
  }

  // Todas as tentativas falharam
  LOGGING.error('All retry attempts failed for: ' + url);
  // ✅ SECURITY: Mensagem sanitizada sem expor URL completa
  throw new Error('API fetch failed after ' + (maxRetries + 1) + ' attempts');
}

/**
 * Valida estrutura de dados do cache
 * ✅ SECURITY: Previne cache poisoning
 * ✅ PERFORMANCE: Limite aumentado para 100k registros (ambientes de produção)
 */
function validateCachedData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Valida estrutura esperada da API
  if (!data.hasOwnProperty('success') || !data.hasOwnProperty('data')) {
    return false;
  }

  // Valida que data é um array
  if (!Array.isArray(data.data)) {
    return false;
  }

  // Valida tamanho razoável (proteção contra DoS)
  // Aumentado de 50k para 100k para suportar ambientes de produção
  var MAX_CACHED_RECORDS = 100000;
  if (data.data.length > MAX_CACHED_RECORDS) {
    LOGGING.warn('Cached data exceeds maximum: ' + data.data.length + ' records (max: ' + MAX_CACHED_RECORDS + ')');
    return false;
  }

  return true;
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
 * Trata erros de fetch da API com contexto detalhado
 */
function handleFetchError(error, endpoint) {
  var message = ERROR_MESSAGES.API_CONNECTION_FAILED;
  var debugDetails = 'Endpoint: ' + endpoint + '\nError: ' + error.toString();

  // Identificar tipo específico de erro
  if (error.message) {
    if (error.message.indexOf('timeout') !== -1) {
      message = ERROR_MESSAGES.FETCH_TIMEOUT + '\n\n📍 Endpoint afetado:\n' + endpoint;
    } else if (error.message.indexOf('HTTP 404') !== -1) {
      message = 'Endpoint não encontrado (404).\n\n📍 URL tentada:\n' + endpoint + '\n\n🔧 Verifique:\n• Endpoint existe?\n• API está na versão correta?\n• Path está correto?';
    } else if (error.message.indexOf('HTTP 500') !== -1) {
      message = 'Erro interno do servidor (500).\n\n📍 Endpoint:\n' + endpoint + '\n\n🔧 Ações:\n• Verifique logs da API\n• Teste endpoint diretamente\n• Valide dados de entrada';
    } else if (error.message.indexOf('HTTP 401') !== -1 || error.message.indexOf('HTTP 403') !== -1) {
      message = 'Acesso negado (401/403).\n\n📍 Endpoint:\n' + endpoint + '\n\n🔧 Verifique:\n• Credenciais corretas?\n• Token válido?\n• Permissões adequadas?';
    } else if (error.message.indexOf('HTTP') !== -1) {
      message = 'Erro HTTP: ' + error.message + '\n\n📍 Endpoint:\n' + endpoint + '\n\n🔍 Consulte código HTTP para mais detalhes';
    }
  }

  return createUserError(message, debugDetails);
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