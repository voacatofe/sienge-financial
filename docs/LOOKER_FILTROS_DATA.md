# Como Usar Múltiplos Filtros de Data no Looker Studio

**Data**: 2025-10-02
**Feature**: Seleção de Campo de Data Principal

## Problema Resolvido

Agora você pode escolher qual campo de data usar como **padrão** para filtros automáticos de intervalo de data no Looker Studio.

## Campos de Data Disponíveis

O connector disponibiliza **4 campos de data principais**:

1. **Data de Vencimento** (`due_date`) - Quando a conta vence
2. **Data de Pagamento** (`payment_date`) - Quando foi pago/recebido
3. **Data de Emissão** (`issue_date`) - Quando o documento foi emitido
4. **Data da Última Movimentação** (`data_ultima_movimentacao`) - Última operação

## Como Configurar

### Passo 1: Configuração do Connector

1. Abra sua fonte de dados no Looker Studio
2. Clique em **"Editar conexão"**
3. Você verá uma nova opção: **"Campo de Data Principal"**
4. Selecione o campo que deseja usar como padrão:
   - ✅ **Data de Vencimento** (recomendado para análises de vencimento)
   - ✅ **Data de Pagamento** (recomendado para análises de caixa)
   - ✅ **Data de Emissão** (para análises de emissão de documentos)
   - ✅ **Data da Última Movimentação** (para histórico de alterações)

5. Clique em **"Reconectar"**

### Passo 2: Usar Múltiplos Filtros de Data

Você **não está limitado** ao campo principal! Pode criar controles separados para cada data:

#### Criar Controle de Data de Vencimento:
1. Adicione um controle → **Controle de intervalo de datas**
2. Em "Dimensão de data", selecione: **"Data de Vencimento"**
3. Posicione no topo do dashboard

#### Criar Controle de Data de Pagamento:
1. Adicione outro controle → **Controle de intervalo de datas**
2. Em "Dimensão de data", selecione: **"Data de Pagamento"**
3. Posicione ao lado do anterior

#### Resultado:
Você terá **dois controles independentes**:
- Um filtra por vencimento
- Outro filtra por pagamento

## Casos de Uso

### Caso 1: Análise de Contas a Vencer

**Configuração**:
- Campo Principal: **Data de Vencimento**
- Controle de Data: **Data de Vencimento**

**Resultado**: Vê todas as contas que vencem no período selecionado, independentemente de estarem pagas ou não.

---

### Caso 2: Análise de Fluxo de Caixa

**Configuração**:
- Campo Principal: **Data de Pagamento**
- Controle de Data: **Data de Pagamento**

**Resultado**: Vê o dinheiro que entrou/saiu no período, filtrando apenas registros que têm pagamento efetivado.

---

### Caso 3: Análise Combinada (Vencimento vs Pagamento)

**Configuração**:
- Campo Principal: **Data de Vencimento** (na config)
- Controle 1: **Data de Vencimento** (ex: setembro/2025)
- Controle 2: **Data de Pagamento** (ex: setembro/2025)

**Cenários**:
1. **Ambos filtros aplicados**: Contas que venceram E foram pagas em setembro
2. **Só vencimento**: Todas as contas de setembro (pagas ou não)
3. **Só pagamento**: Tudo que foi pago em setembro (independente do vencimento)

---

### Caso 4: Identificar Pagamentos Antecipados

**Configuração**:
- Controle 1: **Data de Vencimento** = outubro/2025
- Controle 2: **Data de Pagamento** = setembro/2025

**Resultado**: Contas que vencem em outubro mas foram pagas em setembro (antecipação).

---

### Caso 5: Identificar Pagamentos Atrasados

**Configuração**:
- Controle 1: **Data de Vencimento** = agosto/2025
- Controle 2: **Data de Pagamento** = setembro/2025

**Resultado**: Contas que venceram em agosto mas só foram pagas em setembro (atraso).

## Diferença Entre os Campos

### Data de Vencimento (`due_date`)
- ✅ Sempre preenchido
- ✅ Útil para: planejamento, previsão, análise de vencimentos
- ✅ Exemplo: "Quanto vence em novembro?"

### Data de Pagamento (`payment_date`)
- ⚠️ Só preenchido se houver pagamento
- ✅ Útil para: fluxo de caixa, análise de pagamentos efetivados
- ✅ Exemplo: "Quanto foi pago em setembro?"
- ⚠️ Registros sem pagamento não aparecem

### Data de Emissão (`issue_date`)
- ✅ Geralmente preenchido
- ✅ Útil para: análise de criação de documentos, período de emissão
- ✅ Exemplo: "Quantos títulos foram emitidos em agosto?"

### Data da Última Movimentação (`data_ultima_movimentacao`)
- ⚠️ Só preenchido se houver movimentação
- ✅ Útil para: histórico de alterações, última atividade
- ✅ Exemplo: "Quais contas tiveram atividade recente?"

## Perguntas Frequentes

### 1. Qual campo principal devo escolher?

**Depende do seu uso principal**:
- Análise de vencimentos → **Data de Vencimento**
- Análise de caixa → **Data de Pagamento**
- Relatórios gerenciais → **Data de Vencimento** (mais completo)

### 2. Posso usar múltiplos campos ao mesmo tempo?

**Sim!** A configuração do "Campo Principal" é apenas um padrão. Você pode:
- Criar vários controles de data
- Cada controle pode usar um campo diferente
- Todos funcionam independentemente

### 3. O que acontece se eu filtrar por Data de Pagamento?

Os registros **sem pagamento** (status "A Pagar", "A Receber") **não aparecerão** porque não têm `payment_date` preenchido.

**Solução**: Use filtro adicional de status_parcela:
- "Paga" → tem payment_date
- "A Pagar" → não tem payment_date

### 4. Como ver contas não pagas?

**Opção 1**: Filtrar por Data de Vencimento + Status = "A Pagar"
**Opção 2**: Não aplicar filtro de Data de Pagamento

### 5. Posso ver no mesmo relatório contas pagas e não pagas?

**Sim!** Use **Data de Vencimento** como filtro principal. Isso mostra todas as contas do período, independentemente do status de pagamento.

## Dicas de Performance

1. **Sempre use um filtro de data**: Melhora drasticamente a performance
2. **Campo Principal = Data de Vencimento**: Geralmente a melhor escolha (todos os registros têm)
3. **Evite períodos muito longos**: Limite a 12 meses quando possível
4. **Cache do Connector**: Configurado para 30 minutos

## Exemplos de Relatórios

### Dashboard de Tesouraria
- **Controle 1**: Data de Pagamento (mês atual)
- **Gráfico 1**: Fluxo de Caixa Efetivado (soma por dia)
- **Tabela 1**: Pagamentos do período

### Dashboard de Contas a Pagar
- **Controle 1**: Data de Vencimento (próximos 30 dias)
- **Gráfico 1**: A Pagar por Status
- **Tabela 1**: Contas Vencidas (balance > 0)

### Dashboard de Análise de Prazo
- **Controle 1**: Data de Vencimento (mês)
- **Campo Calculado**: `DATEDIFF(payment_date, due_date)`
- **Gráfico 1**: Prazo Médio de Pagamento

## Resumo

✅ **Novo**: Dropdown para escolher campo de data principal
✅ **Sempre disponível**: Todos os 4 campos de data para uso em controles
✅ **Flexibilidade**: Múltiplos controles de data independentes
✅ **Performance**: Filtros de data melhoram velocidade de busca

**Próximos passos**:
1. Editar conexão no Looker Studio
2. Escolher campo principal
3. Criar controles de data conforme necessidade
4. Testar filtros e validar resultados
