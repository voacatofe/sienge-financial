#!/usr/bin/env python3
"""
Teste de Conexão ao PostgreSQL Remoto
"""

import sys

# Teste 1: Verificar se psycopg está instalado
print("=" * 60)
print("TESTE 1: Verificando dependencias...")
print("=" * 60)

try:
    import psycopg
    print("OK: psycopg instalado")
except ImportError:
    print("ERRO: psycopg nao instalado")
    print("Execute: pip install psycopg")
    sys.exit(1)

# Teste 2: Verificar conectividade TCP
print("\n" + "=" * 60)
print("TESTE 2: Verificando conectividade TCP...")
print("=" * 60)

import socket

host = '147.93.15.121'
port = 5436

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(5)

try:
    result = sock.connect_ex((host, port))
    if result == 0:
        print(f"OK: Porta {port} esta acessivel")
    else:
        print(f"ERRO: Porta {port} nao acessivel (codigo: {result})")
        sys.exit(1)
except Exception as e:
    print(f"ERRO: {e}")
    sys.exit(1)
finally:
    sock.close()

# Teste 3: Tentar conectar ao PostgreSQL
print("\n" + "=" * 60)
print("TESTE 3: Conectando ao PostgreSQL...")
print("=" * 60)

# ALTERE A SENHA AQUI!
DB_CONFIG = {
    'host': '147.93.15.121',
    'port': 5436,
    'dbname': 'sienge_data',
    'user': 'sienge_app',
    'password': 'COLOQUE_SUA_SENHA_AQUI'  # ← ALTERE AQUI
}

print(f"Host: {DB_CONFIG['host']}")
print(f"Porta: {DB_CONFIG['port']}")
print(f"Database: {DB_CONFIG['dbname']}")
print(f"Usuario: {DB_CONFIG['user']}")
print("Senha: " + "*" * len(DB_CONFIG['password']))

try:
    # Tentar com sslmode=disable primeiro
    conn_str = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}?sslmode=disable"

    print("\nTentando conectar (sslmode=disable)...")
    conn = psycopg.connect(conn_str)

    print("OK: Conectado com sucesso!")

    # Teste 4: Executar query simples
    print("\n" + "=" * 60)
    print("TESTE 4: Executando query de teste...")
    print("=" * 60)

    with conn.cursor() as cur:
        # Testar versão
        cur.execute("SELECT version()")
        version = cur.fetchone()[0]
        print(f"PostgreSQL Version: {version[:50]}...")

        # Contar registros income
        cur.execute("SELECT COUNT(*) FROM income_data")
        income_count = cur.fetchone()[0]
        print(f"Total income_data: {income_count:,} registros")

        # Contar registros outcome
        cur.execute("SELECT COUNT(*) FROM outcome_data")
        outcome_count = cur.fetchone()[0]
        print(f"Total outcome_data: {outcome_count:,} registros")

        # Ver tamanhos
        cur.execute("""
            SELECT
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho
            FROM pg_stat_user_tables
            WHERE tablename IN ('income_data', 'outcome_data')
            ORDER BY tablename
        """)

        print("\nTamanhos das tabelas:")
        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]}")

    conn.close()

    print("\n" + "=" * 60)
    print("SUCESSO: Todos os testes passaram!")
    print("=" * 60)
    print("\nProximo passo: Execute o script de limpeza")
    print("  python scripts/cleanup_remote.py")

except psycopg.OperationalError as e:
    print(f"\nERRO DE CONEXAO: {e}")
    print("\nPossiveis causas:")
    print("  1. Senha incorreta")
    print("  2. Usuario 'sienge_app' nao existe")
    print("  3. Database 'sienge_data' nao existe")
    print("  4. Configuracao pg_hba.conf nao permite conexao remota")
    sys.exit(1)
except Exception as e:
    print(f"\nERRO: {e}")
    sys.exit(1)