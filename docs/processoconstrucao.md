1- Leitura e construção das APIs de entrada
Cuidar com campos obrigatórios e ignorar os opcionais
2- Construção das tabelas no PostgreSQL
Criar tabelas de acordo com o endpoint lido e construido pela api de entrada, com cada coluna e nomenclatura identica aos campos da api de entrada
3- Sincronização dos dados das APIs de entrada
Criar sincronização diária dos dados das APIs de entrada no banco de dados PostgreSQL
4 - Construção das APIs de saída
Framework: FastAPI

     - Documentação automática (Swagger UI)
     - Validação automática de parâmetros
     - Performance excelente com async
     - Fácil de consumir externamente
     🔗 Endpoints da API
1. Income (Contas a Receber)

     GET /api/income
     GET /api/income/{id}
     2. Outcome (Contas a Pagar)

     GET /api/outcome
     GET /api/outcome/{id}
     
     Exemplos de uso:
     http://localhost:8000/api/outcome
     http://localhost:8000/api/outcome?creditor_name=FORNECEDOR
     http://localhost:8000/api/outcome?authorization_status=approved
     http://localhost:8000/api/outcome/8_12574

     5 - Construção do appscript para sincronização dos dados das APIs de saída no Looker Studio
     criar somente um appscript que sincronize todos os dados de todas as tabelas do banco de dados PostgreSQL via nossas APIs de saída. Aqui o mais importante é o UX da nossa tabela, que nao é um intermediário entre o banco de dados PostgreSQL e o Looker Studio. Então precisa ter os dados como eles se apresentam no banco de dados PostgreSQL, mas agrupados de maneira correta e com as nomenclaturas corretas e traduzidas para o português brasileiro.