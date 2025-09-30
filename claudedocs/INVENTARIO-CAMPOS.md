# Inventário de Campos - Sienge Financial Connector

## 🧮 Campos Calculados vs Campos Diretos do BD

**Legenda:**
- 📊 = Campo direto do banco de dados
- 🧮 = Campo calculado pelo conector

**Importante:**
Cada registro no BD tem um tipo definido: **Income** (tabela `income`) ou **Outcome** (tabela `outcome`). Os campos calculados usam lógica condicional baseada neste tipo. Quando você vê "se Income, se Outcome", significa que o cálculo verifica o tipo do registro e aplica a lógica correspondente.

Por exemplo:
- Registro da tabela `income` → tem array `receipts` preenchido
- Registro da tabela `outcome` → tem array `payments` preenchido
- Nunca há um registro com ambos os arrays ao mesmo tempo

---

## 📋 NOVA ESTRUTURA DE GRUPOS (7 grupos)

### **Grupo 1: IDs** (16 campos) ⚙️ OPCIONAL VIA CONFIGURAÇÃO

**Configuração do Conector:**
- Campo: "Mostrar campos de ID"
- Padrão: Desabilitado
- Quando desabilitado: Grupo não aparece no Looker Studio

**Campos técnicos de identificação:**
- `id` 📊 - ID do Registro
- `installment_id` 📊 - ID da Parcela
- `bill_id` 📊 - ID da Conta
- `company_id` 📊 - ID da Empresa
- `business_area_id` 📊 - ID da Área de Negócio
- `project_id` 📊 - ID do Projeto
- `group_company_id` 📊 - ID do Grupo Empresarial
- `holding_id` 📊 - ID da Holding
- `subsidiary_id` 📊 - ID da Filial
- `business_type_id` 📊 - ID do Tipo de Negócio
- `cliente_id` 📊 - ID do Cliente
- `credor_id` 📊 - ID do Credor
- `document_identification_id` 📊 - ID do Tipo de Documento
- `origin_id` 📊 - ID da Origem
- `indexer_id` 📊 - ID do Indexador
- `income_bearer_id` 📊 - ID do Portador

---

### **Grupo 2: Básicos** (7 campos)

**Dimensões temporais e identificação:**
- `record_type` 🧮 - Tipo de Registro ("Contas a Receber" ou "Contas a Pagar")
- `sync_date` 📊 - Data de Sincronização
- `due_date` 📊 - Data de Vencimento
- `issue_date` 📊 - Data de Emissão
- `bill_date` 📊 - Data da Conta
- `installment_base_date` 📊 - Data Base da Parcela
- `data_ultima_movimentacao` 🧮 - Data da Última Movimentação (MAX de receipts/payments)

---

### **Grupo 3: Empresa** (7 campos)

**Hierarquia organizacional:**
- `company_name` 📊 - Empresa
- `business_area_name` 📊 - Área de Negócio
- `project_name` 📊 - Projeto
- `group_company_name` 📊 - Grupo Empresarial
- `holding_name` 📊 - Holding
- `subsidiary_name` 📊 - Filial
- `business_type_name` 📊 - Tipo de Negócio

---

### **Grupo 4: Partes** (4 campos)

**Envolvidos na transação:**
- `cliente_nome` 📊 - Nome do Cliente (só Income)
- `credor_nome` 📊 - Nome do Credor (só Outcome)
- `document_identification_name` 📊 - Tipo de Documento
- `document_number` 📊 - Número do Documento

---

### **Grupo 5: Financeiro** (11 campos) - Dimensões + Métricas Misturadas

**Dimensões de controle:**
- `situacao_pagamento` 🧮 - Situação de Pagamento (Pago/Parcial/Pendente)
- `document_forecast` 📊 - Documento de Previsão
- `indexer_name` 📊 - Indexador (INCC-M, IGPM, etc)

**Métricas de valores:**
- `original_amount` 📊 - Valor Original
- `discount_amount` 📊 - Valor do Desconto
- `tax_amount` 📊 - Valor do Imposto
- `balance_amount` 📊 - Saldo Devedor
- `corrected_balance_amount` 📊 - Saldo Corrigido
- `total_movimentacoes` 🧮 - Total de Movimentações (COUNT de receipts/payments)
- `valor_liquido` 🧮 - Valor Líquido (SUM de receipts/payments netAmount)

---

### **Grupo 6: Contas a Receber** (13 campos) - Dimensões + Métricas Misturadas

**Dimensões específicas de Income:**
- `income_periodicity_type` 📊 - Periodicidade
- `income_interest_type` 📊 - Tipo de Juros
- `income_correction_type` 📊 - Tipo de Correção
- `income_interest_base_date` 📊 - Data Base dos Juros
- `income_defaulter_situation` 📊 - Situação de Inadimplência
- `income_sub_judicie` 📊 - Sub-Júdice
- `income_main_unit` 📊 - Unidade Principal
- `income_installment_number` 📊 - Número da Parcela
- `income_payment_term_id` 📊 - ID Condição de Pagamento
- `income_payment_term_description` 📊 - Condição de Pagamento

**Métricas específicas de Income:**
- `income_embedded_interest_amount` 📊 - Juros Embutidos
- `income_interest_rate` 📊 - Taxa de Juros (%)

---

### **Grupo 7: Contas a Pagar** (9 campos) - Dimensões + Métricas Misturadas

**Dimensões específicas de Outcome:**
- `outcome_forecast_document` 📊 - Documento de Previsão
- `outcome_consistency_status` 📊 - Status de Consistência
- `outcome_authorization_status` 📊 - Status de Autorização
- `outcome_registered_user_id` 📊 - ID Usuário de Cadastro
- `outcome_registered_by` 📊 - Cadastrado Por
- `outcome_registered_date` 📊 - Data de Cadastro

**Métricas específicas de Outcome:**
- `outcome_total_departamentos` 🧮 - Qtd. Departamentos (COUNT de departments_costs)
- `outcome_total_edificacoes` 🧮 - Qtd. Edificações (COUNT de buildings_costs)
- `outcome_total_autorizacoes` 🧮 - Qtd. Autorizações (COUNT de authorizations)

---

## 📝 Resumo

### Totais
- **Total de Campos**: 80 (53 dimensões + 12 métricas)
- **Campos Diretos do BD** 📊: 69 campos
- **Campos Calculados** 🧮: 11 campos
- **Grupos**: 7 no total (6 se IDs ocultos)

### Distribuição por Grupo
- **IDs** (opcional): 16 campos
- **Básicos**: 7 campos
- **Empresa**: 7 campos
- **Partes**: 4 campos
- **Financeiro**: 11 campos (3 dim + 8 métricas)
- **Contas a Receber**: 13 campos (11 dim + 2 métricas)
- **Contas a Pagar**: 9 campos (6 dim + 3 métricas)

### Por Tipo de Registro
- **Campos Income**: 13 (11 dimensões + 2 métricas)
- **Campos Outcome**: 9 (6 dimensões + 3 métricas)
- **Campos Comuns**: 58 (36 dimensões + 7 métricas)

### Vantagens da Nova Estrutura
- ✅ **46% menos grupos** (13 → 7)
- ✅ **IDs opcionais** via configuração do conector
- ✅ **Dimensões + Métricas misturadas** em grupos semânticos
- ✅ **Grupos Income/Outcome completos** com suas métricas integradas
- ✅ **Navegação mais intuitiva** no Looker Studio
- ✅ **Sem separação artificial** entre dimensões e métricas

---

## 🧮 Campos Calculados Detalhados

### 1. **record_type** (Grupo: Básicos)
**Cálculo**: Identifica tipo de registro
- Income → `"Contas a Receber"`
- Outcome → `"Contas a Pagar"`

### 2. **data_ultima_movimentacao** (Grupo: Básicos)
**Cálculo**: Última data de movimentação financeira
- **Se Income**: `MAX(receipts.paymentDate)` - última data no array JSONB `receipts`
- **Se Outcome**: `MAX(payments.paymentDate)` - última data no array JSONB `payments`
- **Nota**: Cada registro tem apenas UM dos arrays preenchido (nunca os dois)

### 3. **situacao_pagamento** (Grupo: Financeiro)
**Cálculo**: Status baseado em saldo devedor
- `balance_amount <= 0.01` → `"Pago"`
- `0.01 < balance_amount < original_amount` → `"Parcial"`
- `balance_amount >= original_amount` OU sem movimentações → `"Pendente"`

### 4. **total_movimentacoes** (Grupo: Financeiro)
**Cálculo**: Quantidade de recebimentos/pagamentos
- **Se Income**: `COUNT(receipts)` - tamanho do array JSONB `receipts`
- **Se Outcome**: `COUNT(payments)` - tamanho do array JSONB `payments`
- **Nota**: Cada registro tem apenas UM dos arrays preenchido (nunca os dois)

### 5. **valor_liquido** (Grupo: Financeiro)
**Cálculo**: Soma dos valores líquidos recebidos/pagos
- **Se Income**: `SUM(receipts.netAmount)` - soma campo `netAmount` (valor líquido após ajustes) do array JSONB `receipts`
- **Se Outcome**: `SUM(payments.netAmount)` - soma campo `netAmount` (valor líquido após ajustes) do array JSONB `payments`
- **Nota**:
  - `netAmount` já representa o valor líquido (após descontos, acréscimos, seguros, taxas)
  - Cada registro tem apenas UM dos arrays preenchido (nunca os dois)
  - Equivale ao "Valor líquido" do CSV Sienge (soma de todas as baixas da parcela)

### 6. **outcome_total_departamentos** (Grupo: Contas a Pagar)
**Cálculo**: Quantidade de departamentos vinculados
- Outcome → `COUNT(departments_costs)` - tamanho do array JSONB `departments_costs`

### 7. **outcome_total_edificacoes** (Grupo: Contas a Pagar)
**Cálculo**: Quantidade de edificações vinculadas
- Outcome → `COUNT(buildings_costs)` - tamanho do array JSONB `buildings_costs`

### 8. **outcome_total_autorizacoes** (Grupo: Contas a Pagar)
**Cálculo**: Quantidade de autorizações
- Outcome → `COUNT(authorizations)` - tamanho do array JSONB `authorizations`

---

## ⚙️ Configuração do Conector

### Campo: "Mostrar campos de ID"
**Nome técnico**: `show_ids`
**Tipo**: BOOLEAN (checkbox)
**Padrão**: `false` (desabilitado)
**Descrição**: "Exibir campos técnicos de ID no relatório (IDs de empresa, projeto, cliente, etc)"

**Comportamento**:
- `false` (padrão): Grupo "IDs" não aparece no Looker Studio (6 grupos visíveis)
- `true`: Grupo "IDs" aparece com todos os 16 campos técnicos (7 grupos visíveis)

**Uso recomendado**:
- ✅ Habilitar para: Integração com outros sistemas, troubleshooting, análise técnica
- ❌ Manter desabilitado para: Dashboards de negócio, relatórios executivos