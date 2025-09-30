/**
 * SchemaBuilder.gs
 * Construtor de Schema com 7 Grupos Semânticos
 *
 * NOVA ESTRUTURA:
 * - Grupo 1: IDs (16 campos) - OPCIONAL via config
 * - Grupo 2: Básicos (7 campos)
 * - Grupo 3: Empresa (7 campos)
 * - Grupo 4: Partes (4 campos)
 * - Grupo 5: Financeiro (11 campos) - dimensões + métricas
 * - Grupo 6: Contas a Receber (13 campos) - dimensões + métricas
 * - Grupo 7: Contas a Pagar (9 campos) - dimensões + métricas
 *
 * Total: 80 campos (53 dimensões + 12 métricas) com Cliente/Credor separados
 */

/**
 * Retorna objeto fields sem build() - usado por getSchema e getData
 * Permite uso de forIds() para filtrar campos solicitados
 *
 * @param {boolean} showIds - Se deve incluir campos de ID (padrão: false)
 */
function getFields(showIds) {
  var fields = cc.getFields();
  var types = FIELD_TYPES;
  var aggregations = AGGREGATION_TYPES;

  // Default: não mostrar IDs
  if (showIds === undefined) {
    showIds = false;
  }

  // ==========================================
  // GRUPO 1: IDs (16 campos) - OPCIONAL
  // ==========================================

  if (showIds) {
    // Identificação
    fields.newDimension()
      .setId('id')
      .setName('ID do Registro')
      .setType(types.TEXT)
      .setGroup('IDs');

    fields.newDimension()
      .setId('installment_id')
      .setName('ID da Parcela')
      .setType(types.NUMBER)
      .setGroup('IDs');

    fields.newDimension()
      .setId('bill_id')
      .setName('ID da Conta')
      .setType(types.NUMBER)
      .setGroup('IDs');

    // Empresa
    fields.newDimension()
      .setId('company_id')
      .setName('ID da Empresa')
      .setType(types.NUMBER)
      .setGroup('IDs');

    fields.newDimension()
      .setId('business_area_id')
      .setName('ID da Área de Negócio')
      .setType(types.NUMBER)
      .setGroup('IDs');

    fields.newDimension()
      .setId('project_id')
      .setName('ID do Projeto')
      .setType(types.NUMBER)
      .setGroup('IDs');

    fields.newDimension()
      .setId('group_company_id')
      .setName('ID do Grupo Empresarial')
      .setType(types.NUMBER)
      .setGroup('IDs');

    fields.newDimension()
      .setId('holding_id')
      .setName('ID da Holding')
      .setType(types.NUMBER)
      .setGroup('IDs');

    fields.newDimension()
      .setId('subsidiary_id')
      .setName('ID da Filial')
      .setType(types.NUMBER)
      .setGroup('IDs');

    fields.newDimension()
      .setId('business_type_id')
      .setName('ID do Tipo de Negócio')
      .setType(types.NUMBER)
      .setGroup('IDs');

    // Partes
    fields.newDimension()
      .setId('cliente_id')
      .setName('ID do Cliente')
      .setType(types.NUMBER)
      .setGroup('IDs');

    fields.newDimension()
      .setId('credor_id')
      .setName('ID do Credor')
      .setType(types.NUMBER)
      .setGroup('IDs');

    // Documento
    fields.newDimension()
      .setId('document_identification_id')
      .setName('ID do Tipo de Documento')
      .setType(types.TEXT)
      .setGroup('IDs');

    fields.newDimension()
      .setId('origin_id')
      .setName('ID da Origem')
      .setType(types.TEXT)
      .setGroup('IDs');

    // Indexador
    fields.newDimension()
      .setId('indexer_id')
      .setName('ID do Indexador')
      .setType(types.NUMBER)
      .setGroup('IDs');

    // Income
    fields.newDimension()
      .setId('income_bearer_id')
      .setName('ID do Portador')
      .setType(types.NUMBER)
      .setGroup('IDs');
  }

  // ==========================================
  // GRUPO 2: BÁSICOS (7 campos)
  // ==========================================

  fields.newDimension()
    .setId('record_type')
    .setName('Tipo de Registro')
    .setDescription('Contas a Receber ou Contas a Pagar')
    .setType(types.TEXT)
    .setGroup('Basicos');

  fields.newDimension()
    .setId('sync_date')
    .setName('Data de Sincronização')
    .setType(types.YEAR_MONTH_DAY_HOUR)
    .setGroup('Basicos');

  fields.newDimension()
    .setId('due_date')
    .setName('Data de Vencimento')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Basicos');

  fields.newDimension()
    .setId('issue_date')
    .setName('Data de Emissão')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Basicos');

  fields.newDimension()
    .setId('bill_date')
    .setName('Data da Conta')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Basicos');

  fields.newDimension()
    .setId('installment_base_date')
    .setName('Data Base da Parcela')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Basicos');

  fields.newDimension()
    .setId('data_ultima_movimentacao')
    .setName('Data da Última Movimentação')
    .setDescription('Data do último recebimento ou pagamento')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Basicos');

  // ==========================================
  // GRUPO 3: EMPRESA (7 campos)
  // ==========================================

  fields.newDimension()
    .setId('company_name')
    .setName('Empresa')
    .setType(types.TEXT)
    .setGroup('Empresa');

  fields.newDimension()
    .setId('business_area_name')
    .setName('Área de Negócio')
    .setType(types.TEXT)
    .setGroup('Empresa');

  fields.newDimension()
    .setId('project_name')
    .setName('Projeto')
    .setType(types.TEXT)
    .setGroup('Empresa');

  fields.newDimension()
    .setId('group_company_name')
    .setName('Grupo Empresarial')
    .setType(types.TEXT)
    .setGroup('Empresa');

  fields.newDimension()
    .setId('holding_name')
    .setName('Holding')
    .setType(types.TEXT)
    .setGroup('Empresa');

  fields.newDimension()
    .setId('subsidiary_name')
    .setName('Filial')
    .setType(types.TEXT)
    .setGroup('Empresa');

  fields.newDimension()
    .setId('business_type_name')
    .setName('Tipo de Negócio')
    .setType(types.TEXT)
    .setGroup('Empresa');

  // ==========================================
  // GRUPO 4: PARTES (4 campos)
  // ==========================================

  fields.newDimension()
    .setId('cliente_nome')
    .setName('Nome do Cliente')
    .setDescription('Nome do Cliente (apenas Contas a Receber)')
    .setType(types.TEXT)
    .setGroup('Partes');

  fields.newDimension()
    .setId('credor_nome')
    .setName('Nome do Credor')
    .setDescription('Nome do Credor (apenas Contas a Pagar)')
    .setType(types.TEXT)
    .setGroup('Partes');

  fields.newDimension()
    .setId('document_identification_name')
    .setName('Tipo de Documento')
    .setType(types.TEXT)
    .setGroup('Partes');

  fields.newDimension()
    .setId('document_number')
    .setName('Número do Documento')
    .setType(types.TEXT)
    .setGroup('Partes');

  // ==========================================
  // GRUPO 5: FINANCEIRO (11 campos) - MISTO
  // ==========================================

  // Dimensões
  fields.newDimension()
    .setId('situacao_pagamento')
    .setName('Situação de Pagamento')
    .setDescription('Pago / Parcial / Pendente')
    .setType(types.TEXT)
    .setGroup('Financeiro');

  fields.newDimension()
    .setId('document_forecast')
    .setName('Documento de Previsão')
    .setType(types.TEXT)
    .setGroup('Financeiro');

  fields.newDimension()
    .setId('indexer_name')
    .setName('Indexador')
    .setDescription('INCC-M, IGPM, etc')
    .setType(types.TEXT)
    .setGroup('Financeiro');

  // Métricas
  fields.newMetric()
    .setId('original_amount')
    .setName('Valor Original')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Financeiro');

  fields.newMetric()
    .setId('discount_amount')
    .setName('Valor do Desconto')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Financeiro');

  fields.newMetric()
    .setId('tax_amount')
    .setName('Valor do Imposto')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Financeiro');

  fields.newMetric()
    .setId('balance_amount')
    .setName('Saldo Devedor')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Financeiro');

  fields.newMetric()
    .setId('corrected_balance_amount')
    .setName('Saldo Corrigido')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Financeiro');

  fields.newMetric()
    .setId('total_movimentacoes')
    .setName('Total de Movimentações')
    .setDescription('Quantidade de recebimentos ou pagamentos')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM)
    .setGroup('Financeiro');

  fields.newMetric()
    .setId('valor_liquido')
    .setName('Valor Líquido')
    .setDescription('Soma dos valores líquidos de todos os recebimentos/pagamentos')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Financeiro');

  // ==========================================
  // GRUPO 6: CONTAS A RECEBER (13 campos) - MISTO
  // ==========================================

  // Dimensões Income
  fields.newDimension()
    .setId('income_periodicity_type')
    .setName('Periodicidade')
    .setType(types.TEXT)
    .setGroup('Contas a Receber');

  fields.newDimension()
    .setId('income_interest_type')
    .setName('Tipo de Juros')
    .setType(types.TEXT)
    .setGroup('Contas a Receber');

  fields.newDimension()
    .setId('income_correction_type')
    .setName('Tipo de Correção')
    .setType(types.TEXT)
    .setGroup('Contas a Receber');

  fields.newDimension()
    .setId('income_interest_base_date')
    .setName('Data Base dos Juros')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Contas a Receber');

  fields.newDimension()
    .setId('income_defaulter_situation')
    .setName('Situação de Inadimplência')
    .setType(types.TEXT)
    .setGroup('Contas a Receber');

  fields.newDimension()
    .setId('income_sub_judicie')
    .setName('Sub-Júdice')
    .setType(types.TEXT)
    .setGroup('Contas a Receber');

  fields.newDimension()
    .setId('income_main_unit')
    .setName('Unidade Principal')
    .setType(types.TEXT)
    .setGroup('Contas a Receber');

  fields.newDimension()
    .setId('income_installment_number')
    .setName('Número da Parcela')
    .setType(types.TEXT)
    .setGroup('Contas a Receber');

  fields.newDimension()
    .setId('income_payment_term_id')
    .setName('ID Condição de Pagamento')
    .setType(types.TEXT)
    .setGroup('Contas a Receber');

  fields.newDimension()
    .setId('income_payment_term_description')
    .setName('Condição de Pagamento')
    .setType(types.TEXT)
    .setGroup('Contas a Receber');

  // Métricas Income
  fields.newMetric()
    .setId('income_embedded_interest_amount')
    .setName('Juros Embutidos')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Contas a Receber');

  fields.newMetric()
    .setId('income_interest_rate')
    .setName('Taxa de Juros (%)')
    .setType(types.PERCENT)
    .setGroup('Contas a Receber');

  // ==========================================
  // GRUPO 7: CONTAS A PAGAR (9 campos) - MISTO
  // ==========================================

  // Dimensões Outcome
  fields.newDimension()
    .setId('outcome_forecast_document')
    .setName('Documento de Previsão')
    .setType(types.TEXT)
    .setGroup('Contas a Pagar');

  fields.newDimension()
    .setId('outcome_consistency_status')
    .setName('Status de Consistência')
    .setType(types.TEXT)
    .setGroup('Contas a Pagar');

  fields.newDimension()
    .setId('outcome_authorization_status')
    .setName('Status de Autorização')
    .setType(types.TEXT)
    .setGroup('Contas a Pagar');

  fields.newDimension()
    .setId('outcome_registered_user_id')
    .setName('ID Usuário de Cadastro')
    .setType(types.TEXT)
    .setGroup('Contas a Pagar');

  fields.newDimension()
    .setId('outcome_registered_by')
    .setName('Cadastrado Por')
    .setType(types.TEXT)
    .setGroup('Contas a Pagar');

  fields.newDimension()
    .setId('outcome_registered_date')
    .setName('Data de Cadastro')
    .setType(types.YEAR_MONTH_DAY_HOUR)
    .setGroup('Contas a Pagar');

  // Métricas Outcome
  fields.newMetric()
    .setId('outcome_total_departamentos')
    .setName('Qtd. Departamentos')
    .setDescription('Total de departamentos vinculados')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM)
    .setGroup('Contas a Pagar');

  fields.newMetric()
    .setId('outcome_total_edificacoes')
    .setName('Qtd. Edificações')
    .setDescription('Total de edificações vinculadas')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM)
    .setGroup('Contas a Pagar');

  fields.newMetric()
    .setId('outcome_total_autorizacoes')
    .setName('Qtd. Autorizações')
    .setDescription('Total de autorizações')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM)
    .setGroup('Contas a Pagar');

  return fields;
}