"""
Sienge Financial API
RESTful API for querying financial data from Sienge
"""
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import logging
from datetime import date

from models import (
    ApiResponse, ErrorResponse, IncomeFilters, OutcomeFilters,
    HealthCheck, ApiInfo
)
from database import execute_query, execute_single, build_where_clause

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Sienge Financial API",
    description="API para consulta de dados financeiros do Sienge (Income e Outcome)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS - allow all origins for external consumption
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            detail=str(exc)
        ).dict()
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            detail=None
        ).dict()
    )


# Root endpoint
@app.get("/", response_model=ApiInfo)
async def root():
    """API information endpoint"""
    return ApiInfo()


# Health check endpoint
@app.get("/api/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint to verify API and database connectivity"""
    try:
        # Test database connection
        result = execute_single("SELECT 1 as test")
        if result and result.get('test') == 1:
            return HealthCheck()
        else:
            raise HTTPException(status_code=503, detail="Database connection failed")
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")


# Income endpoints
@app.get("/api/income", response_model=ApiResponse)
async def get_income_data(
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    company_name: Optional[str] = Query(None, description="Partial search in company name"),
    client_id: Optional[int] = Query(None, description="Filter by client ID"),
    client_name: Optional[str] = Query(None, description="Partial search in client name"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    business_area_id: Optional[int] = Query(None, description="Filter by business area ID"),
    start_date: Optional[date] = Query(None, description="Start date for filtering"),
    end_date: Optional[date] = Query(None, description="End date for filtering"),
    date_field: str = Query('due_date', description="Date field to use for filtering (due_date, payment_date, issue_date, etc)"),
    min_amount: Optional[float] = Query(None, description="Minimum amount filter"),
    max_amount: Optional[float] = Query(None, description="Maximum amount filter"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip (pagination)")
):
    """
    Get income data (Contas a Receber) with optional filters

    All filters are optional and can be combined.
    Results are paginated with a maximum of 1000 records per request.
    """
    try:
        # Build filters dictionary (excluding limit and offset)
        filters = {
            'company_id': company_id,
            'company_name': company_name,
            'client_id': client_id,
            'client_name': client_name,
            'project_id': project_id,
            'business_area_id': business_area_id,
            'start_date': start_date,
            'end_date': end_date,
            'min_amount': min_amount,
            'max_amount': max_amount
        }

        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}

        # Build WHERE clause with dynamic date field
        where_clause, params = build_where_clause(filters, date_field=date_field)

        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM income_data WHERE {where_clause}"
        count_result = execute_single(count_query, tuple(params))
        total = count_result['total'] if count_result else 0

        # Get paginated data
        data_query = f"""
            SELECT * FROM income_data
            WHERE {where_clause}
            ORDER BY {date_field} DESC, id
            LIMIT %s OFFSET %s
        """
        data = execute_query(data_query, tuple(params + [limit, offset]))

        return ApiResponse(
            success=True,
            total=total,
            count=len(data),
            limit=limit,
            offset=offset,
            data=data
        )

    except Exception as e:
        logger.error(f"Error fetching income data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch income data: {str(e)}")


@app.get("/api/income/{id}", response_model=ApiResponse)
async def get_income_by_id(id: str):
    """
    Get a specific income record by ID

    ID format: "installment_bill" (e.g., "47_635")
    """
    try:
        query = "SELECT * FROM income_data WHERE id = %s"
        result = execute_single(query, (id,))

        if not result:
            raise HTTPException(status_code=404, detail=f"Income record with ID '{id}' not found")

        return ApiResponse(
            success=True,
            data=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching income by ID: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch income record: {str(e)}")


# Outcome endpoints
@app.get("/api/outcome", response_model=ApiResponse)
async def get_outcome_data(
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    company_name: Optional[str] = Query(None, description="Partial search in company name"),
    creditor_id: Optional[int] = Query(None, description="Filter by creditor/supplier ID"),
    creditor_name: Optional[str] = Query(None, description="Partial search in creditor name"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    business_area_id: Optional[int] = Query(None, description="Filter by business area ID"),
    start_date: Optional[date] = Query(None, description="Start date for filtering"),
    end_date: Optional[date] = Query(None, description="End date for filtering"),
    date_field: str = Query('due_date', description="Date field to use for filtering (due_date, payment_date, issue_date, etc)"),
    min_amount: Optional[float] = Query(None, description="Minimum amount filter"),
    max_amount: Optional[float] = Query(None, description="Maximum amount filter"),
    authorization_status: Optional[str] = Query(None, description="Filter by authorization status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip (pagination)")
):
    """
    Get outcome data (Contas a Pagar) with optional filters

    All filters are optional and can be combined.
    Results are paginated with a maximum of 1000 records per request.
    """
    try:
        # Build filters dictionary
        filters = {
            'company_id': company_id,
            'company_name': company_name,
            'creditor_id': creditor_id,
            'creditor_name': creditor_name,
            'project_id': project_id,
            'business_area_id': business_area_id,
            'start_date': start_date,
            'end_date': end_date,
            'min_amount': min_amount,
            'max_amount': max_amount,
            'authorization_status': authorization_status
        }

        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}

        # Build WHERE clause with dynamic date field
        where_clause, params = build_where_clause(filters, date_field=date_field)

        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM outcome_data WHERE {where_clause}"
        count_result = execute_single(count_query, tuple(params))
        total = count_result['total'] if count_result else 0

        # Get paginated data
        data_query = f"""
            SELECT * FROM outcome_data
            WHERE {where_clause}
            ORDER BY {date_field} DESC, id
            LIMIT %s OFFSET %s
        """
        data = execute_query(data_query, tuple(params + [limit, offset]))

        return ApiResponse(
            success=True,
            total=total,
            count=len(data),
            limit=limit,
            offset=offset,
            data=data
        )

    except Exception as e:
        logger.error(f"Error fetching outcome data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch outcome data: {str(e)}")


@app.get("/api/outcome/{id}", response_model=ApiResponse)
async def get_outcome_by_id(id: str):
    """
    Get a specific outcome record by ID

    ID format: "installment_bill" (e.g., "8_12574")
    """
    try:
        query = "SELECT * FROM outcome_data WHERE id = %s"
        result = execute_single(query, (id,))

        if not result:
            raise HTTPException(status_code=404, detail=f"Outcome record with ID '{id}' not found")

        return ApiResponse(
            success=True,
            data=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching outcome by ID: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch outcome record: {str(e)}")


# Run with: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)