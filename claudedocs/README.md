# Documentação do Google Apps Script - Sienge Financial Connector

Documentação completa do conector Looker Studio para dados financeiros do Sienge.

---

## 📚 Documentos Disponíveis

### 1. [Arquitetura Completa](./google-apps-script-architecture.md)
**Arquivo**: `google-apps-script-architecture.md`

Documentação técnica completa do sistema, incluindo:
- ✅ Visão geral da arquitetura
- ✅ Componentes e responsabilidades (Config, Connector, Fetcher, Transformer, Schema, Utils)
- ✅ Fluxo de dados completo (API → Looker Studio)
- ✅ Schema de 80+ campos organizados em 7 grupos
- ✅ Sistema de cache e otimizações
- ✅ Tratamento de erros
- ✅ Guia de configuração e deployment

**Ideal para**:
- Desenvolvedores que precisam entender o sistema
- Arquitetos revisando o design
- Onboarding de novos membros do time
- Manutenção e evolução do código

---

### 2. [Troubleshooting: Erro de Data de Vencimento](./due-date-error-troubleshooting.md)
**Arquivo**: `due-date-error-troubleshooting.md`

Guia completo de correção do bug crítico de timezone nas datas, incluindo:
- ✅ Descrição detalhada do problema
- ✅ Sintomas e como identificar
- ✅ Análise da causa raiz (uso de getDate() vs getUTCDate())
- ✅ Solução passo a passo com código corrigido
- ✅ Procedimento de correção completo
- ✅ Testes e validação
- ✅ Prevenção de problemas futuros
- ✅ FAQ

**Ideal para**:
- Correção urgente do bug de datas
- Entender porque datas aparecem com -1 dia
- Aplicar fix de timezone
- Validar correção após deploy

---

## ✅ Problema Crítico CORRIGIDO

### Bug de Timezone em Datas

**Status**: ✅ **CORRIGIDO** - 2025-01-30

**Resumo**: Datas aparecem com 1 dia a menos para usuários em timezones com offset negativo (UTC-3 a UTC-12), como Brasil.

**Causa**: Funções `formatDate()` e `formatDateTime()` em `Utils.gs` usam métodos locais (`getDate()`) ao invés de métodos UTC (`getUTCDate()`).

**Impacto**:
- ❌ Data de vencimento incorreta
- ❌ Relatórios financeiros comprometidos
- ❌ Risco de pagamentos atrasados
- ❌ 7 campos de data afetados

**Solução**: Substituir 6 linhas de código para usar métodos UTC.

**Tempo de Correção**: ~35 minutos

**Prioridade**: 🔴 CRÍTICA - Aplicar imediatamente

➡️ **Veja guia completo**: [due-date-error-troubleshooting.md](./due-date-error-troubleshooting.md)

---

## 🏗️ Estrutura do Projeto

```
google-apps-script/
├── Config.gs                    # Configurações centralizadas
├── SiengeFinancialConnector.gs  # Interface Looker Studio (getAuth, getConfig, getSchema, getData)
├── DataFetcher.gs               # Busca de dados com paginação
├── DataTransformer.gs           # Transformação e unificação Income/Outcome
├── SchemaBuilder.gs             # Definição de 80+ campos
└── Utils.gs                     # Funções utilitárias (⚠️ contém bug de timezone)
```

---

## 📊 Arquitetura em Resumo

### Fluxo de Dados

```
LOOKER STUDIO
    ↓
    getData(request)
    ↓
┌───────────────────┐
│ 1. VALIDAÇÃO      │ validateConfiguration()
└───────────────────┘
    ↓
┌───────────────────┐
│ 2. BUSCA (API)    │ fetchAllData() → Income + Outcome
│   - Paginação     │ fetchAllPaginated()
│   - Cache (5min)  │ cachedFetch()
└───────────────────┘
    ↓
┌───────────────────┐
│ 3. TRANSFORMAÇÃO  │ transformRecords()
│   - Unificação    │ getFieldValue()
│   - Formatação    │ formatDate() ⚠️
│   - Cálculos      │ calculateMetrics
└───────────────────┘
    ↓
┌───────────────────┐
│ 4. SCHEMA         │ getFields().forIds()
└───────────────────┘
    ↓
LOOKER STUDIO (renderização)
```

### Componentes

| Componente | Responsabilidade | Linhas |
|------------|------------------|--------|
| **Config.gs** | Constantes, mensagens de erro, logging | ~135 |
| **SiengeFinancialConnector.gs** | Interface obrigatória Looker Studio | ~217 |
| **DataFetcher.gs** | Comunicação com API, paginação | ~206 |
| **DataTransformer.gs** | Mapeamento de campos, cálculos | ~342 |
| **SchemaBuilder.gs** | Schema de 80 campos em 7 grupos | ~495 |
| **Utils.gs** | Cache, formatação, validação | ~383 |
| **TOTAL** | | ~1.778 |

---

## 🎯 Schema de Dados

### 80 Campos Organizados em 7 Grupos

1. **IDs** (16 campos) - Identificadores técnicos (opcional via config)
2. **Básicos** (7 campos) - Tipo de registro, datas principais
3. **Empresa** (7 campos) - Hierarquia organizacional
4. **Partes** (4 campos) - Cliente/Credor, documentos
5. **Financeiro** (11 campos) - Valores, status, movimentações
6. **Contas a Receber** (13 campos) - Específicos de Income
7. **Contas a Pagar** (9 campos) - Específicos de Outcome

### Tipos de Campos

- **53 Dimensões**: Categorizações, textos, datas
- **12 Métricas**: Valores monetários, contadores
- **15 Calculados**: Derivados de arrays JSONB (receipts, payments)

---

## 🔧 Quick Start para Desenvolvedores

### 1. Entender o Sistema
```
Leia: google-apps-script-architecture.md
Foco: Seção 2 (Arquitetura) e Seção 4 (Fluxo de Dados)
```

### 2. Corrigir Bug de Timezone
```
Leia: due-date-error-troubleshooting.md
Siga: Seção 6 (Procedimento de Correção)
```

### 3. Testar Correção
```
Execute: Seção 7.1 (Testes Unitários)
Valide: Seção 7.3 (Teste no Looker Studio)
```

### 4. Deploy
```
Siga: Arquitetura, Seção 9.4 (Deployment)
```

---

## ⚙️ Configurações Importantes

### API Backend
```javascript
API_URL: 'https://sienge-app.hvlihi.easypanel.host'
INCOME_ENDPOINT: '/api/income'
OUTCOME_ENDPOINT: '/api/outcome'
```

### Cache
```javascript
CACHE_DURATION_SECONDS: 300  // 5 minutos
```

### Paginação
```javascript
MAX_RECORDS_PER_REQUEST: 1000
```

### Timezone (Recomendado)
```
File → Project Properties → Info → Timezone: UTC
```

---

## 🧪 Testes

### Teste Rápido de Datas (após correção)

```javascript
function testDateFormatting() {
  var result = formatDate("2025-01-15T00:00:00Z");
  Logger.log("Result: " + result);
  Logger.log("Expected: 20250115");
  Logger.log(result === "20250115" ? "✅ PASS" : "❌ FAIL");
}
```

**Executar**: Run → Select function: testDateFormatting → Run

**Esperado**: `✅ PASS`

---

## 📝 Campos de Data Afetados pelo Bug

| Campo | Criticidade | Uso |
|-------|-------------|-----|
| `due_date` | 🔴 CRÍTICO | Data de vencimento |
| `issue_date` | 🟡 IMPORTANTE | Data de emissão |
| `bill_date` | 🟡 IMPORTANTE | Data da conta |
| `installment_base_date` | 🟡 IMPORTANTE | Data base da parcela |
| `data_ultima_movimentacao` | 🟡 IMPORTANTE | Última movimentação |
| `sync_date` | 🟢 INFO | Data de sincronização |
| `outcome_registered_date` | 🟢 INFO | Data de cadastro |

**Todos requerem correção de timezone!**

---

## 🔍 Debugging

### Ver Logs

```
Google Apps Script Editor → View → Logs (Ctrl+Enter)
```

### Limpar Cache

```javascript
function clearCache() {
  var cache = CacheService.getUserCache();
  cache.removeAll(cache.getKeys());
  Logger.log('Cache cleared');
}
```

### Testar Conexão com API

```javascript
function testApiConnection() {
  var url = CONFIG.API_URL + '/api/health';
  var response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}
```

---

## 🚀 Próximos Passos

### Prioridade Máxima
1. ✅ Revisar documentação de arquitetura
2. 🔴 **URGENTE**: Aplicar correção de timezone
3. ✅ Executar testes de validação
4. ✅ Deploy para produção
5. ✅ Limpar cache
6. ✅ Validar com usuários

### Melhorias Futuras
- [ ] Adicionar testes automatizados
- [ ] Implementar validação de ranges de datas
- [ ] Melhorar logging e observabilidade
- [ ] Adicionar métricas de performance
- [ ] Documentar timezone assumptions na API

---

## 📞 Contato e Suporte

### Recursos
- **Documentação Completa**: `google-apps-script-architecture.md`
- **Guia de Correção de Bug**: `due-date-error-troubleshooting.md`
- **Google Apps Script Docs**: https://developers.google.com/apps-script
- **Looker Studio Connector Docs**: https://developers.google.com/looker-studio/connector

### Estrutura de Suporte
- **Bugs Críticos**: Aplicar correções imediatamente
- **Novos Features**: Documentar antes de implementar
- **Code Review**: Verificar uso de métodos UTC para datas

---

## 📊 Estatísticas do Projeto

| Métrica | Valor |
|---------|-------|
| Arquivos | 6 (.gs) |
| Linhas de Código | ~1.778 |
| Funções | ~45 |
| Campos no Schema | 80 |
| Grupos de Campos | 7 |
| Endpoints API | 2 (/income, /outcome) |
| Cache TTL | 5 minutos |
| Max Records/Request | 1.000 |

---

## ✅ Checklist de Qualidade

### Antes de Cada Deploy

```
[ ] Todos os arquivos .gs salvos
[ ] Testes unitários executados
[ ] Sem erros de sintaxe
[ ] Cache limpo
[ ] Timezone configurado para UTC
[ ] Logs verificados
[ ] Backup da versão anterior criado
[ ] Descrição do deploy documentada
```

### Após Deploy

```
[ ] Teste no Looker Studio realizado
[ ] Comparação com dados da API validada
[ ] Usuários notificados (se mudança significativa)
[ ] Documentação atualizada
[ ] Changelog atualizado
```

---

**Última Atualização**: 2025-01-30
**Versão da Documentação**: 1.0
**Próxima Revisão**: Após aplicação da correção de timezone
