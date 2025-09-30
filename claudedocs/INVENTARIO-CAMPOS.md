# Inventário de Campos - Sienge Financial Connector

## 📊 DIMENSÕES (52 campos)

### Grupo: Identificacao
- **Tipo de Registro** → `record_type`
- **ID do Registro** → `id`
- **Data de Sincronização** → `sync_date`
- **ID da Parcela** → `installment_id`
- **ID da Conta** → `bill_id`

### Grupo: Datas
- **Data de Vencimento** → `due_date`
- **Data de Emissão** → `issue_date`
- **Data da Conta** → `bill_date`
- **Data Base da Parcela** → `installment_base_date`
- **Data da Última Movimentação** → `data_ultima_movimentacao`

### Grupo: Empresa
- **ID da Empresa** → `company_id`
- **Empresa** → `company_name`
- **ID da Área de Negócio** → `business_area_id`
- **Área de Negócio** → `business_area_name`
- **ID do Projeto** → `project_id`
- **Projeto** → `project_name`
- **ID do Grupo Empresarial** → `group_company_id`
- **Grupo Empresarial** → `group_company_name`
- **ID da Holding** → `holding_id`
- **Holding** → `holding_name`
- **ID da Filial** → `subsidiary_id`
- **Filial** → `subsidiary_name`
- **ID do Tipo de Negócio** → `business_type_id`
- **Tipo de Negócio** → `business_type_name`

### Grupo: Contraparte
- **Tipo de Contraparte** → `contraparte_tipo` (Cliente ou Fornecedor)
- **ID da Contraparte** → `contraparte_id`
- **Nome da Contraparte** → `contraparte_nome`

### Grupo: Documento
- **ID do Tipo de Documento** → `document_identification_id`
- **Tipo de Documento** → `document_identification_name`
- **Número do Documento** → `document_number`
- **Documento de Previsão** → `document_forecast`
- **ID da Origem** → `origin_id`

### Grupo: Indexacao
- **ID do Indexador** → `indexer_id`
- **Indexador** → `indexer_name` (INCC-M, IGPM, etc)

### Grupo: Status
- **Situação de Pagamento** → `situacao_pagamento` (Pago / Parcial / Pendente)

### Grupo: Contas a Receber
- **Periodicidade** → `income_periodicity_type`
- **Tipo de Juros** → `income_interest_type`
- **Tipo de Correção** → `income_correction_type`
- **Data Base dos Juros** → `income_interest_base_date`
- **Situação de Inadimplência** → `income_defaulter_situation`
- **Sub-Júdice** → `income_sub_judicie`
- **Unidade Principal** → `income_main_unit`
- **Número da Parcela** → `income_installment_number`
- **ID Condição de Pagamento** → `income_payment_term_id`
- **Condição de Pagamento** → `income_payment_term_description`
- **ID do Portador** → `income_bearer_id`

### Grupo: Contas a Pagar
- **Documento de Previsão** → `outcome_forecast_document`
- **Status de Consistência** → `outcome_consistency_status`
- **Status de Autorização** → `outcome_authorization_status`
- **ID Usuário de Cadastro** → `outcome_registered_user_id`
- **Cadastrado Por** → `outcome_registered_by`
- **Data de Cadastro** → `outcome_registered_date`

---

## 📈 MÉTRICAS (12 campos)

### Grupo: Valores Financeiros
- **Valor Original** → `original_amount`
- **Valor do Desconto** → `discount_amount`
- **Valor do Imposto** → `tax_amount`
- **Saldo Devedor** → `balance_amount`
- **Saldo Corrigido** → `corrected_balance_amount`

### Grupo: Movimentacoes
- **Total de Movimentações** → `total_movimentacoes` (Qtd. recebimentos/pagamentos)
- **Valor Total Movimentado** → `valor_total_movimentado` (Soma de recebimentos/pagamentos)

### Grupo: Valores a Receber
- **Juros Embutidos** → `income_embedded_interest_amount`
- **Taxa de Juros (%)** → `income_interest_rate`

### Grupo: Valores a Pagar
- **Qtd. Departamentos** → `outcome_total_departamentos`
- **Qtd. Edificações** → `outcome_total_edificacoes`
- **Qtd. Autorizações** → `outcome_total_autorizacoes`

---

## 📝 Observações

- **Total**: 79 campos (52 dimensões + 12 métricas)
- **Grupos**: 13 no total (9 de dimensões + 4 de métricas)
- **Campos Income**: 13 (11 dimensões + 2 métricas)
- **Campos Outcome**: 9 (6 dimensões + 3 métricas)
- **Campos Comuns**: 57 (35 dimensões + 7 métricas)