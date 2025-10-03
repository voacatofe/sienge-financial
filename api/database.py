"""Database connection and utilities for Sienge Financial API"""
import os
import psycopg
from psycopg.rows import dict_row
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Database connection parameters from environment
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'dbname': os.getenv('POSTGRES_DB', 'sienge_data'),
    'user': os.getenv('POSTGRES_USER', 'sienge_app'),
    'password': os.getenv('POSTGRES_PASSWORD', 'sienge123')
}


def get_db_connection():
    """Create and return a new database connection with dict_row factory"""
    try:
        conn = psycopg.connect(**DB_CONFIG, row_factory=dict_row)
        return conn
    except psycopg.Error as e:
        logger.error(f"Failed to connect to database: {e}")
        raise


def execute_query(query: str, params: Optional[tuple] = None):
    """
    Execute a SELECT query and return results as list of dicts

    Args:
        query: SQL query string
        params: Query parameters (optional)

    Returns:
        List of dictionaries with query results
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            results = cur.fetchall()
            return results
    except psycopg.Error as e:
        logger.error(f"Database query failed: {e}")
        raise
    finally:
        if conn:
            conn.close()


def execute_single(query: str, params: Optional[tuple] = None):
    """
    Execute a SELECT query and return single result as dict

    Args:
        query: SQL query string
        params: Query parameters (optional)

    Returns:
        Dictionary with single query result or None if not found
    """
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            result = cur.fetchone()
            return result
    except psycopg.Error as e:
        logger.error(f"Database query failed: {e}")
        raise
    finally:
        if conn:
            conn.close()


def build_where_clause(filters: dict, date_field: str = 'due_date') -> tuple[str, list]:
    """
    Build WHERE clause from filters dictionary

    Args:
        filters: Dictionary of field_name: value pairs
        date_field: Name of the date field to use for date range filtering (default: 'due_date')

    Returns:
        Tuple of (where_clause_string, parameters_list)
    """
    conditions = []
    params = []

    for field, value in filters.items():
        if value is not None:
            # Handle LIKE queries for text fields ending with _name
            if isinstance(value, str) and field.endswith('_name'):
                conditions.append(f"{field} ILIKE %s")
                params.append(f"%{value}%")
            # Handle date range queries with dynamic date field
            elif field == 'start_date':
                conditions.append(f"{date_field} >= %s")
                params.append(value)
            elif field == 'end_date':
                conditions.append(f"{date_field} <= %s")
                params.append(value)
            # Handle amount range queries
            elif field == 'min_amount':
                conditions.append("original_amount >= %s")
                params.append(value)
            elif field == 'max_amount':
                conditions.append("original_amount <= %s")
                params.append(value)
            # Handle exact matches
            else:
                conditions.append(f"{field} = %s")
                params.append(value)

    where_clause = " AND ".join(conditions) if conditions else "TRUE"
    return where_clause, params