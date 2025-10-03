/**
 * Tests.gs
 * Suite de Testes Unitários para o Sienge Financial Connector
 *
 * Execute: testAll() para rodar todos os testes
 */

// ==========================================
// Test Runner Principal
// ==========================================

/**
 * Executa todos os testes e gera relatório
 */
function testAll() {
  Logger.log('='.repeat(60));
  Logger.log('🧪 INICIANDO SUITE DE TESTES');
  Logger.log('='.repeat(60));
  Logger.log('');

  var results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  // Executar todos os grupos de testes
  var testGroups = [
    { name: 'Config', fn: testConfigValidation },
    { name: 'URL Building', fn: testUrlBuilding },
    { name: 'Data Transformation', fn: testDataTransformation },
    { name: 'Field Mapping', fn: testFieldMapping },
    { name: 'Date Formatting', fn: testDateFormatting },
    { name: 'Cache Validation', fn: testCacheValidation },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Metrics Calculation', fn: testMetricsCalculation }
  ];

  testGroups.forEach(function(group) {
    Logger.log('📋 Testing: ' + group.name);
    try {
      var groupResult = group.fn();
      results.total += groupResult.total;
      results.passed += groupResult.passed;
      results.failed += groupResult.failed;

      if (groupResult.errors.length > 0) {
        results.errors = results.errors.concat(groupResult.errors);
      }

      Logger.log('   ✅ Passed: ' + groupResult.passed + ' | ❌ Failed: ' + groupResult.failed);
    } catch (e) {
      results.failed++;
      results.errors.push(group.name + ': ' + e.message);
      Logger.log('   ❌ ERROR: ' + e.message);
    }
    Logger.log('');
  });

  // Relatório final
  Logger.log('='.repeat(60));
  Logger.log('📊 RELATÓRIO FINAL');
  Logger.log('='.repeat(60));
  Logger.log('Total de testes: ' + results.total);
  Logger.log('✅ Passou: ' + results.passed);
  Logger.log('❌ Falhou: ' + results.failed);
  Logger.log('Taxa de sucesso: ' + ((results.passed / results.total) * 100).toFixed(1) + '%');

  if (results.errors.length > 0) {
    Logger.log('');
    Logger.log('⚠️ ERROS:');
    results.errors.forEach(function(error) {
      Logger.log('  • ' + error);
    });
  }

  Logger.log('');
  Logger.log(results.failed === 0 ? '✅ TODOS OS TESTES PASSARAM!' : '❌ ALGUNS TESTES FALHARAM');
  Logger.log('='.repeat(60));

  return results;
}

// ==========================================
// Helper Functions
// ==========================================

function assert(condition, message) {
  if (!condition) {
    throw new Error('Assertion failed: ' + message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error('Expected "' + expected + '" but got "' + actual + '" - ' + message);
  }
}

// ==========================================
// Test Groups
// ==========================================

/**
 * Testa validação de configuração
 */
function testConfigValidation() {
  var results = { total: 0, passed: 0, failed: 0, errors: [] };

  var tests = [
    {
      name: 'URL válida aceita',
      fn: function() {
        assert(isValidUrl('http://localhost:8000'), 'URL válida não reconhecida');
        assert(isValidUrl('https://api.empresa.com'), 'HTTPS válido não reconhecido');
      }
    },
    {
      name: 'URL inválida rejeitada',
      fn: function() {
        assert(!isValidUrl(''), 'URL vazia aceita');
        assert(!isValidUrl('api.com'), 'URL sem protocolo aceita');
        assert(!isValidUrl(null), 'null aceito');
      }
    },
    {
      name: 'URL normalizada corretamente',
      fn: function() {
        assertEqual(normalizeUrl('http://api.com/'), 'http://api.com', 'Trailing slash não removido');
        assertEqual(normalizeUrl('https://api.com'), 'https://api.com', 'URL sem slash alterada');
      }
    }
  ];

  tests.forEach(function(test) {
    results.total++;
    try {
      test.fn();
      results.passed++;
    } catch (e) {
      results.failed++;
      results.errors.push(test.name + ': ' + e.message);
    }
  });

  return results;
}

/**
 * Testa construção de URLs com filtros
 */
function testUrlBuilding() {
  var results = { total: 0, passed: 0, failed: 0, errors: [] };

  var tests = [
    {
      name: 'URL básica com paginação',
      fn: function() {
        var url = buildQueryUrl('http://api.com/data', null, 1000, 0);
        assert(url.indexOf('limit=1000') !== -1, 'Limit não incluído');
        assert(url.indexOf('offset=0') !== -1, 'Offset não incluído');
      }
    },
    {
      name: 'Filtros de data aplicados',
      fn: function() {
        var filters = {
          dateRange: {
            startDate: '20250101',
            endDate: '20250131'
          }
        };
        var url = buildQueryUrl('http://api.com/data', filters, 1000, 0);
        assert(url.indexOf('start_date=2025-01-01') !== -1, 'Start date não convertido');
        assert(url.indexOf('end_date=2025-01-31') !== -1, 'End date não convertido');
      }
    },
    {
      name: 'Limites de segurança aplicados',
      fn: function() {
        var url = buildQueryUrl('http://api.com/data', null, 999999, -100);
        assert(url.indexOf('limit=1000') !== -1, 'Limit não limitado');
        assert(url.indexOf('offset=0') !== -1, 'Offset negativo não corrigido');
      }
    }
  ];

  tests.forEach(function(test) {
    results.total++;
    try {
      test.fn();
      results.passed++;
    } catch (e) {
      results.failed++;
      results.errors.push(test.name + ': ' + e.message);
    }
  });

  return results;
}

/**
 * Testa transformação de dados
 */
function testDataTransformation() {
  var results = { total: 0, passed: 0, failed: 0, errors: [] };

  var tests = [
    {
      name: 'Número seguro convertido',
      fn: function() {
        assertEqual(toNumber('123.45', 0), 123.45, 'Número válido não convertido');
        assertEqual(toNumber('invalid', 0), 0, 'String inválida não retornou default');
        assertEqual(toNumber(null, 10), 10, 'Null não retornou default');
      }
    },
    {
      name: 'String segura sanitizada',
      fn: function() {
        assertEqual(safeValue('test', ''), 'test', 'String válida alterada');
        assertEqual(safeValue(null, 'default'), 'default', 'Null não retornou default');
        assertEqual(safeValue('', 'default'), 'default', 'String vazia não retornou default');
      }
    },
    {
      name: 'Status de pagamento calculado',
      fn: function() {
        var recordPago = { balance_amount: 0, original_amount: 1000, receipts: [{netAmount: 1000}] };
        var recordPendente = { balance_amount: 1000, original_amount: 1000, receipts: [] };

        assertEqual(calculatePaymentStatus(recordPago, true), CONFIG.STATUS_PAID, 'Pago não identificado');
        assertEqual(calculatePaymentStatus(recordPendente, true), CONFIG.STATUS_PENDING, 'Pendente não identificado');
      }
    }
  ];

  tests.forEach(function(test) {
    results.total++;
    try {
      test.fn();
      results.passed++;
    } catch (e) {
      results.failed++;
      results.errors.push(test.name + ': ' + e.message);
    }
  });

  return results;
}

/**
 * Testa mapeamento de campos
 */
function testFieldMapping() {
  var results = { total: 0, passed: 0, failed: 0, errors: [] };

  var tests = [
    {
      name: 'Campos básicos mapeados',
      fn: function() {
        assertEqual(mapLookerFieldToApiParam('company_id'), 'company_id', 'company_id não mapeado');
        assertEqual(mapLookerFieldToApiParam('company_name'), 'company_name', 'company_name não mapeado');
        assertEqual(mapLookerFieldToApiParam('project_id'), 'project_id', 'project_id não mapeado');
      }
    },
    {
      name: 'Campos de contraparte mapeados',
      fn: function() {
        assertEqual(mapLookerFieldToApiParam('cliente_id'), 'client_id', 'cliente_id não mapeado');
        assertEqual(mapLookerFieldToApiParam('credor_id'), 'creditor_id', 'credor_id não mapeado');
      }
    },
    {
      name: 'Campos específicos Income/Outcome mapeados',
      fn: function() {
        assertEqual(mapLookerFieldToApiParam('income_periodicity_type'), 'periodicity_type', 'income field não mapeado');
        assertEqual(mapLookerFieldToApiParam('outcome_consistency_status'), 'consistency_status', 'outcome field não mapeado');
      }
    },
    {
      name: 'Campo inexistente retorna null',
      fn: function() {
        assertEqual(mapLookerFieldToApiParam('campo_invalido'), null, 'Campo inválido não retornou null');
      }
    }
  ];

  tests.forEach(function(test) {
    results.total++;
    try {
      test.fn();
      results.passed++;
    } catch (e) {
      results.failed++;
      results.errors.push(test.name + ': ' + e.message);
    }
  });

  return results;
}

/**
 * Testa formatação de datas
 */
function testDateFormatting() {
  var results = { total: 0, passed: 0, failed: 0, errors: [] };

  var tests = [
    {
      name: 'Data formatada corretamente',
      fn: function() {
        assertEqual(formatDate('2025-01-15T00:00:00Z'), '20250115', 'Data não formatada');
        assertEqual(formatDate('2025-12-31T23:59:59Z'), '20251231', 'Data fim de ano incorreta');
      }
    },
    {
      name: 'Data inválida retorna vazio',
      fn: function() {
        assertEqual(formatDate('invalid'), '', 'Data inválida não retornou vazio');
        assertEqual(formatDate(null), '', 'Null não retornou vazio');
        assertEqual(formatDate(''), '', 'String vazia não retornou vazio');
      }
    },
    {
      name: 'DateTime formatado corretamente',
      fn: function() {
        assertEqual(formatDateTime('2025-01-15T14:30:00Z'), '2025011514', 'DateTime não formatado');
      }
    }
  ];

  tests.forEach(function(test) {
    results.total++;
    try {
      test.fn();
      results.passed++;
    } catch (e) {
      results.failed++;
      results.errors.push(test.name + ': ' + e.message);
    }
  });

  return results;
}

/**
 * Testa validação de cache
 */
function testCacheValidation() {
  var results = { total: 0, passed: 0, failed: 0, errors: [] };

  var tests = [
    {
      name: 'Cache válido aceito',
      fn: function() {
        var validCache = {
          success: true,
          data: [{ id: 1 }, { id: 2 }]
        };
        assert(validateCachedData(validCache), 'Cache válido rejeitado');
      }
    },
    {
      name: 'Cache inválido rejeitado',
      fn: function() {
        assert(!validateCachedData(null), 'Null aceito');
        assert(!validateCachedData({ data: 'not_array' }), 'Estrutura inválida aceita');
        assert(!validateCachedData({ success: true }), 'Sem data aceito');
      }
    },
    {
      name: 'Limite de tamanho aplicado',
      fn: function() {
        var largeCache = {
          success: true,
          data: new Array(150000) // Mais que o limite de 100k
        };
        assert(!validateCachedData(largeCache), 'Cache muito grande aceito');
      }
    }
  ];

  tests.forEach(function(test) {
    results.total++;
    try {
      test.fn();
      results.passed++;
    } catch (e) {
      results.failed++;
      results.errors.push(test.name + ': ' + e.message);
    }
  });

  return results;
}

/**
 * Testa tratamento de erros
 */
function testErrorHandling() {
  var results = { total: 0, passed: 0, failed: 0, errors: [] };

  var tests = [
    {
      name: 'Mensagens de erro existem',
      fn: function() {
        assert(ERROR_MESSAGES.MISSING_API_URL, 'Mensagem MISSING_API_URL não existe');
        assert(ERROR_MESSAGES.INVALID_API_URL, 'Mensagem INVALID_API_URL não existe');
        assert(ERROR_MESSAGES.API_CONNECTION_FAILED, 'Mensagem API_CONNECTION_FAILED não existe');
      }
    },
    {
      name: 'Mensagens contêm ajuda',
      fn: function() {
        assert(ERROR_MESSAGES.INVALID_API_URL.indexOf('Formato esperado') !== -1, 'Sem dica de formato');
        assert(ERROR_MESSAGES.API_CONNECTION_FAILED.indexOf('Verifique') !== -1, 'Sem dica de troubleshooting');
      }
    }
  ];

  tests.forEach(function(test) {
    results.total++;
    try {
      test.fn();
      results.passed++;
    } catch (e) {
      results.failed++;
      results.errors.push(test.name + ': ' + e.message);
    }
  });

  return results;
}

/**
 * Testa cálculo de métricas (aging, inadimplência)
 */
function testMetricsCalculation() {
  var results = { total: 0, passed: 0, failed: 0, errors: [] };

  var tests = [
    {
      name: 'Dias em atraso calculado corretamente',
      fn: function() {
        // Data vencida há 10 dias
        var pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 10);

        var record = {
          due_date: pastDate.toISOString(),
          balance_amount: 1000
        };

        var dias = getFieldValue(record, 'dias_atraso', true, true, 'due_date');
        assert(dias >= 9 && dias <= 11, 'Dias em atraso incorreto: ' + dias); // Tolerância de 1 dia
      }
    },
    {
      name: 'Taxa de inadimplência calculada',
      fn: function() {
        var record = {
          original_amount: 1000,
          balance_amount: 300
        };

        var taxa = getFieldValue(record, 'taxa_inadimplencia', true, true, 'due_date');
        assertEqual(taxa, 30, 'Taxa incorreta: esperado 30%, got ' + taxa);
      }
    },
    {
      name: 'Faixa de aging classificada',
      fn: function() {
        var pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 45);

        var record = {
          due_date: pastDate.toISOString(),
          balance_amount: 1000
        };

        var faixa = getFieldValue(record, 'faixa_aging', true, true, 'due_date');
        assertEqual(faixa, '31-60 dias', 'Faixa incorreta: ' + faixa);
      }
    }
  ];

  tests.forEach(function(test) {
    results.total++;
    try {
      test.fn();
      results.passed++;
    } catch (e) {
      results.failed++;
      results.errors.push(test.name + ': ' + e.message);
    }
  });

  return results;
}
