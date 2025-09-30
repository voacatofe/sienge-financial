# Como os Grupos Aparecem no Looker Studio

## 🎯 Conceito de Grupos no Looker Studio

O Looker Studio **não suporta grupos customizados** em Community Connectors.

Porém, o Looker Studio **separa automaticamente** os campos em 2 seções principais:

1. **📊 DIMENSÕES** - Para filtrar, agrupar e categorizar
2. **📈 MÉTRICAS** - Para agregar e calcular valores

## ✅ Como Organizamos (Seguindo Code.gs)

### Estrutura Aplicada:

```
SchemaBuilder.gs
│
├─── 📊 DIMENSÕES (52 campos)
│    │
│    ├─ 1. Identificação e Tipos (5 campos)
│    │   └─ record_type, id, sync_date, installment_id, bill_id
│    │
│    ├─ 2. Datas (5 campos)
│    │   └─ due_date, issue_date, bill_date, installment_base_date, data_ultima_movimentacao
│    │
│    ├─ 3. Empresa e Organização (14 campos)
│    │   └─ company_name, business_area_name, project_name, holding_name, etc.
│    │
│    ├─ 4. Contraparte (3 campos)
│    │   └─ contraparte_tipo, contraparte_id, contraparte_nome
│    │
│    ├─ 5. Documento (5 campos)
│    │   └─ document_identification_name, document_number, origin_id, etc.
│    │
│    ├─ 6. Indexação (2 campos)
│    │   └─ indexer_id, indexer_name
│    │
│    ├─ 7. Status e Situação (1 campo)
│    │   └─ situacao_pagamento
│    │
│    ├─ 8. [Income] Específicos (11 campos)
│    │   └─ income_periodicity_type, income_interest_type, income_defaulter_situation, etc.
│    │
│    └─ 9. [Outcome] Específicos (6 campos)
│        └─ outcome_forecast_document, outcome_consistency_status, outcome_registered_by, etc.
│
└─── 📈 MÉTRICAS (12 campos)
     │
     ├─ 1. Valores Financeiros Principais (5 métricas)
     │   └─ original_amount, discount_amount, tax_amount, balance_amount, corrected_balance_amount
     │
     ├─ 2. Movimentações Financeiras (2 métricas)
     │   └─ total_movimentacoes, valor_liquido
     │
     ├─ 3. [Income] Valores Específicos (2 métricas)
     │   └─ income_embedded_interest_amount, income_interest_rate
     │
     └─ 4. [Outcome] Contagens (3 métricas)
         └─ outcome_total_departamentos, outcome_total_edificacoes, outcome_total_autorizacoes
```

## 📸 Como Vai Aparecer no Looker Studio

### Painel Lateral no Looker Studio:

```
┌─────────────────────────────────────────┐
│  📊 DIMENSÕES                           │
├─────────────────────────────────────────┤
│                                         │
│  ▼ Campos Disponíveis                   │
│                                         │
│  □ Tipo de Registro                     │  ← Identificação
│  □ ID do Registro                       │
│  □ Data de Sincronização                │
│  □ ID da Parcela                        │
│  □ ID da Conta                          │
│                                         │
│  □ Data de Vencimento                   │  ← Datas
│  □ Data de Emissão                      │
│  □ Data da Conta                        │
│  □ Data Base da Parcela                 │
│  □ Data da Última Movimentação          │
│                                         │
│  □ ID da Empresa                        │  ← Empresa/Organização
│  □ Empresa                              │
│  □ Área de Negócio                      │
│  □ Projeto                              │
│  □ Grupo Empresarial                    │
│  □ Holding                              │
│  □ Filial                               │
│  □ Tipo de Negócio                      │
│  ... (mais 6 campos de empresa)         │
│                                         │
│  □ Tipo de Contraparte                  │  ← Contraparte
│  □ ID da Contraparte                    │
│  □ Nome da Contraparte                  │
│                                         │
│  □ Tipo de Documento                    │  ← Documento
│  □ Número do Documento                  │
│  □ Documento de Previsão                │
│  □ ID da Origem                         │
│                                         │
│  □ ID do Indexador                      │  ← Indexação
│  □ Indexador                            │
│                                         │
│  □ Situação de Pagamento                │  ← Status
│                                         │
│  □ [Income] Periodicidade               │  ← Income Específicos
│  □ [Income] Tipo de Juros               │
│  □ [Income] Tipo de Correção            │
│  □ [Income] Data Base dos Juros         │
│  □ [Income] Situação de Inadimplência   │
│  □ [Income] Sub-Júdice                  │
│  □ [Income] Unidade Principal           │
│  □ [Income] Número da Parcela           │
│  □ [Income] Condição de Pagamento       │
│  ... (mais 2 campos income)             │
│                                         │
│  □ [Outcome] Documento de Previsão      │  ← Outcome Específicos
│  □ [Outcome] Status de Consistência     │
│  □ [Outcome] Status de Autorização      │
│  □ [Outcome] Cadastrado Por             │
│  □ [Outcome] Data de Cadastro           │
│  ... (mais 1 campo outcome)             │
│                                         │
├─────────────────────────────────────────┤
│  📈 MÉTRICAS                            │
├─────────────────────────────────────────┤
│                                         │
│  ▼ Campos Disponíveis                   │
│                                         │
│  Σ Valor Original                       │  ← Valores Financeiros
│  Σ Valor do Desconto                    │
│  Σ Valor do Imposto                     │
│  Σ Saldo Devedor                        │
│  Σ Saldo Corrigido                      │
│                                         │
│  Σ Total de Movimentações               │  ← Movimentações
│  Σ Valor Total Movimentado              │
│                                         │
│  Σ [Income] Juros Embutidos             │  ← Income Métricas
│  Σ [Income] Taxa de Juros (%)           │
│                                         │
│  Σ [Outcome] Qtd. Departamentos         │  ← Outcome Métricas
│  Σ [Outcome] Qtd. Edificações           │
│  Σ [Outcome] Qtd. Autorizações          │
│                                         │
└─────────────────────────────────────────┘
```

## 🎨 Agrupamento Visual

### Por Tipo (Automático do Looker Studio):

1. **📊 DIMENSÕES** aparecem juntas na primeira seção
2. **📈 MÉTRICAS** aparecem juntas na segunda seção

### Por Ordem de Definição:

Dentro de cada seção, os campos aparecem **NA ORDEM EM QUE FORAM DEFINIDOS** no código.

Por isso organizamos assim:

**Dimensões**:
1. Identificação → Datas → Empresa → Contraparte → Documento → Indexação → Status → [Income] → [Outcome]

**Métricas**:
1. Financeiras → Movimentações → [Income] → [Outcome]

### Por Prefixo de Nome:

Campos com prefixos similares aparecem agrupados visualmente:

- **[Income] ...** - Todos os campos específicos de contas a receber ficam juntos
- **[Outcome] ...** - Todos os campos específicos de contas a pagar ficam juntos

## ✅ Vantagens dessa Organização

### 1. Separação Dimensional/Métrica Clara
```
ANTES (Misturado):
□ company_name (dim)
Σ original_amount (métrica)
□ due_date (dim)
Σ balance_amount (métrica)

DEPOIS (Organizado):
📊 DIMENSÕES:
  □ company_name
  □ due_date

📈 MÉTRICAS:
  Σ original_amount
  Σ balance_amount
```

### 2. Campos Relacionados Próximos
```
📊 DIMENSÕES - Empresa:
  □ Empresa
  □ Área de Negócio
  □ Projeto
  □ Grupo Empresarial
  □ Holding
  (Todos aparecem em sequência)
```

### 3. Campos [Income] e [Outcome] Separados
```
📊 DIMENSÕES:
  □ [Income] Periodicidade
  □ [Income] Tipo de Juros
  □ [Income] Situação de Inadimplência
  ...
  □ [Outcome] Status de Consistência
  □ [Outcome] Status de Autorização
  ...

📈 MÉTRICAS:
  Σ [Income] Juros Embutidos
  Σ [Income] Taxa de Juros (%)
  ...
  Σ [Outcome] Qtd. Departamentos
  Σ [Outcome] Qtd. Edificações
  ...
```

## 🔍 Como Testar os Grupos

### Passo 1: Atualizar Campos no Looker Studio

1. Abra o Looker Studio
2. Vá para **Recursos → Gerenciar fontes de dados**
3. Encontre **Sienge Financial Connector**
4. Clique em **Editar**
5. Clique no botão **Atualizar campos** (ícone de refresh ⟳)

### Passo 2: Verificar Organização

No painel lateral esquerdo:

**Deve aparecer**:
- Seção **DIMENSÕES** com ~52 campos na ordem: Identificação → Datas → Empresa → Contraparte → etc.
- Seção **MÉTRICAS** com ~12 campos na ordem: Financeiras → Movimentações → Income → Outcome

**Campos [Income] devem estar juntos**:
- Dimensões Income juntas (11 campos)
- Métricas Income juntas (2 campos)

**Campos [Outcome] devem estar juntos**:
- Dimensões Outcome juntas (6 campos)
- Métricas Outcome juntas (3 campos)

### Passo 3: Criar Visualização

Teste criando uma tabela com:

**Dimensões**:
- Tipo de Registro
- Empresa
- Nome da Contraparte
- Data de Vencimento

**Métricas**:
- Valor Original
- Saldo Devedor

Todos esses campos devem estar fáceis de encontrar na lista organizada!

## 📊 Comparação Antes vs Depois

### ❌ ANTES (Misturado)

```
SchemaBuilder.gs:
├─ Identificação (dimensões)
├─ Empresa (dimensões)
├─ Contraparte (dimensões)
├─ Documento (dimensões)
├─ Valores Financeiros (métricas) ← Métricas no meio!
├─ Datas (dimensões)
├─ Indexação (dimensões)
├─ Movimentações (métricas) ← Métricas no meio!
├─ Income específicos (misto)
└─ Outcome específicos (misto)

Resultado no Looker Studio:
📊 DIMENSÕES (ordem aleatória)
📈 MÉTRICAS (ordem aleatória)
```

### ✅ DEPOIS (Organizado)

```
SchemaBuilder.gs:
├─ TODAS AS DIMENSÕES (52 campos)
│  ├─ Identificação
│  ├─ Datas
│  ├─ Empresa
│  ├─ Contraparte
│  ├─ Documento
│  ├─ Indexação
│  ├─ Status
│  ├─ [Income] dimensões
│  └─ [Outcome] dimensões
│
└─ TODAS AS MÉTRICAS (12 campos)
   ├─ Financeiras
   ├─ Movimentações
   ├─ [Income] métricas
   └─ [Outcome] métricas

Resultado no Looker Studio:
📊 DIMENSÕES (ordem lógica perfeita)
📈 MÉTRICAS (ordem lógica perfeita)
```

## 🎯 Métricas de Sucesso

Para verificar que os grupos estão funcionando:

✅ **Separação clara**: Dimensões e métricas em seções distintas
✅ **Ordem lógica**: Campos relacionados aparecem juntos
✅ **Prefixos agrupados**: [Income] juntos, [Outcome] juntos
✅ **Fácil navegação**: Encontrar campos específicos é rápido
✅ **Organização semântica**: Datas juntas, empresa junta, etc.

## 💡 Dica Pro

Para facilitar ainda mais, ao criar visualizações:

1. **Datas** estão no topo das dimensões
2. **Empresa e Contraparte** logo em seguida (para drill-downs)
3. **Métricas Financeiras** no topo das métricas (mais usadas)
4. **[Income]** e **[Outcome]** separados e identificados visualmente

Isso acelera a criação de dashboards no Looker Studio!

---

**Última Atualização**: 2025-09-29
**Versão**: 2.0 - Reorganização de grupos
**Autor**: Claude Code