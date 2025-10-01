# Análise de Capacidade - Extract Data Connector

**Data da Análise**: 2025-01-30
**Banco de Dados**: PostgreSQL Produção (147.93.15.121)

---

## 📊 Dados Reais do Banco de Produção

### OUTCOME_DATA
```
Total de Registros: 129.616
Tamanho no Disco:   522 MB
Bytes/Registro:     4.026 bytes (~4 KB)

Breakdown por Período:
├─ Últimos 30 dias:  10.771 registros
├─ Últimos 90 dias:  17.868 registros
├─ Últimos 180 dias: 27.090 registros
├─ Último ano:       43.406 registros
├─ Últimos 18 meses: 57.451 registros
└─ Últimos 2 anos:   72.234 registros

Datas:
├─ Mais antiga:  0234-12-30 ⚠️ (data corrompida)
└─ Mais recente: 9202-09-06 ⚠️ (data corrompida)
```

### INCOME_DATA
```
Total de Registros: 83.106
Tamanho no Disco:   294 MB
Bytes/Registro:     3.537 bytes (~3.5 KB)

Breakdown por Período:
├─ Últimos 30 dias:  30.705 registros (!)
├─ Últimos 90 dias:  33.708 registros
├─ Últimos 180 dias: 39.395 registros
├─ Último ano:       50.096 registros
├─ Últimos 18 meses: 57.851 registros
└─ Últimos 2 anos:   65.092 registros

Datas:
├─ Mais antiga:  2020-10-01 ✅
└─ Mais recente: 2202-12-16 ⚠️ (data futura corrompida)
```

### TOTAL COMBINADO
```
Total Geral:     212.722 registros
Tamanho Total:   816 MB
Período Real:    2020-10-01 até hoje (com dados corrompidos)
```

---

## 🔍 Estimativas de Tamanho por Período (INCOME + OUTCOME)

### Cálculo Base
```
Outcome: 4.026 bytes/registro = 4 KB
Income:  3.537 bytes/registro = 3.5 KB
```

### Estimativas Detalhadas

#### Últimos 30 Dias
```
Outcome: 10.771 registros × 4 KB     = 43,1 MB
Income:  30.705 registros × 3.5 KB   = 107,5 MB
TOTAL:   41.476 registros            = 150,6 MB ❌ EXCEDE LIMITE
```

#### Últimos 90 Dias
```
Outcome: 17.868 registros × 4 KB     = 71,5 MB
Income:  33.708 registros × 3.5 KB   = 118,0 MB
TOTAL:   51.576 registros            = 189,5 MB ❌ EXCEDE LIMITE
```

#### Últimos 180 Dias
```
Outcome: 27.090 registros × 4 KB     = 108,4 MB
Income:  39.395 registros × 3.5 KB   = 137,9 MB
TOTAL:   66.485 registros            = 246,3 MB ❌ EXCEDE LIMITE
```

#### Último Ano (365 dias)
```
Outcome: 43.406 registros × 4 KB     = 173,6 MB
Income:  50.096 registros × 3.5 KB   = 175,3 MB
TOTAL:   93.502 registros            = 348,9 MB ❌ EXCEDE LIMITE
```

#### Últimos 18 Meses
```
Outcome: 57.451 registros × 4 KB     = 229,8 MB
Income:  57.851 registros × 3.5 KB   = 202,5 MB
TOTAL:   115.302 registros           = 432,3 MB ❌ EXCEDE LIMITE
```

#### Últimos 2 Anos
```
Outcome: 72.234 registros × 4 KB     = 288,9 MB
Income:  65.092 registros × 3.5 KB   = 227,8 MB
TOTAL:   137.326 registros           = 516,7 MB ❌ EXCEDE LIMITE
```

---

## ⚠️ PROBLEMA CRÍTICO IDENTIFICADO

### Extract Data NÃO É SUFICIENTE

```
Limite do Extract Data:  100 MB
Dados Últimos 30 dias:   150,6 MB

VIOLAÇÃO: 50,6% acima do limite (1.5x over)
```

**Conclusão**: Mesmo com Extract Data (100 MB), **NÃO CONSEGUIMOS** armazenar nem 30 dias de dados!

---

## 🔍 Análise Aprofundada

### Por que Income_Data é tão grande nos últimos 30 dias?

```
Income últimos 30d:  30.705 registros (36.9% do total)
Outcome últimos 30d: 10.771 registros (8.3% do total)

Observação: Income tem 2.85x MAIS registros nos últimos 30 dias que Outcome
```

**Possível Causa**:
- Novo sistema começou a gerar muito mais contas a receber recentemente
- Migração de dados históricos
- Importação em lote recente

### Datas Corrompidas

Identificadas datas inválidas no banco:
```
Outcome: 0234-12-30 (ano 234)
Outcome: 9202-09-06 (ano 9202)
Income:  2202-12-16 (ano 2202)
```

**Recomendação**: Limpar dados corrompidos antes de qualquer sync

---

## 🎯 Soluções Viáveis (Reavaliadas)

### ❌ Solução 1: Extract Data Puro - NÃO VIÁVEL

**Razão**: Limite de 100 MB não comporta nem 30 dias (150 MB necessários)

---

### ⭐⭐⭐ Solução 2: BigQuery Intermediate Layer - NECESSÁRIA

**Arquitetura**:
```
PostgreSQL (816 MB)
      ↓
Apps Script Sync (1x/dia às 2 AM)
      ↓
BigQuery (sem limite de tamanho)
      ↓
Looker Studio (queries nativas BigQuery)
      ↓
Usuários (acesso ilimitado, performance excelente)
```

**Vantagens**:
- ✅ Suporta 816 MB completos (TODOS os dados históricos)
- ✅ Performance extremamente rápida
- ✅ Custo baixo (~$3-5/mês)
- ✅ Queries ilimitadas
- ✅ Looker Studio integração nativa

**Por que BigQuery é NECESSÁRIO**:
1. Extract Data: 100 MB ❌ (precisa 150 MB)
2. Community Connector: 50 MB ❌ (precisa 150 MB)
3. **BigQuery: SEM LIMITE ✅**

---

### ⭐⭐ Solução 3: Field Filtering + Server-Side Filtering

**Objetivo**: Reduzir tamanho dos dados para caber em Extract Data

**Estratégias de Redução**:

#### 3.1. Field Filtering (Reduzir Campos)
```
Campos Atuais: ~80 campos
Campos Essenciais: ~20 campos

Redução Estimada: 75%

Com Field Filtering:
├─ Outcome 30d: 43,1 MB → 10,8 MB
├─ Income 30d:  107,5 MB → 26,9 MB
└─ TOTAL 30d:   150,6 MB → 37,7 MB ✅ CABE!

Com Field Filtering:
├─ Outcome 90d: 71,5 MB → 17,9 MB
├─ Income 90d:  118,0 MB → 29,5 MB
└─ TOTAL 90d:   189,5 MB → 47,4 MB ✅ CABE!

Com Field Filtering:
├─ Outcome 180d: 108,4 MB → 27,1 MB
├─ Income 180d:  137,9 MB → 34,5 MB
└─ TOTAL 180d:   246,3 MB → 61,6 MB ✅ CABE!

Com Field Filtering:
├─ Outcome 365d: 173,6 MB → 43,4 MB
├─ Income 365d:  175,3 MB → 43,8 MB
└─ TOTAL 365d:   348,9 MB → 87,2 MB ✅ CABE!
```

**Conclusão**: Com field filtering reduzindo para 20 campos (75% redução), conseguimos:
- ✅ 30 dias: 37,7 MB
- ✅ 90 dias: 47,4 MB
- ✅ 180 dias: 61,6 MB
- ✅ **1 ANO COMPLETO: 87,2 MB** ✅

#### 3.2. Agregação Inteligente
```
Para períodos > 90 dias: Agregar por dia/mês

Outcome 1 ano:
├─ Dados brutos: 43.406 registros = 173,6 MB
├─ Agregado por dia: 365 registros = 1,5 MB ✅
└─ Redução: 99,1%

Income 1 ano:
├─ Dados brutos: 50.096 registros = 175,3 MB
├─ Agregado por dia: 365 registros = 1,3 MB ✅
└─ Redução: 99,3%
```

**Estratégia Híbrida**:
```
Extract Data 1: Últimos 90 dias (detalhado)
├─ Com field filtering: 47,4 MB ✅
└─ Todos os campos necessários para análise detalhada

Extract Data 2: 91-365 dias (agregado por dia)
├─ 275 dias × 2 registros/dia = 550 registros = 2 MB ✅
└─ Campos agregados: total_amount, count, avg, etc.

TOTAL: 49,4 MB ✅ (dentro do limite de 100 MB)
```

---

### ⭐ Solução 4: Limpeza de Dados Corrompidos

**Antes de qualquer solução**: Limpar datas inválidas

```sql
-- Identificar registros com datas corrompidas
SELECT COUNT(*)
FROM outcome_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31';

SELECT COUNT(*)
FROM income_data
WHERE due_date < '2020-01-01' OR due_date > '2030-12-31';

-- Estratégia:
-- 1. Corrigir datas corrompidas (se possível)
-- 2. Deletar registros inválidos (se não puderem ser corrigidos)
-- 3. Adicionar constraint para prevenir futuras corrupções
```

---

## 📋 Comparação de Soluções

| Solução | Período Máximo | Tamanho Final | Esforço | Custo | Nota |
|---------|----------------|---------------|---------|-------|------|
| **Extract Data Puro** | ❌ Não cabe | 150 MB > 100 MB | - | $0 | ❌ Inviável |
| **BigQuery Layer** | ✅ Completo (4+ anos) | Ilimitado | 4-6h | $3-5/mês | ⭐⭐⭐ |
| **Field Filtering + Extract** | ✅ 1 ano | 87,2 MB | 3-4h | $0 | ⭐⭐⭐ |
| **Hybrid Extract (90d + agregado)** | ✅ 1 ano | 49,4 MB | 4-5h | $0 | ⭐⭐ |

---

## ✅ Recomendação Final

### Opção A: BigQuery (Melhor a Longo Prazo) ⭐⭐⭐

**Implementar BigQuery Intermediate Layer**

**Razões**:
1. ✅ Volume atual (816 MB) já é 8x maior que limit Extract Data
2. ✅ Dados crescendo (30 dias = 150 MB)
3. ✅ BigQuery suporta crescimento ilimitado
4. ✅ Performance superior
5. ✅ Custo baixo ($3-5/mês)
6. ✅ Solução definitiva (não precisa refazer depois)

**Esforço**: 4-6 horas
**Resultado**: Solução permanente e escalável

---

### Opção B: Field Filtering + Extract Data (Rápido) ⭐⭐

**Implementar field filtering para reduzir 75% + Extract Data**

**Razões**:
1. ✅ Consegue 1 ano de dados (87,2 MB)
2. ✅ Custo zero
3. ✅ Mais rápido que BigQuery

**Limitações**:
- ⚠️ Quando dados crescerem, vai ultrapassar 100 MB
- ⚠️ Solução temporária (vai precisar BigQuery no futuro)

**Esforço**: 3-4 horas
**Resultado**: Solução temporária (6-12 meses)

---

## 🚨 Problemas a Resolver ANTES

### 1. Datas Corrompidas
```
- Outcome: 0234-12-30, 9202-09-06
- Income: 2202-12-16
```

**Ação**: Limpar ou corrigir antes de sync

### 2. Volume de Income_Data
```
30 dias = 30.705 registros (37% do total)
```

**Investigar**: Por que tantos registros recentes em Income?

---

**Próximo Passo**: Escolher entre BigQuery (definitivo) ou Field Filtering (temporário)?
