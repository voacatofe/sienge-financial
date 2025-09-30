# Database Migrations

Instruções para aplicar migrações no banco de produção.

## Migration: add_status_parcela.sql

**Data:** 2025-09-30
**Objetivo:** Adicionar coluna calculada `status_parcela` às tabelas `income_data` e `outcome_data`

### Pré-requisitos
- Acesso ao banco de produção
- Permissões para ALTER TABLE
- Backup recente do banco (recomendado)

### Passos para Aplicar

#### 1. Conectar ao Banco de Produção
```bash
psql postgresql://sienge_user:senha@host:port/database
```

#### 2. Verificar Estrutura Atual (Opcional)
```sql
\d income_data
\d outcome_data
```

#### 3. Aplicar a Migration
```bash
psql postgresql://sienge_user:senha@host:port/database -f migrations/add_status_parcela.sql
```

**OU** manualmente dentro do psql:
```sql
\i migrations/add_status_parcela.sql
```

#### 4. Verificar Resultados
A migration já inclui queries de verificação que mostram:
- Distribuição de registros por status
- Total de saldo por status

Você deve ver algo como:
```
 status_parcela  | total | total_balance
-----------------+-------+---------------
 A Receber       |  1234 |   450000.00
 Vencida         |   456 |    75000.00
 Recebida        |   789 |         0.00
```

### Rollback (se necessário)
Se algo der errado, você pode remover a coluna:

```sql
ALTER TABLE income_data DROP COLUMN status_parcela;
ALTER TABLE outcome_data DROP COLUMN status_parcela;
```

### Impacto
- ✅ **Zero downtime** - Não afeta operações em andamento
- ✅ **Não requer reprocessamento** - Coluna é calculada automaticamente
- ✅ **Compatível com dados existentes** - Funciona com todos os registros atuais
- ✅ **Performance** - Valor é armazenado (STORED), não calculado a cada query

### Após a Migration

1. **Atualizar Google Apps Script do Looker Studio:**
   - Deploy da nova versão com `status_parcela` no SchemaBuilder.gs
   - Deploy da nova versão do DataTransformer.gs

2. **Testar no Looker Studio:**
   - Atualizar campos da fonte de dados
   - Verificar que "Status da Parcela" aparece no grupo "Financeiro"
   - Criar gráficos/tabelas usando o novo campo

3. **Monitorar:**
   - Verificar performance das queries
   - Confirmar que valores estão corretos
   - Validar relatórios existentes continuam funcionando

### Notas Importantes

⚠️ **GENERATED COLUMN é somente leitura** - Não pode ser atualizada manualmente
⚠️ **STORED** - Valor é armazenado fisicamente (usa espaço em disco)
✅ **Auto-atualiza** - Sempre que balance_amount, due_date ou authorization_status mudam

### Troubleshooting

**Erro: "column already exists"**
```sql
-- Verificar se já existe
SELECT column_name
FROM information_schema.columns
WHERE table_name IN ('income_data', 'outcome_data')
  AND column_name = 'status_parcela';
```

**Erro de permissão**
```sql
-- Verificar permissões
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('income_data', 'outcome_data');
```

**Performance lenta após migration**
```sql
-- Reanalizar tabelas (opcional, mas recomendado)
ANALYZE income_data;
ANALYZE outcome_data;
```