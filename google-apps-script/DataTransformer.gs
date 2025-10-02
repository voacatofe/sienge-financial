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
 */
function transformRecords(records, requestedFields, calculateMetrics) {
  LOGGING.info('Transforming ' + records.length + ' records...');

  var rows = records.map(function(record) {
    var isIncome = record._recordType === CONFIG.RECORD_TYPE_INCOME;
    return transformSingleRecord(record, requestedFields, isIncome, calculateMetrics);
  });

  LOGGING.info('Transformation complete');

  return rows;
}

/**
 * Transforma um único registro para formato unificado
 */
function transformSingleRecord(record, requestedFields, isIncome, calculateMetrics) {
  var values = [];

  requestedFields.forEach(function(field) {
    var value = getFieldValue(record, field.name, isIncome, calculateMetrics);
    values.push(value);
  });

  return { values: values };
}

/**
 * Retorna valor de um campo específico
 * Esta é a lógica CENTRAL de unificação
 */
function getFieldValue(record, fieldName, isIncome, calculateMetrics) {
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
  // GRUPO 7: DATAS (Campos comuns)
  // ==========================================

  var dateFields = [
    'due_date',
    'issue_date',
    'bill_date',
    'installment_base_date'
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