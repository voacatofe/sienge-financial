import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Test with direct connection string
try:
    # Try connection with explicit parameters
    conn = psycopg.connect(
        host="localhost",
        port="5432",
        dbname="sienge_data",
        user="sienge_app",
        password="sienge123"
    )
    print("Connected successfully!")

    # Test query
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM income_data")
    count = cur.fetchone()[0]
    print(f"Income table has {count} records")

    cur.execute("SELECT COUNT(*) FROM outcome_data")
    count = cur.fetchone()[0]
    print(f"Outcome table has {count} records")

    conn.close()
    print("Connection closed")

except Exception as e:
    print(f"Error: {e}")