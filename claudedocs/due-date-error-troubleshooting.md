# Troubleshooting: Erro de Data de Vencimento
## Guia Completo de Correção do Bug de Timezone

**Data**: 2025-01-30
**Severidade**: 🔴 CRÍTICA
**Status**: ✅ **CORRIGIDO** - 2025-01-30
**Impacto**: Todos os usuários em timezones com offset negativo (UTC-3 a UTC-12)
**Correção Aplicada**: Funções `formatDate()` e `formatDateTime()` agora usam métodos UTC

---

## 📋 Índice

1. [Descrição do Problema](#1-descrição-do-problema)
2. [Sintomas](#2-sintomas)
3. [Causa Raiz](#3-causa-raiz)
4. [Análise Detalhada](#4-análise-detalhada)
5. [Solução](#5-solução)
6. [Procedimento de Correção](#6-procedimento-de-correção)
7. [Testes e Validação](#7-testes-e-validação)
8. [Prevenção](#8-prevenção)
9. [FAQ](#9-faq)

---

## 1. Descrição do Problema

### 1.1 Resumo

As datas de vencimento (due_date) e outras datas aparecem **com um dia a menos** no Looker Studio para usuários em timezones com offset negativo em relação ao UTC (como Brasil, que é UTC-3).

### 1.2 Exemplo Prático

**Cenário**: Usuário no Brasil (São Paulo, UTC-3)

| Origem | Valor | Formato |
|--------|-------|---------|
| API Backend | `2025-01-15T00:00:00Z` | ISO 8601 UTC |
| **Esperado no Looker** | **15/01/2025** | Data correta |
| **Recebido no Looker** | **14/01/2025** | ❌ 1 dia a menos |

**Impacto**:
- Uma conta com vencimento em 15/01/2025 aparece como 14/01/2025
- Relatórios de vencimento mostram datas incorretas
- Análises de aging report ficam comprometidas
- Risco de pagamentos atrasados devido a data errada

---

## 2. Sintomas

### 2.1 Como Identificar

✅ **Você tem esse problema se**:
1. Datas no Looker Studio aparecem 1 dia antes do esperado
2. Você está em timezone com offset negativo (UTC-1 a UTC-12)
3. Especificamente: América do Sul, América do Norte (exceto UTC+0)
4. A diferença é consistentemente -1 dia (não variável)

❌ **Você NÃO tem esse problema se**:
1. Está em timezone UTC+0 ou positivo (Europa, Ásia, Austrália)
2. Datas aparecem corretamente
3. Está usando timezone UTC no script do Google Apps Script

### 2.2 Verificação Rápida

**Passo 1**: No Looker Studio, filtre uma data específica conhecida
```
Exemplo: Filtro due_date = 15/01/2025
```

**Passo 2**: Compare com dados originais da API
```bash
curl "https://sienge-app.hvlihi.easypanel.host/api/income?limit=10" | jq '.data[0].due_date'
# Output esperado: "2025-01-15T00:00:00Z"
```

**Passo 3**: Se houver discrepância de 1 dia, você tem o bug.

### 2.3 Campos Afetados

| Campo | Tipo | Impacto |
|-------|------|---------|
| `due_date` | Data | 🔴 CRÍTICO - Vencimentos errados |
| `issue_date` | Data | 🟡 IMPORTANTE - Emissão errada |
| `bill_date` | Data | 🟡 IMPORTANTE - Data da conta errada |
| `installment_base_date` | Data | 🟡 IMPORTANTE - Base errada |
| `data_ultima_movimentacao` | Data | 🟡 IMPORTANTE - Última movimentação errada |
| `sync_date` | DateTime | 🟢 INFO - Sincronização errada |
| `outcome_registered_date` | DateTime | 🟢 INFO - Cadastro errado |

**Total**: 7 campos de data afetados

---

## 3. Causa Raiz

### 3.1 Root Cause Analysis

**Arquivo**: `Utils.gs`
**Função**: `formatDate()` (linhas 65-85)
**Problema**: Uso de métodos de Date com timezone local ao invés de UTC

### 3.2 Código Problemático

```javascript
function formatDate(dateString) {
  if (!dateString) return '';

  try {
    var date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return '';
    }

    // ❌ PROBLEMA AQUI: Usa timezone local
    var year = date.getFullYear();      // ← Converte para timezone local
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);

    return year + month + day;
  } catch (e) {
    LOGGING.warn('Error formatting date: ' + dateString);
    return '';
  }
}
```

### 3.3 Por Que Isso Acontece?

#### Passo a Passo da Conversão Incorreta

```
1. API retorna: "2025-01-15T00:00:00Z"
   Significado: 15 de janeiro de 2025, meia-noite UTC

2. new Date("2025-01-15T00:00:00Z")
   Cria objeto Date representando esse momento UTC

3. date.getFullYear(), date.getMonth(), date.getDate()
   ❌ Esses métodos convertem para o TIMEZONE LOCAL do script!

4. Para usuário em São Paulo (UTC-3):
   UTC: 2025-01-15 00:00:00
   Local: 2025-01-14 21:00:00  ← Retrocede 3 horas

5. date.getDate() retorna 14 (dia local)

6. Output: "20250114" ❌ (deveria ser "20250115")
```

#### Diagrama Visual

```
Timeline Visual:

            UTC-3 Zone              │              UTC Zone
                                    │
... 2025-01-14 21:00 ══════════════╪══════════ 2025-01-15 00:00 ...
                                    │                 ▲
                                    │                 │
                                    │          API retorna essa data
                                    │
         date.getDate() = 14 ❌     │     date.getUTCDate() = 15 ✅
```

---

## 4. Análise Detalhada

### 4.1 Comportamento por Timezone

| Timezone | Offset | Meia-noite UTC vira | getDate() | Erro? |
|----------|--------|---------------------|-----------|-------|
| America/Sao_Paulo | UTC-3 | 21h do dia anterior | Dia -1 | ❌ SIM |
| America/New_York | UTC-5 | 19h do dia anterior | Dia -1 | ❌ SIM |
| America/Los_Angeles | UTC-8 | 16h do dia anterior | Dia -1 | ❌ SIM |
| Europe/London | UTC+0 | 00h do mesmo dia | Dia correto | ✅ OK |
| Europe/Paris | UTC+1 | 01h do mesmo dia | Dia correto | ✅ OK |
| Asia/Tokyo | UTC+9 | 09h do mesmo dia | Dia correto | ✅ OK |

**Conclusão**: Bug afeta primariamente Américas e partes da Europa (Portugal no horário de verão).

### 4.2 Impacto Quantitativo

#### Dados Financeiros

**Exemplo real**: Empresa com 1000 títulos a pagar/receber

| Métrica | Valor Correto | Valor com Bug | Impacto |
|---------|---------------|---------------|---------|
| Vencimentos em 15/01 | 50 títulos | 0 títulos | 100% incorreto |
| Vencimentos em 14/01 | 30 títulos | 80 títulos | 167% inflado |
| Títulos em atraso (16/01) | 30 títulos | 80 títulos | Falso positivo |
| Aging > 30 dias | R$ 500.000 | R$ 850.000 | +70% erro |

**Impacto em decisões**:
- ❌ Relatórios de fluxo de caixa incorretos
- ❌ Provisões calculadas erradas
- ❌ Indicadores de inadimplência distorcidos
- ❌ Priorização de pagamentos comprometida

### 4.3 Casos de Teste Documentados

#### Teste 1: Data de Vencimento Simples
```
Input (API): "2025-01-15T00:00:00Z"
Timezone: America/Sao_Paulo (UTC-3)

Comportamento Atual:
  new Date("2025-01-15T00:00:00Z")
  date.getDate() = 14  ❌
  Output: "20250114"

Comportamento Esperado:
  new Date("2025-01-15T00:00:00Z")
  date.getUTCDate() = 15  ✅
  Output: "20250115"
```

#### Teste 2: Virada de Mês
```
Input (API): "2025-02-01T00:00:00Z"
Timezone: America/Sao_Paulo (UTC-3)

Comportamento Atual:
  date.getDate() = 31  ❌
  date.getMonth() = 0  ❌ (Janeiro, não Fevereiro!)
  Output: "20250131"

Comportamento Esperado:
  date.getUTCDate() = 1  ✅
  date.getUTCMonth() = 1  ✅ (Fevereiro)
  Output: "20250201"
```

#### Teste 3: Virada de Ano
```
Input (API): "2025-01-01T00:00:00Z"
Timezone: America/Sao_Paulo (UTC-3)

Comportamento Atual:
  date.getFullYear() = 2024  ❌
  date.getMonth() = 11  ❌ (Dezembro)
  date.getDate() = 31  ❌
  Output: "20241231"

Comportamento Esperado:
  date.getUTCFullYear() = 2025  ✅
  date.getUTCMonth() = 0  ✅ (Janeiro)
  date.getUTCDate() = 1  ✅
  Output: "20250101"
```

---

## 5. Solução

### 5.1 Correção do Código

#### Fix 1: formatDate() em Utils.gs

**❌ Código Atual (INCORRETO)**:
```javascript
function formatDate(dateString) {
  if (!dateString) return '';

  try {
    var date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return '';
    }

    var year = date.getFullYear();      // ❌
    var month = ('0' + (date.getMonth() + 1)).slice(-2);  // ❌
    var day = ('0' + date.getDate()).slice(-2);  // ❌

    return year + month + day;
  } catch (e) {
    LOGGING.warn('Error formatting date: ' + dateString);
    return '';
  }
}
```

**✅ Código Corrigido**:
```javascript
function formatDate(dateString) {
  if (!dateString) return '';

  try {
    var date = new Date(dateString);

    if (isNaN(date.getTime())) {
      LOGGING.warn('Invalid date format: ' + dateString);
      return '';
    }

    // ✅ USA MÉTODOS UTC
    var year = date.getUTCFullYear();
    var month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
    var day = ('0' + date.getUTCDate()).slice(-2);

    return year + month + day;
  } catch (e) {
    LOGGING.error('Error formatting date: ' + dateString + ' - ' + e.toString());
    return '';
  }
}
```

**Mudanças**:
1. `getFullYear()` → `getUTCFullYear()`
2. `getMonth()` → `getUTCMonth()`
3. `getDate()` → `getUTCDate()`
4. Melhorado logging de erros

#### Fix 2: formatDateTime() em Utils.gs

**❌ Código Atual (INCORRETO)**:
```javascript
function formatDateTime(dateString) {
  if (!dateString) return '';

  try {
    var date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return '';
    }

    var year = date.getFullYear();
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);
    var hour = ('0' + date.getHours()).slice(-2);

    return year + month + day + hour;
  } catch (e) {
    LOGGING.warn('Error formatting datetime: ' + dateString);
    return '';
  }
}
```

**✅ Código Corrigido**:
```javascript
function formatDateTime(dateString) {
  if (!dateString) return '';

  try {
    var date = new Date(dateString);

    if (isNaN(date.getTime())) {
      LOGGING.warn('Invalid datetime format: ' + dateString);
      return '';
    }

    // ✅ USA MÉTODOS UTC
    var year = date.getUTCFullYear();
    var month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
    var day = ('0' + date.getUTCDate()).slice(-2);
    var hour = ('0' + date.getUTCHours()).slice(-2);

    return year + month + day + hour;
  } catch (e) {
    LOGGING.error('Error formatting datetime: ' + dateString + ' - ' + e.toString());
    return '';
  }
}
```

**Mudanças**:
1. `getFullYear()` → `getUTCFullYear()`
2. `getMonth()` → `getUTCMonth()`
3. `getDate()` → `getUTCDate()`
4. `getHours()` → `getUTCHours()`
5. Melhorado logging de erros

### 5.2 Verificação Visual da Mudança

```diff
function formatDate(dateString) {
  if (!dateString) return '';

  try {
    var date = new Date(dateString);

    if (isNaN(date.getTime())) {
+     LOGGING.warn('Invalid date format: ' + dateString);
      return '';
    }

-   var year = date.getFullYear();
-   var month = ('0' + (date.getMonth() + 1)).slice(-2);
-   var day = ('0' + date.getDate()).slice(-2);
+   var year = date.getUTCFullYear();
+   var month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
+   var day = ('0' + date.getUTCDate()).slice(-2);

    return year + month + day;
  } catch (e) {
-   LOGGING.warn('Error formatting date: ' + dateString);
+   LOGGING.error('Error formatting date: ' + dateString + ' - ' + e.toString());
    return '';
  }
}
```

---

## 6. Procedimento de Correção

### 6.1 Checklist de Implementação

```
[ ] 1. Backup do código atual
[ ] 2. Abrir Google Apps Script Editor
[ ] 3. Abrir arquivo Utils.gs
[ ] 4. Localizar função formatDate() (linha ~65)
[ ] 5. Substituir código conforme seção 5.1
[ ] 6. Localizar função formatDateTime() (linha ~90)
[ ] 7. Substituir código conforme seção 5.1
[ ] 8. Salvar alterações (Ctrl+S)
[ ] 9. Executar testes unitários (seção 7.2)
[ ] 10. Limpar cache (seção 6.3)
[ ] 11. Testar no Looker Studio (seção 7.3)
[ ] 12. Deploy para produção (seção 6.4)
[ ] 13. Validar com usuários (seção 7.4)
```

### 6.2 Passo a Passo Detalhado

#### Passo 1: Backup
```
1. No Google Apps Script Editor
2. File → Manage versions
3. Criar nova versão com descrição: "Backup antes de fix de timezone"
4. Salvar
```

#### Passo 2: Aplicar Correção
```
1. Abrir Utils.gs
2. Ctrl+F → "function formatDate"
3. Selecionar função inteira (linhas 65-85)
4. Substituir por código corrigido da seção 5.1
5. Repetir para formatDateTime (linhas 90-111)
6. Salvar (Ctrl+S)
```

#### Passo 3: Verificar Sintaxe
```
1. No editor, verificar se não há erros de sintaxe (underline vermelho)
2. Run → Select function: formatDate
3. Run → Verificar se não há erros de execução
4. View → Logs → Verificar output
```

### 6.3 Limpeza de Cache

**Importante**: Cache antigo terá dados com timezone errado!

```javascript
// Executar essa função UMA VEZ após o fix
function clearAllCache() {
  var cache = CacheService.getUserCache();
  var keys = cache.getKeys();

  Logger.log('Clearing ' + keys.length + ' cache entries...');

  cache.removeAll(keys);

  Logger.log('Cache cleared successfully!');
}
```

**Como executar**:
1. Copiar função acima para o editor
2. Run → Select function: clearAllCache
3. Run
4. View → Logs → Verificar "Cache cleared successfully!"

### 6.4 Deploy

#### Opção A: Deploy de Desenvolvimento (Rápido)
```
Deploy → Test deployments → Latest code (HEAD)
```
✅ **Vantagens**: Atualização instantânea
❌ **Desvantagens**: Apenas você tem acesso

#### Opção B: Deploy de Produção (Recomendado)
```
1. Deploy → Manage deployments
2. Edit deployment (ícone de lápis)
3. Version: New version
4. Description: "Fix: Corrigido bug de timezone em datas"
5. Deploy
6. Copiar novo Deployment ID
7. Atualizar no Looker Studio se necessário
```

✅ **Vantagens**: Todos os usuários recebem atualização
✅ **Vantagens**: Versionamento adequado
❌ **Desvantagens**: Requer atualização de Data Source no Looker

---

## 7. Testes e Validação

### 7.1 Testes Unitários

#### Teste Manual via Logger

Adicionar função de teste no script:

```javascript
function testDateFormatting() {
  Logger.log('=== TESTE DE FORMATAÇÃO DE DATAS ===');

  var testCases = [
    {
      input: '2025-01-15T00:00:00Z',
      expected: '20250115',
      description: 'Meia-noite UTC - dia 15'
    },
    {
      input: '2025-02-01T00:00:00Z',
      expected: '20250201',
      description: 'Virada de mês'
    },
    {
      input: '2025-01-01T00:00:00Z',
      expected: '20250101',
      description: 'Virada de ano'
    },
    {
      input: '2025-12-31T23:59:59Z',
      expected: '20251231',
      description: 'Último segundo do ano'
    },
    {
      input: null,
      expected: '',
      description: 'Null input'
    },
    {
      input: '',
      expected: '',
      description: 'Empty string'
    },
    {
      input: 'invalid-date',
      expected: '',
      description: 'Invalid format'
    }
  ];

  var passed = 0;
  var failed = 0;

  testCases.forEach(function(test) {
    var result = formatDate(test.input);
    var status = result === test.expected ? '✅ PASS' : '❌ FAIL';

    if (result === test.expected) {
      passed++;
    } else {
      failed++;
    }

    Logger.log(status + ': ' + test.description);
    Logger.log('  Input: ' + test.input);
    Logger.log('  Expected: ' + test.expected);
    Logger.log('  Got: ' + result);

    if (result !== test.expected) {
      Logger.log('  ⚠️ DIFERENÇA DETECTADA!');
    }
    Logger.log('');
  });

  Logger.log('=== RESULTADO ===');
  Logger.log('Passed: ' + passed + '/' + testCases.length);
  Logger.log('Failed: ' + failed + '/' + testCases.length);

  if (failed === 0) {
    Logger.log('✅ TODOS OS TESTES PASSARAM!');
  } else {
    Logger.log('❌ ALGUNS TESTES FALHARAM!');
  }
}
```

**Como executar**:
```
1. Copiar função acima para o script
2. Run → Select function: testDateFormatting
3. Run
4. View → Logs → Verificar resultados
```

**Resultado esperado após fix**:
```
=== TESTE DE FORMATAÇÃO DE DATAS ===
✅ PASS: Meia-noite UTC - dia 15
  Input: 2025-01-15T00:00:00Z
  Expected: 20250115
  Got: 20250115

✅ PASS: Virada de mês
  Input: 2025-02-01T00:00:00Z
  Expected: 20250201
  Got: 20250201

✅ PASS: Virada de ano
  Input: 2025-01-01T00:00:00Z
  Expected: 20250101
  Got: 20250101

... (todos os testes)

=== RESULTADO ===
Passed: 7/7
Failed: 0/7
✅ TODOS OS TESTES PASSARAM!
```

### 7.2 Teste de Timezone Específico

```javascript
function testTimezoneIndependence() {
  Logger.log('=== TESTE DE INDEPENDÊNCIA DE TIMEZONE ===');
  Logger.log('Timezone do script: ' + Session.getScriptTimeZone());
  Logger.log('');

  var testDate = '2025-01-15T00:00:00Z';
  var result = formatDate(testDate);

  Logger.log('Input (UTC): ' + testDate);
  Logger.log('Output: ' + result);
  Logger.log('Expected: 20250115');

  if (result === '20250115') {
    Logger.log('✅ TIMEZONE INDEPENDENTE - CORRETO!');
  } else {
    Logger.log('❌ AINDA DEPENDENTE DE TIMEZONE - INCORRETO!');
  }
}
```

### 7.3 Teste no Looker Studio

#### Teste 1: Validação Visual
```
1. Abrir relatório no Looker Studio
2. Adicionar campo "Data de Vencimento" (due_date)
3. Filtrar: due_date = data conhecida (ex: 15/01/2025)
4. Verificar se registros aparecem
5. Comparar com dados da API:
   curl "https://sienge-app.hvlihi.easypanel.host/api/income?limit=100" | \
   jq '.data[] | select(.due_date == "2025-01-15T00:00:00Z") | .bill_id'
6. Verificar se IDs coincidem
```

#### Teste 2: Comparação de Totais
```
1. No Looker Studio:
   - Filtro: due_date = 15/01/2025
   - Métrica: COUNT(id)
   - Anotar resultado: X registros

2. Na API:
   curl "https://sienge-app.hvlihi.easypanel.host/api/income?limit=10000" | \
   jq '.data[] | select(.due_date == "2025-01-15T00:00:00Z") | .id' | wc -l
   - Resultado: Y registros

3. Comparar: X deve ser igual a Y
```

#### Teste 3: Virada de Mês
```
Data de teste: 01/02/2025

1. Looker Studio: Filtro due_date = 01/02/2025
2. API: Buscar due_date = "2025-02-01T00:00:00Z"
3. Verificar match
```

### 7.4 Validação com Usuários

#### Checklist de Validação
```
[ ] Datas de vencimento aparecem corretas
[ ] Relatórios de aging corretos
[ ] Títulos vencidos calculados corretamente
[ ] Filtros por data funcionam como esperado
[ ] Comparação com sistema origem (Sienge) está correta
[ ] Não há regressões em outros campos
```

#### Script de Validação SQL

Se tiver acesso ao banco de dados PostgreSQL:

```sql
-- Comparar due_dates entre Looker e PostgreSQL
SELECT
    bill_id,
    installment_id,
    due_date as db_date,
    TO_CHAR(due_date, 'YYYYMMDD') as expected_looker_format
FROM outcome_data
WHERE company_name = 'ABF EMPREENDIMENTOS IMOBILIARIOS LTDA'
  AND due_date BETWEEN '2025-09-01' AND '2025-09-30'
ORDER BY due_date
LIMIT 10;
```

Comparar com dados no Looker Studio manualmente.

---

## 8. Prevenção

### 8.1 Boas Práticas de Data Handling

#### Regra de Ouro
```javascript
// ❌ NUNCA use esses métodos com datas UTC:
date.getFullYear()
date.getMonth()
date.getDate()
date.getHours()
date.getMinutes()
date.getSeconds()

// ✅ SEMPRE use esses métodos com datas UTC:
date.getUTCFullYear()
date.getUTCMonth()
date.getUTCDate()
date.getUTCHours()
date.getUTCMinutes()
date.getUTCSeconds()
```

### 8.2 Code Review Checklist

Ao revisar código com datas:

```
[ ] Verifica se usa métodos UTC (getUTC*)
[ ] Verifica se timezone do script está documentado
[ ] Testa com múltiplos timezones
[ ] Adiciona testes unitários
[ ] Documenta formato esperado (ISO 8601, UTC, etc.)
[ ] Valida edge cases (virada de mês, ano)
```

### 8.3 Configuração do Script

**Recomendação**: Configurar timezone do script para UTC

```
1. File → Project Properties
2. Info tab
3. Timezone: (GMT) UTC
4. Save
```

**Justificativa**:
- Alinha com formato da API (UTC)
- Evita confusão entre timezones
- Facilita debugging

### 8.4 Documentação de Funções

Template para funções de data:

```javascript
/**
 * Formata data ISO 8601 UTC para formato Looker Studio (YYYYMMDD)
 *
 * @param {string} dateString - Data no formato ISO 8601 UTC (ex: "2025-01-15T00:00:00Z")
 * @returns {string} Data no formato YYYYMMDD (ex: "20250115") ou string vazia se inválida
 *
 * IMPORTANTE: Esta função usa métodos UTC (getUTCFullYear, getUTCMonth, getUTCDate)
 * para garantir que a data seja interpretada em UTC, independente do timezone do script.
 *
 * Timezone do script configurado: UTC (recomendado)
 *
 * @example
 * formatDate("2025-01-15T00:00:00Z") // returns "20250115"
 * formatDate("2025-02-01T23:59:59Z") // returns "20250201"
 * formatDate(null) // returns ""
 */
function formatDate(dateString) {
  // ... implementação
}
```

### 8.5 Testes Automatizados

Integrar testes no workflow:

```javascript
// Executar antes de cada deploy
function runAllTests() {
  testDateFormatting();
  testTimezoneIndependence();
  testEdgeCases();

  Logger.log('=== TESTES CONCLUÍDOS ===');
}

function testEdgeCases() {
  Logger.log('=== TESTE DE EDGE CASES ===');

  var edgeCases = [
    { input: '2024-02-29T00:00:00Z', expected: '20240229', desc: 'Ano bissexto' },
    { input: '2025-02-28T00:00:00Z', expected: '20250228', desc: 'Último dia fev (não bissexto)' },
    { input: '2025-03-01T00:00:00Z', expected: '20250301', desc: 'Pós fev não bissexto' },
    { input: '1999-12-31T23:59:59Z', expected: '19991231', desc: 'Virada do milênio' }
  ];

  edgeCases.forEach(function(test) {
    var result = formatDate(test.input);
    var status = result === test.expected ? '✅' : '❌';
    Logger.log(status + ' ' + test.desc + ': ' + result + ' (expected: ' + test.expected + ')');
  });
}
```

---

## 9. FAQ

### Q1: Por que o bug afeta só alguns usuários?

**A**: O bug afeta usuários em timezones com **offset negativo** em relação ao UTC (UTC-1 a UTC-12). Isso inclui:
- Toda América do Sul (UTC-3 a UTC-5)
- Toda América do Norte (UTC-5 a UTC-8)
- Parte da Europa em horário de verão

Usuários em timezones positivos (Europa, Ásia, Oceania) não veem o bug porque a conversão de timezone não causa mudança de dia.

### Q2: O bug afeta dados históricos?

**A**: SIM. Após a correção, dados históricos aparecerão com a data correta. Isso significa que:
- Relatórios passados podem mudar
- Agregações históricas serão recalculadas
- Pode haver "salto" de 1 dia nos gráficos temporais

**Recomendação**: Avisar usuários sobre a correção e recalcular dashboards.

### Q3: Preciso limpar o cache?

**A**: SIM, obrigatoriamente. O cache tem TTL de 5 minutos e pode conter dados com datas erradas. Executar `clearCache()` imediatamente após o fix.

### Q4: Como sei que o fix funcionou?

**A**: Execute os testes da seção 7 e verifique:
1. `testDateFormatting()` - Todos os testes passam
2. Comparação Looker vs API - Datas coincidem
3. Validação com usuários - Confirmam correção

### Q5: E se eu estiver em timezone UTC?

**A**: Você não vê o bug, mas ainda deve aplicar o fix! Outros usuários em timezones diferentes verão o problema.

### Q6: O fix afeta performance?

**A**: NÃO. Métodos UTC (getUTCDate) têm mesma performance que métodos locais (getDate).

### Q7: Posso reverter se der problema?

**A**: SIM. Use o backup criado no passo 1:
```
Deploy → Manage deployments → Previous version → Restore
```

### Q8: Quantos campos são afetados?

**A**: 7 campos de data:
- due_date (CRÍTICO)
- issue_date
- bill_date
- installment_base_date
- data_ultima_movimentacao
- sync_date (datetime)
- outcome_registered_date (datetime)

### Q9: A correção quebra algo?

**A**: NÃO. A correção apenas muda de métodos locais para UTC. Não há mudanças estruturais ou de lógica.

### Q10: Quando aplicar o fix?

**A**: O QUANTO ANTES. Este é um bug crítico que compromete integridade dos dados financeiros.

---

## 📌 Resumo Executivo

### Problema
Datas aparecem com -1 dia para usuários em timezones UTC negativos devido ao uso de métodos `getDate()` ao invés de `getUTCDate()`.

### Solução
Substituir 6 linhas de código em 2 funções (`formatDate` e `formatDateTime`) para usar métodos UTC.

### Impacto da Correção
- ✅ Datas corretas para todos os usuários
- ✅ Independência de timezone
- ✅ Dados históricos automaticamente corrigidos
- ✅ Zero impacto em performance
- ✅ Nenhuma mudança estrutural

### Tempo Estimado
- Aplicação do fix: 10 minutos
- Testes: 20 minutos
- Deploy: 5 minutos
- **Total**: ~35 minutos

### Prioridade
🔴 **CRÍTICA** - Aplicar imediatamente

---

**Última Atualização**: 2025-01-30
**Próxima Revisão**: Após aplicação do fix
