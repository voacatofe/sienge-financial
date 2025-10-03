/**
 * DataTransformer.gs
 * Transforma e Unifica Registros de Income e Outcome
 *
 * Lógica central de mapeamento inteligente:
 * - Campos comuns -> mesma coluna
 * - Campos diferentes -> colunas específicas
 * - Contraparte unificada (cliente/fornecedor)
 */

/**
 * Transforma array de registros para formato Looker Studio
 * ✅ PERFORMANCE: Cache de métricas calculadas + data otimizada
 */
function transformRecords(records, requestedFields, calculateMetrics, configParams) {
  LOGGING.info('Transforming ' + records.length + ' records...');

  // Extrair primary_date da configuração
  var primaryDateId = (configParams && configParams.primary_date) || 'due_date';
  LOGGING.info('[PRIMARY] transformRecords → primary_date=' + primaryDateId);

  // ✅ PERFORMANCE: Calcular 'today' UMA vez para todos os registros
  var todayDate = new Date();

  // ✅ PERFORMANCE: Verificar se aging está habilitado
  var calculateAging = configParams && configParams.calculateAging !== 'false';

  // ✅ PERFORMANCE: Extrair nomes dos campos solicitados para lazy evaluation
  var requestedFieldNames = requestedFields.map(function(f) { return f.name; });

  // Verificar se alguma métrica de aging foi solicitada
  var agingMetrics = ['dias_atraso', 'faixa_aging', 'taxa_inadimplencia', 'situacao_vencimento'];
  var needsAgingCache = calculateMetrics && calculateAging && agingMetrics.some(function(metric) {
    return requestedFieldNames.indexOf(metric) !== -1;
  });

  LOGGING.info('[LAZY] Aging cache needed: ' + needsAgingCache + ' (calculateMetrics=' + calculateMetrics + ', calculateAging=' + calculateAging + ')');

  var rows = records.map(function(record) {
    var isIncome = record._recordType === CONFIG.RECORD_TYPE_INCOME;

    // ✅ PERFORMANCE: Lazy evaluation - só criar cache se métricas de aging foram solicitadas
    if (needsAgingCache && !record._metricsCache) {
      record._metricsCache = {};
    }

    return transformSingleRecord(record, requestedFields, isIncome, calculateMetrics, primaryDateId, todayDate, calculateAging);
  });

  LOGGING.info('Transformation complete');

  return rows;
}

/**
 * Transforma um único registro para formato unificado
 * ✅ PERFORMANCE: Passa todayDate e calculateAging
 */
function transformSingleRecord(record, requestedFields, isIncome, calculateMetrics, primaryDateId, todayDate, calculateAging) {
  var values = [];

  requestedFields.forEach(function(field) {
    var value = getFieldValue(record, field.name, isIncome, calculateMetrics, primaryDateId, todayDate, calculateAging);
    values.push(value);
  });

  return { values: values };
}

/**
 * Retorna valor de um campo específico
 * Esta é a lógica CENTRAL de unificação
 * ✅ PERFORMANCE: Cache de métricas + todayDate pré-calculado + toggle aging
 */
function getFieldValue(record, fieldName, isIncome, calculateMetrics, primaryDateId, todayDate, calculateAging) {
  // ==========================================
  // GRUPO 1: IDENTIFICAÇÃO
  // ==========================================

  if (fieldName === 'record_type') {
    return isIncome ? CONFIG.RECORD_TYPE_INCOME_DISPLAY : CONFIG.RECORD_TYPE_OUTCOME_DISPLAY;
  }

  if (fieldName === 'id') {
    return safeValue(record.id, '');
  }

  if (fieldName === 'sync_date') {
    return formatDateTime(record.sync_date);
  }

  if (fieldName === 'installment_id') {
    return toNumber(record.installment_id, 0);
  }

  if (fieldName === 'bill_id') {
    return toNumber(record.bill_id, 0);
  }

  // ==========================================
  // GRUPO 2: EMPRESA (Campos comuns)
  // ==========================================

  var empresaFields = [
    'company_id', 'company_name',
    'business_area_id', 'business_area_name',
    'project_id', 'project_name',
    'group_company_id', 'group_company_name',
    'holding_id', 'holding_name',
    'subsidiary_id', 'subsidiary_name',
    'business_type_id', 'business_type_name',
    'cost_center_name'
  ];

  if (empresaFields.indexOf(fieldName) !== -1) {
    if (fieldName.indexOf('_id') !== -1) {
      return toNumber(record[fieldName], 0);
    }
    return safeValue(record[fieldName], '');
  }

  // ==========================================
  // GRUPO 3: CLIENTE (Income)
  // ==========================================

  if (fieldName === 'cliente_id') {
    return isIncome ? toNumber(record.client_id, 0) : null;
  }

  if (fieldName === 'cliente_nome') {
    return isIncome ? safeValue(record.client_name, '') : '';
  }

  // ==========================================
  // GRUPO 4: CREDOR (Outcome)
  // ==========================================

  if (fieldName === 'credor_id') {
    return !isIncome ? toNumber(record.creditor_id, 0) : null;
  }

  if (fieldName === 'credor_nome') {
    return !isIncome ? safeValue(record.creditor_name, '') : '';
  }

  // ==========================================
  // GRUPO 5: DOCUMENTO (Campos comuns)
  // ==========================================

  var documentFields = [
    'document_identification_id',
    'document_identification_name',
    'document_number',
    'document_forecast',
    'origin_id'
  ];

  if (documentFields.indexOf(fieldName) !== -1) {
    return safeValue(record[fieldName], '');
  }

  // ==========================================
  // GRUPO 6: VALORES FINANCEIROS (Campos comuns)
  // ==========================================

  var financeFields = [
    'original_amount',
    'discount_amount',
    'tax_amount',
    'balance_amount',
    'corrected_balance_amount'
  ];

  if (financeFields.indexOf(fieldName) !== -1) {
    return toNumber(record[fieldName], 0);
  }

  // ==========================================
  // CAMPO VIRTUAL: date_primary
  // ==========================================
  // Este campo mapeia dinamicamente para o campo real escolhido na configuração

  if (fieldName === 'date_primary') {
    // Buscar o valor do campo real escolhido
    var primaryValue = record[primaryDateId || 'due_date'];

    // Fallback: se o campo escolhido estiver vazio, tentar outros campos de data
    if (!primaryValue) {
      primaryValue = record.due_date || record.payment_date || record.issue_date ||
                     record.bill_date || record.installment_base_date || record.data_ultima_movimentacao;
    }

    return formatDate(primaryValue);
  }

  // ==========================================
  // GRUPO 7: DATAS (Campos comuns)
  // ==========================================

  var dateFields = [
    'due_date',
    'issue_date',
    'bill_date',
    'installment_base_date',
    'payment_date',
    'data_ultima_movimentacao'
  ];

  if (dateFields.indexOf(fieldName) !== -1) {
    return formatDate(record[fieldName]);
  }

  // ==========================================
  // GRUPO 8: INDEXAÇÃO (Campos comuns)
  // ==========================================

  if (fieldName === 'indexer_id') {
    return toNumber(record.indexer_id, 0);
  }

  if (fieldName === 'indexer_name') {
    return safeValue(record.indexer_name, '');
  }

  // ==========================================
  // GRUPO 9: MOVIMENTAÇÕES (Calculados)
  // ==========================================

  if (fieldName === 'total_movimentacoes') {
    if (!calculateMetrics) return 0;

    var movements = isIncome ? record.receipts : record.payments;
    return countJsonbArray(movements);
  }

  if (fieldName === 'valor_liquido') {
    if (!calculateMetrics) return 0;

    var movements = isIncome ? record.receipts : record.payments;
    return sumJsonbArray(movements, 'netAmount');
  }

  if (fieldName === 'data_ultima_movimentacao') {
    if (!calculateMetrics) return '';

    var movements = isIncome ? record.receipts : record.payments;
    return getLastDate(movements, 'paymentDate');
  }

  if (fieldName === 'status_parcela') {
    return safeValue(record.status_parcela, '');
  }

  if (fieldName === 'situacao_pagamento') {
    if (!calculateMetrics) return CONFIG.STATUS_PENDING;

    return calculatePaymentStatus(record, isIncome);
  }

  // ==========================================
  // NOVAS MÉTRICAS: Aging e Inadimplência
  // ==========================================

  if (fieldName === 'dias_atraso') {
    // ✅ PERFORMANCE: Retornar 0 se aging desabilitado
    if (!calculateMetrics || !calculateAging) return 0;

    // ✅ PERFORMANCE: Verificar cache primeiro
    if (record._metricsCache && record._metricsCache.dias_atraso !== undefined) {
      return record._metricsCache.dias_atraso;
    }

    // Calcula dias em atraso
    var dueDate = new Date(record.due_date);
    // ✅ PERFORMANCE: Usa todayDate pré-calculado ao invés de new Date()

    // Se não tem data de vencimento, retorna 0
    if (!record.due_date || isNaN(dueDate.getTime())) {
      if (record._metricsCache) record._metricsCache.dias_atraso = 0;
      return 0;
    }

    // Se já foi pago (saldo zero), não está em atraso
    var balance = toNumber(record.balance_amount, 0);
    if (balance <= 0.01) {
      if (record._metricsCache) record._metricsCache.dias_atraso = 0;
      return 0;
    }

    // Calcular diferença em dias
    var diffTime = todayDate - dueDate;
    var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Se ainda não venceu, retorna 0
    var result = diffDays > 0 ? diffDays : 0;

    // ✅ PERFORMANCE: Cachear resultado
    if (record._metricsCache) record._metricsCache.dias_atraso = result;

    return result;
  }

  if (fieldName === 'faixa_aging') {
    // ✅ PERFORMANCE: Retornar N/A se aging desabilitado
    if (!calculateMetrics || !calculateAging) return 'N/A';

    // ✅ PERFORMANCE: Verificar cache primeiro
    if (record._metricsCache && record._metricsCache.faixa_aging !== undefined) {
      return record._metricsCache.faixa_aging;
    }

    // ✅ PERFORMANCE: Reutiliza lógica de dias_atraso (que agora está cacheado!)
    var diasAtraso = getFieldValue(record, 'dias_atraso', isIncome, true, primaryDateId, todayDate, calculateAging);

    var faixa;
    if (diasAtraso === 0) {
      var balance = toNumber(record.balance_amount, 0);
      if (balance <= 0.01) {
        faixa = 'Pago';
      } else {
        faixa = 'Atual (A Vencer)';
      }
    } else if (diasAtraso <= 30) {
      faixa = '1-30 dias';
    } else if (diasAtraso <= 60) {
      faixa = '31-60 dias';
    } else if (diasAtraso <= 90) {
      faixa = '61-90 dias';
    } else {
      faixa = '90+ dias';
    }

    // ✅ PERFORMANCE: Cachear resultado
    if (record._metricsCache) record._metricsCache.faixa_aging = faixa;

    return faixa;
  }

  if (fieldName === 'taxa_inadimplencia') {
    // ✅ PERFORMANCE: Retornar 0 se aging desabilitado
    if (!calculateMetrics || !calculateAging) return 0;

    // ✅ PERFORMANCE: Verificar cache primeiro
    if (record._metricsCache && record._metricsCache.taxa_inadimplencia !== undefined) {
      return record._metricsCache.taxa_inadimplencia;
    }

    var original = toNumber(record.original_amount, 0);
    var balance = toNumber(record.balance_amount, 0);

    // Evita divisão por zero
    if (original === 0) {
      if (record._metricsCache) record._metricsCache.taxa_inadimplencia = 0;
      return 0;
    }

    // Taxa = (saldo / original) * 100
    // Se saldo é zero, não há inadimplência (0%)
    // Se saldo = original, inadimplência total (100%)
    var taxa = (balance / original) * 100;

    // ✅ PERFORMANCE: Cachear resultado
    if (record._metricsCache) record._metricsCache.taxa_inadimplencia = taxa;

    return taxa;
  }

  if (fieldName === 'situacao_vencimento') {
    // ✅ PERFORMANCE: Retornar N/A se aging desabilitado
    if (!calculateMetrics || !calculateAging) return 'N/A';

    // ✅ PERFORMANCE: Verificar cache primeiro
    if (record._metricsCache && record._metricsCache.situacao_vencimento !== undefined) {
      return record._metricsCache.situacao_vencimento;
    }

    var balance = toNumber(record.balance_amount, 0);

    var situacao;

    // Pago
    if (balance <= 0.01) {
      situacao = 'Pago';
    } else {
      // Vencido ou A Vencer
      var dueDate = new Date(record.due_date);
      // ✅ PERFORMANCE: Usa todayDate pré-calculado

      if (!record.due_date || isNaN(dueDate.getTime())) {
        situacao = 'Sem vencimento';
      } else if (dueDate < todayDate) {
        situacao = 'Vencido';
      } else {
        situacao = 'A Vencer';
      }
    }

    // ✅ PERFORMANCE: Cachear resultado
    if (record._metricsCache) record._metricsCache.situacao_vencimento = situacao;

    return situacao;
  }

  // ==========================================
  // GRUPO 10: CAMPOS ESPECÍFICOS DE INCOME
  // ==========================================

  // Periodicidade
  if (fieldName === 'income_periodicity_type') {
    return isIncome ? safeValue(record.periodicity_type, '') : '';
  }

  // Juros Embutidos
  if (fieldName === 'income_embedded_interest_amount') {
    return isIncome ? toNumber(record.embedded_interest_amount, 0) : 0;
  }

  // Tipo de Juros
  if (fieldName === 'income_interest_type') {
    return isIncome ? safeValue(record.interest_type, '') : '';
  }

  // Taxa de Juros
  if (fieldName === 'income_interest_rate') {
    return isIncome ? toNumber(record.interest_rate, 0) : 0;
  }

  // Tipo de Correção
  if (fieldName === 'income_correction_type') {
    return isIncome ? safeValue(record.correction_type, '') : '';
  }

  // Data Base Juros
  if (fieldName === 'income_interest_base_date') {
    return isIncome ? formatDate(record.interest_base_date) : '';
  }

  // Situação de Inadimplência
  if (fieldName === 'income_defaulter_situation') {
    return isIncome ? safeValue(record.defaulter_situation, '') : '';
  }

  // Sub-Júdice
  if (fieldName === 'income_sub_judicie') {
    return isIncome ? safeValue(record.sub_judicie, '') : '';
  }

  // Unidade Principal
  if (fieldName === 'income_main_unit') {
    return isIncome ? safeValue(record.main_unit, '') : '';
  }

  // Número da Parcela
  if (fieldName === 'income_installment_number') {
    return isIncome ? safeValue(record.installment_number, '') : '';
  }

  // ID Condição Pagamento
  if (fieldName === 'income_payment_term_id') {
    return isIncome ? safeValue(record.payment_term_id, '') : '';
  }

  // Condição Pagamento (typo original da API: descrition)
  if (fieldName === 'income_payment_term_description') {
    return isIncome ? safeValue(record.payment_term_descrition, '') : '';
  }

  // ID Portador
  if (fieldName === 'income_bearer_id') {
    return isIncome ? toNumber(record.bearer_id, 0) : 0;
  }

  // ==========================================
  // GRUPO 11: CAMPOS ESPECÍFICOS DE OUTCOME
  // ==========================================

  // Documento Previsão
  if (fieldName === 'outcome_forecast_document') {
    return !isIncome ? safeValue(record.forecast_document, '') : '';
  }

  // Status Consistência
  if (fieldName === 'outcome_consistency_status') {
    return !isIncome ? safeValue(record.consistency_status, '') : '';
  }

  // Status Autorização
  if (fieldName === 'outcome_authorization_status') {
    return !isIncome ? safeValue(record.authorization_status, '') : '';
  }

  // ID Usuário Cadastro
  if (fieldName === 'outcome_registered_user_id') {
    return !isIncome ? safeValue(record.registered_user_id, '') : '';
  }

  // Cadastrado Por
  if (fieldName === 'outcome_registered_by') {
    return !isIncome ? safeValue(record.registered_by, '') : '';
  }

  // Data Cadastro
  if (fieldName === 'outcome_registered_date') {
    return !isIncome ? formatDateTime(record.registered_date) : '';
  }

  // Total Departamentos
  if (fieldName === 'outcome_total_departamentos') {
    if (!isIncome && calculateMetrics) {
      return countJsonbArray(record.departments_costs);
    }
    return 0;
  }

  // Total Edificações
  if (fieldName === 'outcome_total_edificacoes') {
    if (!isIncome && calculateMetrics) {
      return countJsonbArray(record.buildings_costs);
    }
    return 0;
  }

  // Total Autorizações
  if (fieldName === 'outcome_total_autorizacoes') {
    if (!isIncome && calculateMetrics) {
      return countJsonbArray(record.authorizations);
    }
    return 0;
  }

  // ==========================================
  // DEFAULT: Campo não reconhecido
  // ==========================================

  LOGGING.warn('Unknown field: ' + fieldName);
  return '';
}