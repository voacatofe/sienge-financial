#!/usr/bin/env python3
"""
Sienge Financial Data Sync
Syncs income and outcome data from Sienge API to PostgreSQL
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

import requests
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SiengeSync:
    """Main class for syncing Sienge data to PostgreSQL"""

    def __init__(self):
        """Initialize the sync service"""
        self.base_url = f"https://api.sienge.com.br/{os.getenv('SIENGE_SUBDOMAIN')}/public/api/bulk-data/v1"
        self.auth = (os.getenv('SIENGE_USERNAME'), os.getenv('SIENGE_PASSWORD_ABF'))

        # Database connection parameters
        self.db_params = {
            'host': os.getenv('POSTGRES_HOST', 'localhost'),  # Support both Docker and local
            'port': os.getenv('POSTGRES_PORT', '5432'),
            'database': os.getenv('POSTGRES_DB'),
            'user': os.getenv('POSTGRES_USER'),
            'password': os.getenv('POSTGRES_PASSWORD')
        }

        self.conn = None
        self.cursor = None

    def connect_db(self):
        """Connect to PostgreSQL database"""
        try:
            # Build connection string for psycopg3
            import urllib.parse
            password = urllib.parse.quote_plus(self.db_params['password'])
            conn_str = f"postgresql://{self.db_params['user']}:{password}@{self.db_params['host']}:{self.db_params['port']}/{self.db_params['database']}"
            self.conn = psycopg.connect(conn_str, row_factory=dict_row)
            self.cursor = self.conn.cursor()
            logger.info("Connected to PostgreSQL database")
        except psycopg.Error as e:
            logger.error(f"Failed to connect to database: {e}")
            sys.exit(1)

    def close_db(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("Database connection closed")

    def is_first_sync(self) -> bool:
        """
        Check if this is the first sync (database is empty)
        Returns True if both income and outcome tables are empty
        """
        try:
            self.cursor.execute("SELECT COUNT(*) FROM income")
            income_count = self.cursor.fetchone()[0]

            self.cursor.execute("SELECT COUNT(*) FROM outcome")
            outcome_count = self.cursor.fetchone()[0]

            is_first = (income_count == 0 and outcome_count == 0)
            logger.info(f"First sync check: income={income_count}, outcome={outcome_count}, is_first={is_first}")

            return is_first
        except Exception as e:
            logger.error(f"Error checking if first sync: {e}")
            return True  # Assume first sync on error

    def get_last_successful_sync_date(self, data_type: str) -> Optional[datetime]:
        """
        Get the end_date of the last successful sync for a given data type

        Args:
            data_type: 'income' or 'outcome'

        Returns:
            datetime object of last successful sync, or None if not found
        """
        try:
            self.cursor.execute("""
                SELECT MAX(end_date)
                FROM sync_control
                WHERE data_type = %s
                  AND status = 'success'
                  AND sync_type = 'daily'
            """, (data_type,))

            result = self.cursor.fetchone()
            if result and result[0]:
                return datetime.combine(result[0], datetime.min.time())
            return None
        except Exception as e:
            logger.warning(f"Could not get last sync date for {data_type}: {e}")
            return None

    def get_sync_dates(self) -> tuple[str, str, str]:
        """
        Automatically determine sync dates based on database state

        Returns:
            tuple: (sync_type, start_date, end_date) as strings
        """
        if self.is_first_sync():
            # BACKFILL: First sync detected
            years = int(os.getenv('BACKFILL_YEARS', '5'))
            start_date = datetime.now() - timedelta(days=years * 365)
            end_date = datetime.now()
            sync_type = 'historical'

            logger.info(f"🎯 BACKFILL MODE: Syncing last {years} years")
            logger.info(f"   Period: {start_date.date()} to {end_date.date()}")
        else:
            # INCREMENTAL: Subsequent syncs
            lookback_days = int(os.getenv('INCREMENTAL_LOOKBACK_DAYS', '7'))

            # Try to get last sync date, fallback to lookback window
            last_sync_income = self.get_last_successful_sync_date('income')
            last_sync_outcome = self.get_last_successful_sync_date('outcome')

            # Use the earliest of the two (or fallback if neither exists)
            if last_sync_income or last_sync_outcome:
                last_sync = min(
                    filter(None, [last_sync_income, last_sync_outcome])
                )
                start_date = last_sync - timedelta(days=lookback_days)
            else:
                # Fallback: use lookback window from today
                start_date = datetime.now() - timedelta(days=lookback_days)

            end_date = datetime.now()
            sync_type = 'daily'

            logger.info(f"🔄 INCREMENTAL MODE: Syncing with {lookback_days}-day overlap")
            logger.info(f"   Period: {start_date.date()} to {end_date.date()}")

        # Format as strings for API calls
        start_date_str = start_date.strftime('%Y-%m-%d')
        end_date_str = end_date.strftime('%Y-%m-%d')

        return sync_type, start_date_str, end_date_str

    def record_sync_start(self, sync_type: str, data_type: str, start_date: str, end_date: str) -> int:
        """
        Record the start of a sync operation in sync_control table

        Returns:
            int: The ID of the created sync_control record
        """
        try:
            self.cursor.execute("""
                INSERT INTO sync_control (
                    sync_type, data_type, start_date, end_date, status
                ) VALUES (%s, %s, %s, %s, 'running')
                RETURNING id
            """, (sync_type, data_type, start_date, end_date))

            sync_id = self.cursor.fetchone()[0]
            self.conn.commit()

            logger.info(f"Recorded sync start: {sync_type}/{data_type} (id={sync_id})")
            return sync_id
        except Exception as e:
            logger.error(f"Failed to record sync start: {e}")
            return None

    def record_sync_complete(self, sync_id: int, records_synced: int,
                            records_inserted: int, records_updated: int,
                            execution_time: int):
        """
        Update sync_control record with completion status
        """
        try:
            self.cursor.execute("""
                UPDATE sync_control
                SET status = 'success',
                    records_synced = %s,
                    records_inserted = %s,
                    records_updated = %s,
                    execution_time_seconds = %s
                WHERE id = %s
            """, (records_synced, records_inserted, records_updated, execution_time, sync_id))

            self.conn.commit()
            logger.info(f"Recorded sync completion (id={sync_id}): {records_synced} records")
        except Exception as e:
            logger.error(f"Failed to record sync completion: {e}")

    def record_sync_failure(self, sync_id: int, error_message: str, execution_time: int):
        """
        Update sync_control record with failure status
        """
        try:
            self.cursor.execute("""
                UPDATE sync_control
                SET status = 'failed',
                    error_message = %s,
                    execution_time_seconds = %s
                WHERE id = %s
            """, (error_message, execution_time, sync_id))

            self.conn.commit()
            logger.error(f"Recorded sync failure (id={sync_id}): {error_message}")
        except Exception as e:
            logger.error(f"Failed to record sync failure: {e}")

    def fetch_income_data(self, start_date: str, end_date: str, selection_type: str = 'I') -> List[Dict]:
        """Fetch income data from Sienge API"""
        url = f"{self.base_url}/income"
        params = {
            'startDate': start_date,
            'endDate': end_date,
            'selectionType': selection_type
        }

        logger.info(f"Fetching income data from {start_date} to {end_date} (selectionType={selection_type})")

        try:
            response = requests.get(url, auth=self.auth, params=params)
            response.raise_for_status()
            data = response.json()

            if 'data' in data:
                logger.info(f"Fetched {len(data['data'])} income records")
                return data['data']
            else:
                logger.warning("No data field in income response")
                return []

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch income data: {e}")
            return []

    def fetch_outcome_data(self, start_date: str, end_date: str,
                          selection_type: str = 'I',
                          correction_indexer_id: int = 0,
                          correction_date: Optional[str] = None) -> List[Dict]:
        """Fetch outcome data from Sienge API"""
        url = f"{self.base_url}/outcome"

        if not correction_date:
            correction_date = datetime.now().strftime('%Y-%m-%d')

        params = {
            'startDate': start_date,
            'endDate': end_date,
            'selectionType': selection_type,
            'correctionIndexerId': correction_indexer_id,
            'correctionDate': correction_date
        }

        logger.info(f"Fetching outcome data from {start_date} to {end_date} (selectionType={selection_type})")

        try:
            response = requests.get(url, auth=self.auth, params=params)
            response.raise_for_status()
            data = response.json()

            if 'data' in data:
                logger.info(f"Fetched {len(data['data'])} outcome records")
                return data['data']
            else:
                logger.warning("No data field in outcome response")
                return []

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch outcome data: {e}")
            return []

    def process_income_record(self, record: Dict) -> Dict:
        """Process a single income record for database insertion"""
        # Extract payment term if exists
        payment_term = record.get('paymentTerm', {})

        # Generate composite ID (somente números)
        installment_id = record.get('installmentId')
        bill_id = record.get('billId')
        composite_id = f"{installment_id}_{bill_id}"

        # Prepare data for insertion
        data = {
            'id': composite_id,  # ID composto determinístico
            'installment_id': installment_id,
            'bill_id': bill_id,
            'company_id': record.get('companyId'),
            'company_name': record.get('companyName'),
            'business_area_id': record.get('businessAreaId'),
            'business_area_name': record.get('businessAreaName'),
            'project_id': record.get('projectId'),
            'project_name': record.get('projectName'),
            'group_company_id': record.get('groupCompanyId'),
            'group_company_name': record.get('groupCompanyName'),
            'holding_id': record.get('holdingId'),
            'holding_name': record.get('holdingName'),
            'subsidiary_id': record.get('subsidiaryId'),
            'subsidiary_name': record.get('subsidiaryName'),
            'business_type_id': record.get('businessTypeId'),
            'business_type_name': record.get('businessTypeName'),
            'client_id': record.get('clientId'),
            'client_name': record.get('clientName'),
            'document_identification_id': record.get('documentIdentificationId'),
            'document_identification_name': record.get('documentIdentificationName'),
            'document_number': record.get('documentNumber'),
            'document_forecast': record.get('documentForecast'),
            'origin_id': record.get('originId'),
            'original_amount': record.get('originalAmount'),
            'discount_amount': record.get('discountAmount'),
            'tax_amount': record.get('taxAmount'),
            'indexer_id': record.get('indexerId'),
            'indexer_name': record.get('indexerName'),
            'due_date': record.get('dueDate'),
            'issue_date': record.get('issueDate'),
            'bill_date': record.get('billDate'),
            'installment_base_date': record.get('installmentBaseDate'),
            'balance_amount': record.get('balanceAmount'),
            'corrected_balance_amount': record.get('correctedBalanceAmount'),
            'periodicity_type': record.get('periodicityType'),
            'embedded_interest_amount': record.get('embeddedInterestAmount'),
            'interest_type': record.get('interestType'),
            'interest_rate': record.get('interestRate'),
            'correction_type': record.get('correctionType'),
            'interest_base_date': record.get('interestBaseDate'),
            'defaulter_situation': record.get('defaulterSituation'),
            'sub_judicie': record.get('subJudicie'),
            'main_unit': record.get('mainUnit'),
            'installment_number': record.get('installmentNumber'),
            'payment_term_id': payment_term.get('id') if payment_term else None,
            'payment_term_descrition': payment_term.get('descrition') if payment_term else None,  # Typo from API
            'bearer_id': record.get('bearerId'),
            'receipts': json.dumps(record.get('receipts', [])),
            'receipts_categories': json.dumps(record.get('receiptsCategories', []))
        }

        return data

    def process_outcome_record(self, record: Dict) -> Dict:
        """Process a single outcome record for database insertion"""
        # Generate composite ID (somente números)
        installment_id = record.get('installmentId')
        bill_id = record.get('billId')
        composite_id = f"{installment_id}_{bill_id}"

        # Prepare data for insertion
        data = {
            'id': composite_id,  # ID composto determinístico
            'installment_id': installment_id,
            'bill_id': bill_id,
            'company_id': record.get('companyId'),
            'company_name': record.get('companyName'),
            'business_area_id': record.get('businessAreaId'),
            'business_area_name': record.get('businessAreaName'),
            'project_id': record.get('projectId'),
            'project_name': record.get('projectName'),
            'group_company_id': record.get('groupCompanyId'),
            'group_company_name': record.get('groupCompanyName'),
            'holding_id': record.get('holdingId'),
            'holding_name': record.get('holdingName'),
            'subsidiary_id': record.get('subsidiaryId'),
            'subsidiary_name': record.get('subsidiaryName'),
            'business_type_id': record.get('businessTypeId'),
            'business_type_name': record.get('businessTypeName'),
            'creditor_id': record.get('creditorId'),
            'creditor_name': record.get('creditorName'),
            'document_identification_id': record.get('documentIdentificationId'),
            'document_identification_name': record.get('documentIdentificationName'),
            'document_number': record.get('documentNumber'),
            'forecast_document': record.get('forecastDocument'),
            'consistency_status': record.get('consistencyStatus'),
            'origin_id': record.get('originId'),
            'original_amount': record.get('originalAmount'),
            'discount_amount': record.get('discountAmount'),
            'tax_amount': record.get('taxAmount'),
            'indexer_id': record.get('indexerId'),
            'indexer_name': record.get('indexerName'),
            'due_date': record.get('dueDate'),
            'issue_date': record.get('issueDate'),
            'bill_date': record.get('billDate'),
            'installment_base_date': record.get('installmentBaseDate'),
            'balance_amount': record.get('balanceAmount'),
            'corrected_balance_amount': record.get('correctedBalanceAmount'),
            'authorization_status': record.get('authorizationStatus'),
            'registered_user_id': record.get('registeredUserId'),
            'registered_by': record.get('registeredBy'),
            'registered_date': record.get('registeredDate'),
            'payments': json.dumps(record.get('payments', [])),
            'payments_categories': json.dumps(record.get('paymentsCategories', [])),
            'departments_costs': json.dumps(record.get('departamentsCosts', [])),
            'buildings_costs': json.dumps(record.get('buildingsCosts', [])),
            'authorizations': json.dumps(record.get('authorizations', []))
        }

        return data

    def upsert_income_record(self, data: Dict):
        """Insert or update an income record"""
        columns = data.keys()
        values = [data[col] for col in columns]

        # Build the INSERT query with ON CONFLICT on composite ID
        insert_query = f"""
            INSERT INTO income_data ({', '.join(columns)})
            VALUES ({', '.join(['%s'] * len(columns))})
            ON CONFLICT (id) DO UPDATE SET
            {', '.join([f"{col} = EXCLUDED.{col}" for col in columns if col != 'id'])},
            sync_date = NOW()
        """

        try:
            self.cursor.execute(insert_query, values)
        except psycopg.Error as e:
            logger.error(f"Failed to upsert income record {data.get('installment_id')}: {e}")
            self.conn.rollback()
            raise

    def upsert_outcome_record(self, data: Dict):
        """Insert or update an outcome record"""
        columns = data.keys()
        values = [data[col] for col in columns]

        # Build the INSERT query with ON CONFLICT on composite ID
        insert_query = f"""
            INSERT INTO outcome_data ({', '.join(columns)})
            VALUES ({', '.join(['%s'] * len(columns))})
            ON CONFLICT (id) DO UPDATE SET
            {', '.join([f"{col} = EXCLUDED.{col}" for col in columns if col != 'id'])},
            sync_date = NOW()
        """

        try:
            self.cursor.execute(insert_query, values)
        except psycopg.Error as e:
            logger.error(f"Failed to upsert outcome record {data.get('installment_id')}: {e}")
            self.conn.rollback()
            raise

    def sync_income(self, sync_type: str, start_date: str, end_date: str):
        """Sync income data for the specified date range"""
        logger.info(f"Starting income sync from {start_date} to {end_date}")

        start_time = datetime.now()

        # Record sync start
        sync_id = self.record_sync_start(sync_type, 'income', start_date, end_date)

        try:
            # Fetch data from API
            records = self.fetch_income_data(start_date, end_date)

            if not records:
                logger.info("No income records to sync")
                execution_time = int((datetime.now() - start_time).total_seconds())
                self.record_sync_complete(sync_id, 0, 0, 0, execution_time)
                return

            # Process and insert each record
            success_count = 0
            error_count = 0

            # Note: We can't track insert vs update at this level without checking before upsert
            # For now, we'll just track total synced
            for record in records:
                try:
                    processed_data = self.process_income_record(record)
                    self.upsert_income_record(processed_data)
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to process income record: {e}")
                    error_count += 1

            # Commit the transaction
            self.conn.commit()

            execution_time = int((datetime.now() - start_time).total_seconds())
            self.record_sync_complete(sync_id, success_count, 0, 0, execution_time)

            logger.info(f"Income sync completed: {success_count} success, {error_count} errors")

        except Exception as e:
            execution_time = int((datetime.now() - start_time).total_seconds())
            self.record_sync_failure(sync_id, str(e), execution_time)
            raise

    def sync_outcome(self, sync_type: str, start_date: str, end_date: str):
        """Sync outcome data for the specified date range"""
        logger.info(f"Starting outcome sync from {start_date} to {end_date}")

        start_time = datetime.now()

        # Record sync start
        sync_id = self.record_sync_start(sync_type, 'outcome', start_date, end_date)

        try:
            # Fetch data from API
            records = self.fetch_outcome_data(start_date, end_date)

            if not records:
                logger.info("No outcome records to sync")
                execution_time = int((datetime.now() - start_time).total_seconds())
                self.record_sync_complete(sync_id, 0, 0, 0, execution_time)
                return

            # Process and insert each record
            success_count = 0
            error_count = 0

            for record in records:
                try:
                    processed_data = self.process_outcome_record(record)
                    self.upsert_outcome_record(processed_data)
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to process outcome record: {e}")
                    error_count += 1

            # Commit the transaction
            self.conn.commit()

            execution_time = int((datetime.now() - start_time).total_seconds())
            self.record_sync_complete(sync_id, success_count, 0, 0, execution_time)

            logger.info(f"Outcome sync completed: {success_count} success, {error_count} errors")

        except Exception as e:
            execution_time = int((datetime.now() - start_time).total_seconds())
            self.record_sync_failure(sync_id, str(e), execution_time)
            raise

    def run(self, start_date: Optional[str] = None, end_date: Optional[str] = None):
        """
        Run the complete sync process with automatic date detection

        Args:
            start_date: Optional manual override for start date (YYYY-MM-DD)
            end_date: Optional manual override for end date (YYYY-MM-DD)

        If dates are not provided, automatically detects:
        - First sync (empty database) → Backfill mode (last 5 years)
        - Subsequent syncs → Incremental mode (last 7 days with overlap)
        """
        try:
            # Connect to database
            self.connect_db()

            # Determine sync dates automatically or use provided dates
            if start_date and end_date:
                # Manual override
                sync_type = 'manual'
                logger.info(f"📅 MANUAL MODE: Using provided dates")
                logger.info(f"   Period: {start_date} to {end_date}")
            else:
                # Automatic detection
                sync_type, start_date, end_date = self.get_sync_dates()

            logger.info(f"Starting Sienge sync for period {start_date} to {end_date}")

            # Sync income data
            self.sync_income(sync_type, start_date, end_date)

            # Sync outcome data
            self.sync_outcome(sync_type, start_date, end_date)

            logger.info("✅ Sienge sync completed successfully")

        except Exception as e:
            logger.error(f"❌ Sync failed: {e}")
            raise
        finally:
            self.close_db()


def main():
    """Main entry point"""
    # Parse command line arguments if needed
    import argparse

    parser = argparse.ArgumentParser(description='Sync Sienge financial data to PostgreSQL')
    parser.add_argument('--start-date', help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', help='End date (YYYY-MM-DD)')
    parser.add_argument('--test-connection', action='store_true',
                       help='Test database connection only')

    args = parser.parse_args()

    # Create sync instance
    sync = SiengeSync()

    if args.test_connection:
        # Test connection only
        sync.connect_db()
        logger.info("Database connection successful!")
        sync.close_db()
    else:
        # Run full sync
        sync.run(args.start_date, args.end_date)


if __name__ == '__main__':
    main()