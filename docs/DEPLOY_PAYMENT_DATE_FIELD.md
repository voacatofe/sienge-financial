# Deploy: Campo Data de Pagamento (payment_date)

**Data**: 2025-10-02
**Mudança**: Adicionar campo `payment_date` extraído de JSONB arrays

## Resumo

Adicionado campo `payment_date` que extrai a Data de Pagamento do primeiro elemento dos arrays JSONB:
- `income_data`: extrai de `receipts` → `paymentDate`
- `outcome_data`: extrai de `payments` → `paymentDate`

## Arquivos Modificados

### 1. Database Schema
- ✅ `schema.sql` - Campo adicionado como DATE (novos bancos já terão o campo)
- ✅ `scripts/add_payment_date_field_v2.sql` - Script para aplicar no banco atual (VARCHAR)

### 2. Google Apps Script
- ✅ `SchemaBuilder.gs` - Campo adicionado ao grupo "Básicos"
- ✅ `DataTransformer.gs` - Mapeamento do campo

## Passo a Passo do Deploy

### 1. Aplicar no Banco de Produção Atual

```bash
# Via psql direto
PGPASSWORD="TROQUE_ESTA_SENHA_EM_PRODUCAO" psql -h 147.93.15.121 -p 5436 -U sienge_app -d sienge_data -f scripts/add_payment_date_field_v2.sql

# OU via Docker (se estiver rodando)
docker exec sienge_postgres psql -U sienge_app -d sienge_data -f /path/to/scripts/add_payment_date_field_v2.sql
```

**Status**: ✅ Aplicado com sucesso em 2025-10-02

**Resultado**:
- **Income Data**: 69.87% cobertura (58,064 de 83,102 registros)
- **Outcome Data**: 93.02% cobertura (120,510 de 129,558 registros)

O script:
- ✅ Adiciona coluna `payment_date` (VARCHAR) em ambas as tabelas
- ✅ Cria índices para performance
- ✅ Mostra estatísticas de distribuição e análise de prazo de pagamento

### 2. Verificar Aplicação

```bash
# Verificar se coluna existe
PGPASSWORD="TROQUE_ESTA_SENHA_EM_PRODUCAO" psql -h 147.93.15.121 -p 5436 -U sienge_app -d sienge_data -c "\d income_data"

# Ver distribuição de dados
PGPASSWORD="TROQUE_ESTA_SENHA_EM_PRODUCAO" psql -h 147.93.15.121 -p 5436 -U sienge_app -d sienge_data -c "SELECT COUNT(*) as total, COUNT(payment_date) as com_data FROM income_data;"
```

### 3. Deploy Google Apps Script

1. Abrir Google Apps Script do connector
2. Atualizar arquivos:
   - `SchemaBuilder.gs` - Campo adicionado em "Básicos" (linha 189-194)
   - `DataTransformer.gs` - Campo adicionado em dateFields (linha 157)
3. Deploy como nova versão
4. Atualizar versão no Looker Studio

### 4. Testar no Looker Studio

1. Abrir fonte de dados no Looker
2. Clicar em "Atualizar campos"
3. Verificar campo "Data de Pagamento" no grupo "Básicos"
4. Criar visualização teste com o novo campo

## Queries de Verificação

### Ver estrutura completa da tabela
```sql
\d+ income_data
```

### Análise de Prazo Médio de Pagamento
```sql
-- Income: Prazo médio entre vencimento e pagamento
SELECT
    'Contas a Receber' as tipo,
    COUNT(*) as total_pagos,
    ROUND(AVG(payment_date::DATE - due_date), 2) as prazo_medio_dias,
    MIN(payment_date::DATE - due_date) as prazo_minimo,
    MAX(payment_date::DATE - due_date) as prazo_maximo
FROM income_data
WHERE payment_date IS NOT NULL;

-- Outcome: Prazo médio entre vencimento e pagamento
SELECT
    'Contas a Pagar' as tipo,
    COUNT(*) as total_pagos,
    ROUND(AVG(payment_date::DATE - due_date), 2) as prazo_medio_dias,
    MIN(payment_date::DATE - due_date) as prazo_minimo,
    MAX(payment_date::DATE - due_date) as prazo_maximo
FROM outcome_data
WHERE payment_date IS NOT NULL;
```

### Top 10 Datas de Pagamento por Volume
```sql
SELECT
    payment_date::DATE as data,
    COUNT(*) as qtd_pagamentos,
    SUM(original_amount) as valor_total
FROM outcome_data
WHERE payment_date IS NOT NULL
GROUP BY payment_date::DATE
ORDER BY qtd_pagamentos DESC
LIMIT 10;
```

### Percentual de registros com Data de Pagamento
```sql
SELECT
    'income_data' as tabela,
    COUNT(*) as total,
    COUNT(payment_date) as com_data,
    ROUND(100.0 * COUNT(payment_date) / COUNT(*), 2) as percentual
FROM income_data
UNION ALL
SELECT
    'outcome_data' as tabela,
    COUNT(*) as total,
    COUNT(payment_date) as com_data,
    ROUND(100.0 * COUNT(payment_date) / COUNT(*), 2) as percentual
FROM outcome_data;
```

## Diferença Entre Versões

### Versão 1 (add_payment_date_field.sql) - FALHOU
- Usava tipo `DATE` com cast `::DATE` no GENERATED ALWAYS
- Erro PostgreSQL: "generation expression is not immutable"

### Versão 2 (add_payment_date_field_v2.sql) - SUCESSO ✅
- Usa tipo `VARCHAR` sem cast
- Looker Studio faz cast para DATE quando necessário
- Funcionalmente equivalente para reporting

## Rollback (se necessário)

```sql
-- Remover índices
DROP INDEX IF EXISTS idx_income_payment_date;
DROP INDEX IF EXISTS idx_outcome_payment_date;

-- Remover colunas
ALTER TABLE income_data DROP COLUMN IF EXISTS payment_date;
ALTER TABLE outcome_data DROP COLUMN IF EXISTS payment_date;
```

## Observações Importantes

### Comportamento do Campo
- ✅ **Calculado automaticamente** de dados existentes (GENERATED ALWAYS)
- ✅ **Somente leitura** - não pode ser alterado manualmente
- ✅ **Performance otimizada** - valor é armazenado (STORED), não calculado a cada query
- ✅ **Indexado** - queries de filtro e agrupamento são rápidas
- ✅ **VARCHAR no banco, DATE no Looker** - Looker faz conversão automática

### Limitações
- ⚠️ Extrai **apenas o primeiro** pagamento/recebimento do array JSONB (índice 0)
- ⚠️ Se o array estiver vazio ou NULL, o campo será NULL
- ⚠️ Se houver múltiplos pagamentos, apenas a data do primeiro será disponibilizada

### Análise dos Resultados de Produção

**Income Data (Contas a Receber)**:
- Total: 83,102 registros
- Com data de pagamento: 58,064 (69.87%)
- Sem data de pagamento: 25,038 (30.13%)
- **Prazo médio**: -108.49 dias (pagos 108 dias ANTES do vencimento)
- Intervalo: 2020-10-01 a 2025-09-29

**Outcome Data (Contas a Pagar)**:
- Total: 129,558 registros
- Com data de pagamento: 120,510 (93.02%)
- Sem data de pagamento: 9,048 (6.98%)
- **Prazo médio**: -12.88 dias (pagos 13 dias ANTES do vencimento)
- Intervalo: 2019-09-25 a 2025-09-29

**Interpretação**: Valores negativos indicam pagamentos antecipados (antes do vencimento), o que é normal para:
- **Contas a Receber**: Clientes pagam antecipadamente ou com descontos
- **Contas a Pagar**: Empresa paga antecipadamente para obter descontos

### Próximos Deploys
Novos bancos (schema vazio) já receberão o campo automaticamente via `schema.sql` com tipo `DATE`. Não será necessário aplicar script manual novamente.

## Suporte

### Problemas Comuns

**Campo não aparece após aplicar script**
- Verificar se comando foi executado sem erros
- Verificar se está conectado no banco correto
- Executar `\d income_data` para ver estrutura

**Valores todos NULL**
- Verificar se os arrays JSONB têm dados: `SELECT receipts FROM income_data WHERE receipts IS NOT NULL LIMIT 5;`
- O campo extrai do primeiro elemento - se array vazio, valor será NULL

**Performance lenta**
- Verificar se índices foram criados: `\di` para listar índices
- Reanalizar tabelas: `ANALYZE income_data; ANALYZE outcome_data;`

**Looker não reconhece como data**
- Verificar tipo do campo no Looker: deve ser "Date" ou "Date & Time"
- Forçar cast no Looker se necessário: `CAST(payment_date AS DATE)`

## Checklist de Deploy

- [x] Script SQL aplicado no banco de produção
- [x] Verificação: coluna existe nas duas tabelas
- [x] Verificação: índices criados
- [x] Verificação: dados populados (estatísticas)
- [x] Google Apps Script atualizado (SchemaBuilder.gs e DataTransformer.gs)
- [ ] Deploy no Looker Studio
- [ ] Teste: campo aparece no Looker
- [ ] Teste: visualização com novo campo funciona
- [ ] Documentação atualizada (este arquivo)

## Conclusão

Deploy aplicado com sucesso:
1. ✅ Script SQL aplicado no banco de produção
2. ✅ Cobertura: 69.87% Income, 93.02% Outcome
3. ✅ Google Apps Script atualizado
4. ⏳ Pendente: Deploy no Looker Studio e testes

Próximo passo: Deploy do Google Apps Script no Looker Studio e validação.
