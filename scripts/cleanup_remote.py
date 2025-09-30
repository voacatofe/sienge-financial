#!/usr/bin/env python3
"""
Script de Limpeza de Dados - Conexão Remota
Execute da sua máquina local
"""

import psycopg
import sys
import os
from datetime import datetime

# Configurações de conexão
# ATENÇÃO: Altere a senha ou configure via variável de ambiente
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', '147.93.15.121'),
    'port': int(os.getenv('POSTGRES_EXTERNAL_PORT', '5436')),
    'dbname': os.getenv('POSTGRES_DB', 'sienge_data'),
    'user': os.getenv('POSTGRES_USER', 'sienge_app'),
    'password': os.getenv('POSTGRES_PASSWORD', 'ALTERE_AQUI')  # Ou passe via variável de ambiente
}

RETENTION_MONTHS = 12

def connect_db():
    """Conecta ao banco de dados"""
    try:
        conn_str = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}"
        conn = psycopg.connect(conn_str)
        print("✅ Conectado ao banco de dados")
        return conn
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        sys.exit(1)

def verificar_dados(conn):
    """Verifica quantos dados serão deletados"""
    print("\n" + "="*60)
    print("🔍 VERIFICANDO DADOS ATUAIS")
    print("="*60)

    with conn.cursor() as cur:
        # Income data
        cur.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE - INTERVAL '%s months') as ficarao,
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '%s months') as serao_deletados,
                pg_size_pretty(pg_total_relation_size('income_data')) as tamanho
            FROM income_data
        """ % (RETENTION_MONTHS, RETENTION_MONTHS))

        result = cur.fetchone()
        print(f"\n📊 income_data:")
        print(f"   Total atual: {result[0]:,} registros")
        print(f"   Permanecerão: {result[1]:,} registros")
        print(f"   Serão deletados: {result[2]:,} registros ({result[2]/result[0]*100:.1f}%)")
        print(f"   Tamanho atual: {result[3]}")

        # Outcome data
        cur.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE - INTERVAL '%s months') as ficarao,
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '%s months') as serao_deletados,
                pg_size_pretty(pg_total_relation_size('outcome_data')) as tamanho
            FROM outcome_data
        """ % (RETENTION_MONTHS, RETENTION_MONTHS))

        result = cur.fetchone()
        print(f"\n📊 outcome_data:")
        print(f"   Total atual: {result[0]:,} registros")
        print(f"   Permanecerão: {result[1]:,} registros")
        print(f"   Serão deletados: {result[2]:,} registros ({result[2]/result[0]*100:.1f}%)")
        print(f"   Tamanho atual: {result[3]}")

        # Distribuição por ano
        print(f"\n📅 Distribuição por Ano (Income):")
        cur.execute("""
            SELECT
                EXTRACT(YEAR FROM due_date) as ano,
                COUNT(*) as registros
            FROM income_data
            GROUP BY ano
            ORDER BY ano DESC
        """)
        for row in cur.fetchall():
            print(f"   {int(row[0])}: {row[1]:,} registros")

def deletar_dados(conn):
    """Deleta dados antigos"""
    print("\n" + "="*60)
    print("🗑️  DELETANDO DADOS ANTIGOS")
    print("="*60)

    with conn.cursor() as cur:
        # Iniciar transação
        conn.execute("BEGIN")

        print(f"\n🗑️  Deletando income_data (> {RETENTION_MONTHS} meses)...")
        cur.execute(f"DELETE FROM income_data WHERE due_date < CURRENT_DATE - INTERVAL '{RETENTION_MONTHS} months'")
        income_deleted = cur.rowcount
        print(f"   ✅ {income_deleted:,} registros deletados")

        print(f"\n🗑️  Deletando outcome_data (> {RETENTION_MONTHS} meses)...")
        cur.execute(f"DELETE FROM outcome_data WHERE due_date < CURRENT_DATE - INTERVAL '{RETENTION_MONTHS} months'")
        outcome_deleted = cur.rowcount
        print(f"   ✅ {outcome_deleted:,} registros deletados")

        # Verificar resultado
        cur.execute("SELECT COUNT(*) FROM income_data")
        income_remaining = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM outcome_data")
        outcome_remaining = cur.fetchone()[0]

        print(f"\n📊 Registros restantes:")
        print(f"   income_data: {income_remaining:,}")
        print(f"   outcome_data: {outcome_remaining:,}")

        # Commit
        conn.commit()
        print("\n✅ Transação commitada com sucesso!")

def vacuum_e_reindex(conn):
    """Recupera espaço e otimiza"""
    print("\n" + "="*60)
    print("🔧 RECUPERANDO ESPAÇO E OTIMIZANDO")
    print("="*60)
    print("⚠️  Esta etapa pode demorar 5-10 minutos...")
    print("⚠️  Banco ficará OFFLINE durante o processo")

    # VACUUM precisa ser executado fora de transação
    conn.autocommit = True

    with conn.cursor() as cur:
        print("\n🧹 VACUUM FULL income_data...")
        cur.execute("VACUUM FULL income_data")
        print("   ✅ Concluído")

        print("\n🧹 VACUUM FULL outcome_data...")
        cur.execute("VACUUM FULL outcome_data")
        print("   ✅ Concluído")

        print("\n🔄 REINDEX income_data...")
        cur.execute("REINDEX TABLE income_data")
        print("   ✅ Concluído")

        print("\n🔄 REINDEX outcome_data...")
        cur.execute("REINDEX TABLE outcome_data")
        print("   ✅ Concluído")

        print("\n📊 ANALYZE (atualizando estatísticas)...")
        cur.execute("ANALYZE income_data")
        cur.execute("ANALYZE outcome_data")
        print("   ✅ Concluído")

    conn.autocommit = False

def verificar_resultado(conn):
    """Verifica resultado final"""
    print("\n" + "="*60)
    print("✅ RESULTADO FINAL")
    print("="*60)

    with conn.cursor() as cur:
        cur.execute("""
            SELECT
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho,
                n_live_tup as registros
            FROM pg_stat_user_tables
            WHERE tablename IN ('income_data', 'outcome_data')
            ORDER BY tablename
        """)

        print("\n📊 Tamanhos finais:")
        for row in cur.fetchall():
            print(f"   {row[0]}: {row[1]} ({row[2]:,} registros)")

        # Período de dados
        cur.execute("""
            SELECT
                'income_data' as tabela,
                MIN(due_date) as mais_antiga,
                MAX(due_date) as mais_recente,
                COUNT(*) as total
            FROM income_data
            UNION ALL
            SELECT
                'outcome_data',
                MIN(due_date),
                MAX(due_date),
                COUNT(*)
            FROM outcome_data
        """)

        print("\n📅 Período de dados mantido:")
        for row in cur.fetchall():
            print(f"   {row[0]}: {row[1]} a {row[2]} ({row[3]:,} registros)")

def main():
    """Função principal"""
    print("="*60)
    print("🧹 LIMPEZA DE DADOS HISTÓRICOS - SIENGE FINANCIAL")
    print("="*60)
    print(f"\n🎯 Configuração:")
    print(f"   Host: {DB_CONFIG['host']}")
    print(f"   Database: {DB_CONFIG['dbname']}")
    print(f"   Retenção: {RETENTION_MONTHS} meses")

    # Conectar
    conn = connect_db()

    try:
        # Passo 1: Verificar
        verificar_dados(conn)

        # Confirmação
        print("\n" + "="*60)
        print("⚠️  ATENÇÃO: Revise os números acima!")
        print("="*60)
        resposta = input("\n❓ Deseja continuar com a limpeza? (digite SIM): ")

        if resposta.strip().upper() != "SIM":
            print("❌ Operação cancelada pelo usuário.")
            return

        # Passo 2: Deletar
        deletar_dados(conn)

        # Passo 3: Vacuum e Reindex
        resposta = input("\n❓ Executar VACUUM FULL? (digite SIM): ")
        if resposta.strip().upper() == "SIM":
            vacuum_e_reindex(conn)

        # Passo 4: Verificar resultado
        verificar_resultado(conn)

        print("\n" + "="*60)
        print("🎉 LIMPEZA CONCLUÍDA COM SUCESSO!")
        print("="*60)
        print("\n📋 Próximos passos:")
        print("   1. Testar dashboard no Looker Studio")
        print("   2. Verificar logs do Apps Script")
        print("   3. Confirmar queries < 3 segundos")
        print(f"\n💾 Backup recomendado antes de próxima execução!")

    except Exception as e:
        print(f"\n❌ Erro durante execução: {e}")
        conn.rollback()
    finally:
        conn.close()
        print("\n🔌 Conexão fechada")

if __name__ == "__main__":
    main()