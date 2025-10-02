# Deploy: Campo Centro de Custo (cost_center_name)

**Data**: 2025-10-02
**Mudança**: Adicionar campo `cost_center_name` extraído de JSONB arrays

## Resumo

Adicionado campo `cost_center_name` que extrai o Centro de Custo do primeiro elemento dos arrays JSONB:
- `income_data`: extrai de `receipts_categories`
- `outcome_data`: extrai de `payments_categories`

## Arquivos Modificados

### 1. Database Schema
- ✅ `schema.sql` - Campo adicionado (novos bancos já terão o campo)
- ✅ `scripts/add_cost_center_field.sql` - Script para aplicar no banco atual

### 2. Google Apps Script
- ✅ `SchemaBuilder.gs` - Campo adicionado ao grupo "Empresa"
- ✅ `DataTransformer.gs` - Mapeamento do campo

## Passo a Passo do Deploy

### 1. Aplicar no Banco de Produção Atual

```bash
# Via psql direto
PGPASSWORD="TROQUE_ESTA_SENHA_EM_PRODUCAO" psql -h 147.93.15.121 -p 5436 -U sienge_app -d sienge_data -f scripts/add_cost_center_field.sql

# OU via Docker (se estiver rodando)
docker exec sienge_postgres psql -U sienge_app -d sienge_data -f /path/to/scripts/add_cost_center_field.sql
```

O script vai:
- ✅ Adicionar coluna `cost_center_name` em ambas as tabelas
- ✅ Criar índices para performance
- ✅ Mostrar estatísticas de distribuição

### 2. Verificar Aplicação

```bash
# Verificar se coluna existe
PGPASSWORD="TROQUE_ESTA_SENHA_EM_PRODUCAO" psql -h 147.93.15.121 -p 5436 -U sienge_app -d sienge_data -c "\d income_data"

# Ver distribuição de dados
PGPASSWORD="TROQUE_ESTA_SENHA_EM_PRODUCAO" psql -h 147.93.15.121 -p 5436 -U sienge_app -d sienge_data -c "SELECT COUNT(*) as total, COUNT(cost_center_name) as com_centro FROM income_data;"
```

### 3. Deploy Google Apps Script

1. Abrir Google Apps Script do connector
2. Atualizar arquivos:
   - `SchemaBuilder.gs`
   - `DataTransformer.gs`
3. Deploy como nova versão
4. Atualizar versão no Looker Studio

### 4. Testar no Looker Studio

1. Abrir fonte de dados no Looker
2. Clicar em "Atualizar campos"
3. Verificar campo "Centro de Custo" no grupo "Empresa"
4. Criar visualização teste com o novo campo

## Queries de Verificação

### Ver estrutura completa da tabela
```sql
\d+ income_data
```

### Top 10 Centros de Custo por volume
```sql
SELECT
    cost_center_name,
    COUNT(*) as qtd_registros,
    SUM(original_amount) as total_valor
FROM income_data
WHERE cost_center_name IS NOT NULL
GROUP BY cost_center_name
ORDER BY qtd_registros DESC
LIMIT 10;
```

### Percentual de registros com Centro de Custo
```sql
SELECT
    COUNT(*) as total,
    COUNT(cost_center_name) as com_centro,
    ROUND(100.0 * COUNT(cost_center_name) / COUNT(*), 2) as percentual
FROM income_data;
```

## Rollback (se necessário)

```sql
-- Remover índices
DROP INDEX IF EXISTS idx_income_cost_center;
DROP INDEX IF EXISTS idx_outcome_cost_center;

-- Remover colunas
ALTER TABLE income_data DROP COLUMN IF EXISTS cost_center_name;
ALTER TABLE outcome_data DROP COLUMN IF EXISTS cost_center_name;
```

## Observações Importantes

### Comportamento do Campo
- ✅ **Calculado automaticamente** de dados existentes (GENERATED ALWAYS)
- ✅ **Somente leitura** - não pode ser alterado manualmente
- ✅ **Performance otimizada** - valor é armazenado (STORED), não calculado a cada query
- ✅ **Indexado** - queries de filtro e agrupamento são rápidas

### Limitações
- ⚠️ Extrai **apenas o primeiro** Centro de Custo do array JSONB (índice 0)
- ⚠️ Se o array estiver vazio ou NULL, o campo será NULL
- ⚠️ Se houver múltiplos Centros de Custo, apenas o primeiro será disponibilizado

### Próximos Deploys
Novos bancos (volume vazio) já receberão o campo automaticamente via `schema.sql`. Não será necessário aplicar script manual novamente.

## Suporte

### Problemas Comuns

**Campo não aparece após aplicar script**
- Verificar se comando foi executado sem erros
- Verificar se está conectado no banco correto
- Executar `\d income_data` para ver estrutura

**Valores todos NULL**
- Verificar se os arrays JSONB têm dados: `SELECT receipts_categories FROM income_data LIMIT 5;`
- O campo extrai do primeiro elemento - se array vazio, valor será NULL

**Performance lenta**
- Verificar se índices foram criados: `\di` para listar índices
- Reanalizar tabelas: `ANALYZE income_data; ANALYZE outcome_data;`

## Checklist de Deploy

- [ ] Script SQL aplicado no banco de produção
- [ ] Verificação: coluna existe nas duas tabelas
- [ ] Verificação: índices criados
- [ ] Verificação: dados populados (estatísticas)
- [ ] Google Apps Script atualizado
- [ ] Deploy no Looker Studio
- [ ] Teste: campo aparece no Looker
- [ ] Teste: visualização com novo campo funciona
- [ ] Documentação atualizada (este arquivo)

## Conclusão

Deploy simples e direto:
1. ✅ Aplicar script SQL no banco atual
2. ✅ Deploy Google Apps Script
3. ✅ Testar no Looker Studio
4. ✅ Pronto!

Novos bancos já terão o campo automaticamente via `schema.sql`.
