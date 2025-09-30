/**
 * SchemaBuilder.gs
 * Construtor de Schema Unificado para Sienge Financial Connector
 *
 * Define todos os 79 campos unificados (Income + Outcome)
 * Com grupos visuais usando .setGroup() para organização no Looker Studio
 */

/**
 * Retorna objeto fields sem build() - usado por getSchema e getData
 * Permite uso de forIds() para filtrar campos solicitados
 */
function getFields() {
  var fields = cc.getFields();
  var types = FIELD_TYPES;
  var aggregations = AGGREGATION_TYPES;

  // ==========================================
  // DIMENSÕES - GRUPO: IDENTIFICAÇÃO
  // ==========================================

  fields.newDimension()
    .setId('record_type')
    .setName('Tipo de Registro')
    .setDescription('Contas a Receber ou Contas a Pagar')
    .setType(types.TEXT)
    .setGroup('Identificacao');

  fields.newDimension()
    .setId('id')
    .setName('ID do Registro')
    .setDescription('Identificador único composto')
    .setType(types.TEXT)
    .setGroup('Identificacao');

  fields.newDimension()
    .setId('sync_date')
    .setName('Data de Sincronização')
    .setDescription('Quando o registro foi sincronizado')
    .setType(types.YEAR_MONTH_DAY_HOUR)
    .setGroup('Identificacao');

  fields.newDimension()
    .setId('installment_id')
    .setName('ID da Parcela')
    .setType(types.NUMBER)
    .setGroup('Identificacao');

  fields.newDimension()
    .setId('bill_id')
    .setName('ID da Conta')
    .setType(types.NUMBER)
    .setGroup('Identificacao');

  // ==========================================
  // DIMENSÕES - GRUPO: DATAS
  // ==========================================

  fields.newDimension()
    .setId('due_date')
    .setName('Data de Vencimento')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Datas');

  fields.newDimension()
    .setId('issue_date')
    .setName('Data de Emissão')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Datas');

  fields.newDimension()
    .setId('bill_date')
    .setName('Data da Conta')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Datas');

  fields.newDimension()
    .setId('installment_base_date')
    .setName('Data Base da Parcela')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Datas');

  fields.newDimension()
    .setId('data_ultima_movimentacao')
    .setName('Data da Última Movimentação')
    .setDescription('Data do último recebimento ou pagamento')
    .setType(types.YEAR_MONTH_DAY)
    .setGroup('Datas');

  // ==========================================
  // DIMENSÕES - GRUPO: EMPRESA
  // ==========================================

  fields.newDimension()
    .setId('company_id')
    .setName('ID da Empresa')
    .setType(types.NUMBER)
    .setGroup('Empresa');

  fields.newDimension()
    .setId('company_name')
    .setName('Empresa')
    .setType(types.TEXT)
    .setGroup('Empresa');

  fields.newDimension()
    .setId('business_area_id')
    .setName('ID da Área de Negócio')
    .setType(types.NUMBER)
    .setGroup('🏢 Empresa');

  fields.newDimension()
    .setId('business_area_name')
    .setName('Área de Negócio')
    .setType(types.TEXT)
    .setGroup('🏢 Empresa');

  fields.newDimension()
    .setId('project_id')
    .setName('ID do Projeto')
    .setType(types.NUMBER)
    .setGroup('🏢 Empresa');

  fields.newDimension()
    .setId('project_name')
    .setName('Projeto')
    .setType(types.TEXT)
    .setGroup('🏢 Empresa');

  fields.newDimension()
    .setId('group_company_id')
    .setName('ID do Grupo Empresarial')
    .setType(types.NUMBER)
    .setGroup('🏢 Empresa');

  fields.newDimension()
    .setId('group_company_name')
    .setName('Grupo Empresarial')
    .setType(types.TEXT)
    .setGroup('🏢 Empresa');

  fields.newDimension()
    .setId('holding_id')
    .setName('ID da Holding')
    .setType(types.NUMBER)
    .setGroup('🏢 Empresa');

  fields.newDimension()
    .setId('holding_name')
    .setName('Holding')
    .setType(types.TEXT)
    .setGroup('🏢 Empresa');

  fields.newDimension()
    .setId('subsidiary_id')
    .setName('ID da Filial')
    .setType(types.NUMBER)
    .setGroup('🏢 Empresa');

  fields.newDimension()
    .setId('subsidiary_name')
    .setName('Filial')
    .setType(types.TEXT)
    .setGroup('🏢 Empresa');

  fields.newDimension()
    .setId('business_type_id')
    .setName('ID do Tipo de Negócio')
    .setType(types.NUMBER)
    .setGroup('🏢 Empresa');

  fields.newDimension()
    .setId('business_type_name')
    .setName('Tipo de Negócio')
    .setType(types.TEXT)
    .setGroup('🏢 Empresa');

  // ==========================================
  // DIMENSÕES - GRUPO: CLIENTE
  // ==========================================

  fields.newDimension()
    .setId('cliente_id')
    .setName('ID do Cliente')
    .setDescription('ID do Cliente (apenas Contas a Receber)')
    .setType(types.NUMBER)
    .setGroup('Cliente');

  fields.newDimension()
    .setId('cliente_nome')
    .setName('Nome do Cliente')
    .setDescription('Nome do Cliente (apenas Contas a Receber)')
    .setType(types.TEXT)
    .setGroup('Cliente');

  // ==========================================
  // DIMENSÕES - GRUPO: CREDOR
  // ==========================================

  fields.newDimension()
    .setId('credor_id')
    .setName('ID do Credor')
    .setDescription('ID do Credor (apenas Contas a Pagar)')
    .setType(types.NUMBER)
    .setGroup('Credor');

  fields.newDimension()
    .setId('credor_nome')
    .setName('Nome do Credor')
    .setDescription('Nome do Credor (apenas Contas a Pagar)')
    .setType(types.TEXT)
    .setGroup('Credor');

  // ==========================================
  // DIMENSÕES - GRUPO: DOCUMENTO
  // ==========================================

  fields.newDimension()
    .setId('document_identification_id')
    .setName('ID do Tipo de Documento')
    .setType(types.TEXT)
    .setGroup('Documento');

  fields.newDimension()
    .setId('document_identification_name')
    .setName('Tipo de Documento')
    .setType(types.TEXT)
    .setGroup('Documento');

  fields.newDimension()
    .setId('document_number')
    .setName('Número do Documento')
    .setType(types.TEXT)
    .setGroup('Documento');

  fields.newDimension()
    .setId('document_forecast')
    .setName('Documento de Previsão')
    .setDescription('S/N')
    .setType(types.TEXT)
    .setGroup('Documento');

  fields.newDimension()
    .setId('origin_id')
    .setName('ID da Origem')
    .setType(types.TEXT)
    .setGroup('Documento');

  // ==========================================
  // DIMENSÕES - GRUPO: INDEXAÇÃO
  // ==========================================

  fields.newDimension()
    .setId('indexer_id')
    .setName('ID do Indexador')
    .setType(types.NUMBER)
    .setGroup('Indexacao');

  fields.newDimension()
    .setId('indexer_name')
    .setName('Indexador')
    .setDescription('INCC-M, IGPM, etc')
    .setType(types.TEXT)
    .setGroup('Indexacao');

  // ==========================================
  // DIMENSÕES - GRUPO: STATUS
  // ==========================================

  fields.newDimension()
    .setId('situacao_pagamento')
    .setName('Situação de Pagamento')
    .setDescription('Pago / Parcial / Pendente')
    .setType(types.TEXT)
    .setGroup('Status');

  // ==========================================
  // DIMENSÕES - GRUPO: [INCOME] CONTAS A RECEBER
  // ==========================================

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
    .setDescription('S/N')
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

  fields.newDimension()
    .setId('income_bearer_id')
    .setName('ID do Portador')
    .setType(types.NUMBER)
    .setGroup('Contas a Receber');

  // ==========================================
  // DIMENSÕES - GRUPO: [OUTCOME] CONTAS A PAGAR
  // ==========================================

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

  // ==========================================
  // MÉTRICAS - GRUPO: VALORES FINANCEIROS
  // ==========================================

  fields.newMetric()
    .setId('original_amount')
    .setName('Valor Original')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Valores Financeiros');

  fields.newMetric()
    .setId('discount_amount')
    .setName('Valor do Desconto')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Valores Financeiros');

  fields.newMetric()
    .setId('tax_amount')
    .setName('Valor do Imposto')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Valores Financeiros');

  fields.newMetric()
    .setId('balance_amount')
    .setName('Saldo Devedor')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Valores Financeiros');

  fields.newMetric()
    .setId('corrected_balance_amount')
    .setName('Saldo Corrigido')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Valores Financeiros');

  // ==========================================
  // MÉTRICAS - GRUPO: MOVIMENTAÇÕES
  // ==========================================

  fields.newMetric()
    .setId('total_movimentacoes')
    .setName('Total de Movimentações')
    .setDescription('Quantidade de recebimentos ou pagamentos')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM)
    .setGroup('Movimentacoes');

  fields.newMetric()
    .setId('valor_total_movimentado')
    .setName('Valor Total Movimentado')
    .setDescription('Soma de todos recebimentos ou pagamentos')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Movimentacoes');

  // ==========================================
  // MÉTRICAS - GRUPO: [INCOME] VALORES A RECEBER
  // ==========================================

  fields.newMetric()
    .setId('income_embedded_interest_amount')
    .setName('Juros Embutidos')
    .setType(types.CURRENCY_BRL)
    .setAggregation(aggregations.SUM)
    .setGroup('Valores a Receber');

  fields.newMetric()
    .setId('income_interest_rate')
    .setName('Taxa de Juros (%)')
    .setType(types.PERCENT)
    .setGroup('Valores a Receber');

  // ==========================================
  // MÉTRICAS - GRUPO: [OUTCOME] VALORES A PAGAR
  // ==========================================

  fields.newMetric()
    .setId('outcome_total_departamentos')
    .setName('Qtd. Departamentos')
    .setDescription('Total de departamentos vinculados')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM)
    .setGroup('Valores a Pagar');

  fields.newMetric()
    .setId('outcome_total_edificacoes')
    .setName('Qtd. Edificações')
    .setDescription('Total de edificações vinculadas')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM)
    .setGroup('Valores a Pagar');

  fields.newMetric()
    .setId('outcome_total_autorizacoes')
    .setName('Qtd. Autorizações')
    .setDescription('Total de autorizações')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM)
    .setGroup('Valores a Pagar');

  return fields;
}