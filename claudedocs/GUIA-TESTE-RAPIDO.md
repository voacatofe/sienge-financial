# Guia de Teste Rápido - Sienge Financial Connector

## ✅ Teste 1: Verificar Apps Script (2 minutos)

### No Editor Apps Script

1. Abra o Apps Script Editor
2. Execute a função: `runAllTests()`
3. Verifique os logs (View → Logs ou Ctrl+Enter)

**Resultado Esperado**:
```
Test 1: SUCCESS: 2082 records
Test 2: SUCCESS: Validation OK
Test 3: SUCCESS: 2082 income records
Test 4: SUCCESS: 5151 rows transformed
Test 5: SUCCESS: 79 fields in schema
```

⚠️ **Avisos de Cache são NORMAIS** (responses muito grandes para cache)

---

## ✅ Teste 2: Verificar API (1 minuto)

### Teste Direto da API

Abra no navegador:

**Health Check**:
```
https://sienge-app.hvlihi.easypanel.host/api/health
```

Esperado: `{"status": "healthy", "database": "connected"}`

**Income Count**:
```
https://sienge-app.hvlihi.easypanel.host/api/income?limit=1
```

Esperado: Ver `"total": 2082` e um registro

**Outcome Count**:
```
https://sienge-app.hvlihi.easypanel.host/api/outcome?limit=1
```

Esperado: Ver `"total": 3069` e um registro

---

## ✅ Teste 3: Verificar Looker Studio (5 minutos)

### Passo 1: Atualizar Campos

1. Abra Looker Studio: https://datastudio.google.com
2. Vá para: **Recursos → Gerenciar fontes de dados adicionadas**
3. Encontre: **Sienge Financial Connector**
4. Clique em: **Editar**
5. Clique em: **Atualizar campos** (ícone de refresh)

### Passo 2: Criar Relatório de Teste

1. Clique em: **Criar relatório**
2. Escolha a fonte: **Sienge Financial Connector**
3. Configure os checkboxes:
   - ☑️ Incluir Contas a Receber
   - ☑️ Incluir Contas a Pagar

### Passo 3: Adicionar Tabela Simples

1. Adicione uma **Tabela** (menu: Inserir → Tabela)
2. Configure as dimensões:
   - **Tipo de Registro** (record_type)
   - **Nome da Empresa** (company_name)
   - **Nome da Contraparte** (contraparte_nome)
   - **Data de Vencimento** (due_date)

3. Configure a métrica:
   - **Valor Original** (original_amount)

### Resultado Esperado:

✅ **Tabela mostra dados imediatamente**
✅ **~5.151 linhas no total** (pode variar conforme filtros)
✅ **2 tipos de registro**: "Contas a Receber" e "Contas a Pagar"
✅ **Valores em R$** formatados corretamente
✅ **Sem erros de schema**

### Exemplo de Dados:

| Tipo de Registro | Empresa | Contraparte | Data Vencimento | Valor Original |
|-----------------|---------|-------------|-----------------|----------------|
| Contas a Receber | Empresa A | Cliente X | 2024-10-15 | R$ 5.000,00 |
| Contas a Pagar | Empresa B | Fornecedor Y | 2024-11-01 | R$ 3.200,00 |

---

## ✅ Teste 4: Verificar Grupos de Campos (2 minutos)

No painel lateral do Looker Studio (aba "Dados disponíveis"), você deve ver os campos organizados em 10 grupos:

```
📁 GRUPO 1: IDENTIFICAÇÃO
  └─ Tipo de Registro, ID do Registro, Data de Sincronização...

📁 GRUPO 2: EMPRESA E ORGANIZAÇÃO
  └─ Empresa, Área de Negócio, Projeto, Grupo Empresarial...

📁 GRUPO 3: CONTRAPARTE UNIFICADA
  └─ Tipo de Contraparte, ID da Contraparte, Nome da Contraparte

📁 GRUPO 4: DOCUMENTO
  └─ Tipo de Documento, Número do Documento...

📁 GRUPO 5: MÉTRICAS FINANCEIRAS
  └─ Valor Original, Saldo Devedor, Valor do Desconto...

📁 GRUPO 6: DATAS
  └─ Data de Vencimento, Data de Emissão, Data da Conta...

📁 GRUPO 7: INDEXAÇÃO
  └─ ID do Indexador, Indexador

📁 GRUPO 8: MOVIMENTAÇÕES FINANCEIRAS
  └─ Total de Movimentações, Valor Total Movimentado...

📁 GRUPO 9: CAMPOS ESPECÍFICOS DE INCOME
  └─ [Income] Periodicidade, [Income] Juros Embutidos...

📁 GRUPO 10: CAMPOS ESPECÍFICOS DE OUTCOME
  └─ [Outcome] Documento de Previsão, [Outcome] Status...
```

---

## ✅ Teste 5: Testar Filtros (3 minutos)

### Teste de Filtro: Apenas Contas a Receber

1. Edite a fonte de dados
2. Desmarque: ☐ Incluir Contas a Pagar
3. Mantenha: ☑️ Incluir Contas a Receber
4. Volte ao relatório

**Resultado Esperado**: ~2.082 registros (apenas Income)

### Teste de Filtro: Apenas Contas a Pagar

1. Edite a fonte de dados
2. Desmarque: ☐ Incluir Contas a Receber
3. Marque: ☑️ Incluir Contas a Pagar
4. Volte ao relatório

**Resultado Esperado**: ~3.069 registros (apenas Outcome)

### Teste de Filtro: Ambos

1. Edite a fonte de dados
2. Marque: ☑️ Incluir Contas a Receber
3. Marque: ☑️ Incluir Contas a Pagar
4. Volte ao relatório

**Resultado Esperado**: ~5.151 registros (Income + Outcome)

---

## 🎨 Teste 6: Criar Visualizações (Opcional)

### Gráfico de Pizza: Distribuição por Tipo

1. Adicione: **Gráfico de pizza**
2. Dimensão: **Tipo de Registro**
3. Métrica: **Valor Original** (Soma)

**Resultado**: Proporção de valores entre Contas a Receber e Contas a Pagar

### Gráfico de Linha: Evolução Temporal

1. Adicione: **Gráfico de série temporal**
2. Dimensão: **Data de Vencimento**
3. Métrica: **Valor Original** (Soma)
4. Detalhamento: **Tipo de Registro**

**Resultado**: Linha do tempo mostrando valores a receber vs a pagar

### Tabela Dinâmica: Por Empresa

1. Adicione: **Tabela dinâmica**
2. Dimensão de linha: **Nome da Empresa**
3. Dimensão de coluna: **Tipo de Registro**
4. Métrica: **Valor Original** (Soma)

**Resultado**: Matriz mostrando valores por empresa e tipo

---

## ❌ Problemas Comuns e Soluções

### Problema: "Nenhum dado retornado"

**Possíveis causas**:
1. ❌ API está offline
   - **Solução**: Verificar https://sienge-app.hvlihi.easypanel.host/api/health

2. ❌ Ambos os checkboxes desmarcados
   - **Solução**: Marcar pelo menos um checkbox (Income ou Outcome)

3. ❌ Cache antigo no Apps Script
   - **Solução**: Executar função `clearCache()` no Apps Script

### Problema: "Erro de schema"

**Possíveis causas**:
1. ❌ Versão antiga do connector
   - **Solução**: Atualizar campos no Looker Studio (botão refresh)

2. ❌ Apps Script não atualizado
   - **Solução**: Verificar se último commit foi deployed

### Problema: Dados aparecem mas estão incorretos

**Possíveis causas**:
1. ❌ Sincronização desatualizada
   - **Solução**: Aguardar próxima sync (diária às 2h) ou executar manualmente

2. ❌ Filtros ativos no Looker Studio
   - **Solução**: Remover todos os filtros do relatório

---

## 📊 Métricas de Sucesso

✅ **Apps Script Tests**: 5/5 passando
✅ **API Health**: Status "healthy"
✅ **Total de Registros**: 5.151 (2.082 Income + 3.069 Outcome)
✅ **Campos no Schema**: 79 campos em 10 grupos
✅ **Visualização Looker**: Dados aparecem imediatamente
✅ **Performance**: Resposta < 5 segundos
✅ **Cache Warnings**: Normal (não impacta funcionamento)

---

## 🚀 Comandos Úteis

### Limpar Cache (se necessário)

No Apps Script Editor:
```javascript
clearCache()
```

### Testar Conexão API

No Apps Script Editor:
```javascript
testApiConnection()
```

### Executar Todos os Testes

No Apps Script Editor:
```javascript
runAllTests()
```

### Verificar Logs

No Apps Script Editor:
1. View → Logs
2. Ou: Ctrl+Enter após executar função

---

## 📞 Checklist Pré-Demo

Antes de apresentar para cliente:

- [ ] API health check passou
- [ ] runAllTests() passou (5/5)
- [ ] Relatório teste criado com sucesso
- [ ] Dados aparecem imediatamente
- [ ] Filtros funcionam (Income/Outcome)
- [ ] Grupos de campos organizados corretamente
- [ ] Valores em R$ formatados
- [ ] Performance aceitável (< 5s)
- [ ] Sem erros no console do Looker Studio
- [ ] Documentação pronta (este guia)

---

**Última Atualização**: 2025-09-29
**Versão**: 1.0 - Pós correção de schema
**Autor**: Claude Code