/**
 * TEST.gs
 * Funções de teste para debugging
 * REMOVER ANTES DO DEPLOY FINAL
 */

/**
 * Teste 1: Fetch simples
 */
function test1_SimpleFetch() {
  try {
    LOGGING.info('=== TESTE 1: Simple Fetch ===');

    var url = CONFIG.API_URL + '/api/income?limit=1';
    var response = cachedFetch(url);

    LOGGING.info('✅ Success! Total: ' + response.total);
    return 'SUCCESS: ' + response.total + ' records';

  } catch (e) {
    LOGGING.error('❌ ERRO: ' + e.message);
    return 'ERROR: ' + e.message;
  }
}

/**
 * Teste 2: Validação de resposta
 */
function test2_ValidateResponse() {
  try {
    LOGGING.info('=== TESTE 2: Validate Response ===');

    var url = CONFIG.API_URL + '/api/income?limit=1';
    var response = cachedFetch(url);

    // Validar
    validateApiResponse(response, url);

    LOGGING.info('✅ Validation passed!');
    return 'SUCCESS: Validation OK';

  } catch (e) {
    LOGGING.error('❌ ERRO: ' + e.message);
    return 'ERROR: ' + e.message;
  }
}

/**
 * Teste 3: Fetch completo com paginação
 */
function test3_FetchWithPagination() {
  try {
    LOGGING.info('=== TESTE 3: Fetch with Pagination ===');

    var incomeData = fetchIncomeData(CONFIG.API_URL);

    LOGGING.info('✅ Income records fetched: ' + incomeData.length);
    return 'SUCCESS: ' + incomeData.length + ' income records';

  } catch (e) {
    LOGGING.error('❌ ERRO: ' + e.message);
    return 'ERROR: ' + e.message;
  }
}

/**
 * Teste 4: Fluxo completo getData
 */
function test4_CompleteGetData() {
  try {
    LOGGING.info('=== TESTE 4: Complete getData Flow ===');

    // Simular request do Looker Studio
    var mockRequest = {
      configParams: {
        includeIncome: 'true',
        includeOutcome: 'true'
      },
      fields: [
        { name: 'record_type' },
        { name: 'id' },
        { name: 'company_name' },
        { name: 'original_amount' }
      ]
    };

    // Buscar dados
    var allRecords = fetchAllData(mockRequest.configParams);
    LOGGING.info('✅ Total records: ' + allRecords.length);

    // Transformar
    var rows = transformRecords(allRecords, mockRequest.fields, true);
    LOGGING.info('✅ Transformed rows: ' + rows.length);

    return 'SUCCESS: ' + rows.length + ' rows transformed';

  } catch (e) {
    LOGGING.error('❌ ERRO: ' + e.message);
    LOGGING.error('Stack: ' + e.stack);
    return 'ERROR: ' + e.message;
  }
}

/**
 * Teste 5: Schema completo
 */
function test5_SchemaValidation() {
  try {
    LOGGING.info('=== TESTE 5: Schema Validation ===');

    var schema = getFields().build();

    LOGGING.info('✅ Schema has ' + schema.length + ' fields');

    // Listar alguns campos (primeiros 5)
    var fieldNames = ['record_type', 'id', 'company_name', 'original_amount', 'due_date'];
    for (var i = 0; i < fieldNames.length; i++) {
      LOGGING.info('  - Field: ' + fieldNames[i]);
    }

    return 'SUCCESS: ' + schema.length + ' fields in schema';

  } catch (e) {
    LOGGING.error('❌ ERRO: ' + e.message);
    return 'ERROR: ' + e.message;
  }
}

/**
 * Executar todos os testes
 */
function runAllTests() {
  LOGGING.info('');
  LOGGING.info('##################################################');
  LOGGING.info('### EXECUTANDO TODOS OS TESTES                 ###');
  LOGGING.info('##################################################');
  LOGGING.info('');

  var results = [];

  results.push('Test 1: ' + test1_SimpleFetch());
  results.push('Test 2: ' + test2_ValidateResponse());
  results.push('Test 3: ' + test3_FetchWithPagination());
  results.push('Test 4: ' + test4_CompleteGetData());
  results.push('Test 5: ' + test5_SchemaValidation());

  LOGGING.info('');
  LOGGING.info('##################################################');
  LOGGING.info('### RESULTADOS                                  ###');
  LOGGING.info('##################################################');
  results.forEach(function(result) {
    LOGGING.info(result);
  });
  LOGGING.info('##################################################');

  return results.join('\n');
}