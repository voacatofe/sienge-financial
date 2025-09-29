# Sienge Financial Connector - Google Apps Script

Conector Community Connector para Looker Studio que unifica dados financeiros de **Contas a Receber** e **Contas a Pagar** do Sienge em uma única fonte de dados.

## 📋 Visão Geral

Este conector permite conectar o Looker Studio diretamente à API REST do Sienge Financial, trazendo dados unificados de:
- **Contas a Receber** (Income)
- **Contas a Pagar** (Outcome)

### Principais Características

✅ **Conector Unificado**: Um único conector para ambos os tipos de dados
✅ **79 Campos Organizados**: Divididos em 10 grupos lógicos
✅ **Campos Comuns Mesclados**: Simplifica análise comparativa
✅ **Campos Específicos Separados**: Mantém informações exclusivas de cada tipo
✅ **Métricas Calculadas**: Totais de movimentações, saldos, status de pagamento
✅ **Cache Inteligente**: 5 minutos para otimizar performance
✅ **Paginação Automática**: Busca todos os dados independente do volume
✅ **Nomenclatura em Português**: Todos os campos traduzidos

## 🏗️ Arquitetura

### Arquivos do Projeto

```
google-apps-script/
├── SiengeFinancialConnector.gs  # Entry point principal
├── Config.gs                     # Constantes e configurações
├── Utils.gs                      # Funções utilitárias
├── SchemaBuilder.gs              # Definição dos 79 campos
├── DataFetcher.gs                # Busca dados das APIs
├── DataTransformer.gs            # Unifica Income + Outcome
├── appsscript.json               # Manifesto do Apps Script
└── README.md                     # Esta documentação
```

### Fluxo de Dados

```
Looker Studio
    ↓
SiengeFinancialConnector.getData()
    ↓
DataFetcher.fetchAllData()
    ├─→ /api/income (paginado)
    └─→ /api/outcome (paginado)
    ↓
DataTransformer.transformRecords()
    ├─→ Mescla campos comuns
    ├─→ Separa campos específicos
    └─→ Calcula métricas
    ↓
Looker Studio (dados unificados)
```

## 📦 Estrutura de Dados Unificada

### 10 Grupos de Campos

#### 1️⃣ Identificação (5 campos)
- `record_type`: Tipo de Registro (Contas a Receber / Contas a Pagar)
- `id`: ID do Registro
- `sync_date`: Data de Sincronização
- `installment_id`: ID da Parcela
- `bill_id`: ID da Conta

#### 2️⃣ Empresa (14 campos)
- `company_id`, `company_name`: Empresa
- `business_area_id`, `business_area_name`: Área de Negócio
- `project_id`, `project_name`: Projeto
- `group_company_id`, `group_company_name`: Grupo Empresarial
- `holding_id`, `holding_name`: Holding
- `subsidiary_id`, `subsidiary_name`: Filial
- `business_type_id`, `business_type_name`: Tipo de Negócio

#### 3️⃣ Contraparte Unificada (3 campos)
**Conceito-chave**: Mescla Cliente (Income) e Fornecedor/Credor (Outcome)
- `contraparte_tipo`: Cliente ou Fornecedor
- `contraparte_id`: ID da Contraparte
- `contraparte_nome`: Nome da Contraparte

#### 4️⃣ Documento (5 campos)
- `document_identification_id`: ID do Tipo de Documento
- `document_identification_name`: Tipo de Documento
- `document_number`: Número do Documento
- `document_forecast`: Documento de Previsão (S/N)
- `origin_id`: ID da Origem

#### 5️⃣ Valores Financeiros (6 campos - MÉTRICAS)
- `original_amount`: Valor Original (R$)
- `discount_amount`: Valor do Desconto (R$)
- `tax_amount`: Valor do Imposto (R$)
- `balance_amount`: Saldo Devedor (R$)
- `corrected_balance_amount`: Saldo Corrigido (R$)

#### 6️⃣ Datas (4 campos)
- `due_date`: Data de Vencimento
- `issue_date`: Data de Emissão
- `bill_date`: Data da Conta
- `installment_base_date`: Data Base da Parcela

#### 7️⃣ Indexação (2 campos)
- `indexer_id`: ID do Indexador
- `indexer_name`: Indexador (INCC-M, IGPM, etc)

#### 8️⃣ Movimentações Financeiras (4 campos CALCULADOS)
**Processados dos arrays JSONB `receipts` e `payments`**
- `total_movimentacoes`: Total de Movimentações (quantidade)
- `valor_total_movimentado`: Valor Total Movimentado (R$)
- `data_ultima_movimentacao`: Data da Última Movimentação
- `situacao_pagamento`: Situação de Pagamento (Pago/Parcial/Pendente)

#### 9️⃣ Campos Específicos de INCOME (13 campos)
Prefixados com `income_*`:
- Periodicidade, Juros Embutidos, Tipo de Juros, Taxa de Juros
- Tipo de Correção, Data Base dos Juros
- Situação de Inadimplência, Sub-Júdice
- Unidade Principal, Número da Parcela
- ID Condição de Pagamento, Condição de Pagamento
- ID do Portador

#### 🔟 Campos Específicos de OUTCOME (9 campos)
Prefixados com `outcome_*`:
- Documento de Previsão, Status de Consistência, Status de Autorização
- ID Usuário de Cadastro, Cadastrado Por, Data de Cadastro
- Qtd. Departamentos, Qtd. Edificações, Qtd. Autorizações

## 🚀 Implantação

### Passo 1: Criar Projeto no Google Apps Script

1. Acesse [script.google.com](https://script.google.com)
2. Clique em **Novo projeto**
3. Nomeie o projeto: `Sienge Financial Connector`

### Passo 2: Adicionar os Arquivos

Copie o conteúdo de cada arquivo `.gs` para o editor:

1. **Config.gs** → Adicionar arquivo
2. **Utils.gs** → Adicionar arquivo
3. **SchemaBuilder.gs** → Adicionar arquivo
4. **DataFetcher.gs** → Adicionar arquivo
5. **DataTransformer.gs** → Adicionar arquivo
6. **SiengeFinancialConnector.gs** → Renomear `Code.gs`

### Passo 3: Configurar Manifesto

1. Clique no ícone de **Configurações do projeto** (⚙️)
2. Marque a opção **Mostrar arquivo de manifesto appsscript.json**
3. Abra o arquivo `appsscript.json` no editor
4. Substitua todo o conteúdo pelo conteúdo do arquivo `appsscript.json` deste projeto
5. **Importante**: Ajuste as URLs no manifesto para seu ambiente:
   ```json
   "companyUrl": "https://seu-servidor.com",
   "addOnUrl": "https://seu-servidor.com",
   "supportUrl": "https://seu-servidor.com"
   ```

### Passo 4: Implantar como Community Connector

1. Clique em **Implantar** > **Nova implantação**
2. Selecione o tipo: **Community Connector**
3. Preencha:
   - **Descrição**: "Sienge Financial Connector v1.0"
   - **Acesso**: Qualquer pessoa (ou conforme sua necessidade)
4. Clique em **Implantar**
5. **Copie o ID da implantação** (você vai precisar)

## 📊 Configuração no Looker Studio

### Conectar ao Looker Studio

1. Acesse [lookerstudio.google.com](https://lookerstudio.google.com)
2. Clique em **Criar** > **Fonte de dados**
3. Procure por **Community Connectors** e selecione **Criar seu próprio**
4. Cole o **ID da implantação** copiado anteriormente
5. Clique em **Validar**

### Configurar Parâmetros

Ao conectar, você verá as seguintes opções:

#### 🔗 URL da API
- **Campo**: URL base da sua API Sienge Financial
- **Exemplo**: `http://localhost:8000` ou `https://api.suaempresa.com`
- **Obrigatório**: Sim

#### ✅ Incluir Contas a Receber
- **Descrição**: Buscar dados de contas a receber da API
- **Padrão**: Marcado
- **Dica**: Desmarque se quiser apenas Contas a Pagar

#### ✅ Incluir Contas a Pagar
- **Descrição**: Buscar dados de contas a pagar da API
- **Padrão**: Marcado
- **Dica**: Desmarque se quiser apenas Contas a Receber

#### ⚡ Calcular Métricas de Movimentações
- **Descrição**: Processar arrays JSONB (`receipts`, `payments`) para calcular totais
- **Padrão**: Marcado
- **Impacto**: Aumenta tempo de processamento, mas adiciona 4 campos úteis
- **Dica**: Desmarque se tiver muitos dados e não precisar dessas métricas

#### 📝 Incluir Campos Específicos
- **Descrição**: Incluir campos específicos de cada tipo (`income_*`, `outcome_*`)
- **Padrão**: Marcado
- **Impacto**: Adiciona 22 campos específicos ao schema
- **Dica**: Desmarque se quiser apenas campos comuns (simplifica visualização)

### Exemplo de Configuração Rápida

Para começar rapidamente:
```
✅ URL da API: http://localhost:8000
✅ Incluir Contas a Receber: SIM
✅ Incluir Contas a Pagar: SIM
❌ Calcular Métricas: NÃO (para velocidade)
❌ Incluir Campos Específicos: NÃO (para simplicidade)
```

Isso dará **53 campos** comuns e rápidos.

### Exemplo de Configuração Completa

Para análise detalhada:
```
✅ URL da API: http://localhost:8000
✅ Incluir Contas a Receber: SIM
✅ Incluir Contas a Pagar: SIM
✅ Calcular Métricas: SIM (métricas de movimentação)
✅ Incluir Campos Específicos: SIM (todos os 79 campos)
```

Isso dará todos os **79 campos** disponíveis.

## 🔍 Casos de Uso

### 1. Análise Comparativa Income vs Outcome

```sql
-- No Looker Studio, crie um gráfico com:
Dimensão: record_type
Métrica: SUM(original_amount)
```

Visualize lado a lado quanto você tem a receber vs quanto tem a pagar.

### 2. Acompanhamento por Contraparte

```sql
-- Tabela com:
Dimensões: contraparte_nome, contraparte_tipo
Métricas: SUM(original_amount), SUM(balance_amount)
Filtro: record_type = "Contas a Receber"
```

Veja quanto cada cliente ainda deve.

### 3. Análise de Vencimentos

```sql
-- Gráfico de linha com:
Dimensão: due_date
Métrica: SUM(balance_amount)
Segmentar por: record_type
```

Visualize o fluxo de caixa projetado por vencimentos.

### 4. Status de Pagamentos

```sql
-- Pizza chart com:
Dimensão: situacao_pagamento
Métrica: COUNT(id)
Filtro: record_type = "Contas a Pagar"
```

Veja quantas contas estão Pagas, Parciais ou Pendentes.

### 5. Análise por Projeto

```sql
-- Tabela com:
Dimensões: project_name, company_name
Métricas: SUM(original_amount), COUNT(id)
Ordenar por: original_amount DESC
```

Identifique projetos com maior volume financeiro.

## 🐛 Troubleshooting

### Erro: "URL da API não configurada"

**Causa**: Campo URL da API vazio
**Solução**: Preencha a URL completa no formato `http://seu-servidor:porta`

### Erro: "Nenhum dado retornado pela API"

**Causas possíveis**:
1. API não está rodando
2. URL incorreta
3. Ambos "Incluir Contas a Receber" e "Incluir Contas a Pagar" desmarcados

**Soluções**:
1. Verifique se a API está ativa: `curl http://seu-servidor:8000/api/health`
2. Confirme a URL no navegador
3. Marque pelo menos uma das opções de inclusão

### Erro: "Timeout ao buscar dados"

**Causa**: Volume de dados muito grande ou API lenta
**Soluções**:
1. Desmarque "Calcular Métricas" para acelerar
2. Filtre os dados na API (ajuste as datas no `.env` da API)
3. Considere criar duas fontes de dados separadas (uma para Income, outra para Outcome)

### Erro: "Invalid JSON response"

**Causa**: API retornou resposta em formato incorreto
**Solução**: Verifique que seus endpoints `/api/income` e `/api/outcome` retornam:
```json
{
  "count": 100,
  "data": [...]
}
```

### Performance lenta no Looker Studio

**Otimizações**:
1. ❌ Desmarque "Calcular Métricas de Movimentações"
2. ❌ Desmarque "Incluir Campos Específicos"
3. 🔄 Reduza o período de dados na API (via `.env`)
4. 📊 Use agregações no Looker ao invés de dados brutos
5. 💾 Considere criar "extract" ao invés de conexão direta

### Cache desatualizado

O conector usa cache de 5 minutos. Para forçar atualização:
1. No Looker Studio, clique nos 3 pontos da fonte de dados
2. Selecione **Atualizar campos**
3. Ou aguarde 5 minutos e atualize o relatório

## 📚 Referência Técnica

### Endpoints Esperados

A API deve expor:
- `GET /api/income?limit=1000&offset=0`
- `GET /api/outcome?limit=1000&offset=0`

Formato de resposta:
```json
{
  "count": 1000,
  "data": [
    {
      "installment_id": 123,
      "bill_id": 456,
      "company_name": "Empresa XYZ",
      "client_id": 789,
      "client_name": "Cliente ABC",
      "original_amount": 1000.50,
      "receipts": [
        {
          "paymentDate": "2024-01-15",
          "netAmount": 500.25
        }
      ]
      // ... demais campos
    }
  ]
}
```

### Campos Obrigatórios da API

**Mínimo necessário para funcionar**:
- `installment_id`
- `bill_id`
- Para Income: `client_id`, `client_name`
- Para Outcome: `creditor_id`, `creditor_name`

Todos os outros campos são opcionais (retornarão valores vazios/0 se ausentes).

### Tipos de Dados

| Looker Studio Type | Uso | Formato |
|-------------------|-----|---------|
| `CURRENCY_BRL` | Valores monetários | R$ 1.234,56 |
| `NUMBER` | IDs, quantidades | 123 |
| `TEXT` | Nomes, descrições | "Empresa XYZ" |
| `YEAR_MONTH_DAY` | Datas | YYYYMMDD |
| `YEAR_MONTH_DAY_HOUR` | Timestamps | YYYYMMDDHH |
| `PERCENT` | Taxas | 12.5% |

## 🔐 Segurança

Este conector:
- ✅ Não requer autenticação (API pública local)
- ✅ Não armazena dados (apenas cache temporário de 5 min)
- ✅ Não envia dados para terceiros
- ⚠️ Assume que a API está em rede segura

**Para produção**:
- Configure a API com autenticação (token, OAuth)
- Use HTTPS na URL da API
- Implante o conector como privado (não público)

## 📝 Notas de Versão

### v1.0 - Initial Release
- ✅ Conector unificado Income + Outcome
- ✅ 79 campos organizados em 10 grupos
- ✅ Métricas calculadas de movimentações
- ✅ Cache de 5 minutos
- ✅ Paginação automática
- ✅ Nomenclatura em português brasileiro

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique a seção **Troubleshooting** acima
2. Revise os logs do Apps Script: **Execuções** no menu lateral
3. Teste a API diretamente no navegador
4. Verifique o formato de resposta dos endpoints

## 📄 Licença

Este conector foi desenvolvido para uso interno do projeto Sienge Financial Integration.