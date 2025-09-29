"""Pydantic models for Sienge Financial API"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, date


class ApiResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool = True
    total: Optional[int] = None
    count: Optional[int] = None
    limit: Optional[int] = None
    offset: Optional[int] = None
    data: Any


class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = False
    error: str
    detail: Optional[str] = None


class IncomeFilters(BaseModel):
    """Query parameters for income endpoint"""
    company_id: Optional[int] = Field(None, description="Filter by company ID")
    company_name: Optional[str] = Field(None, description="Partial search in company name")
    client_id: Optional[int] = Field(None, description="Filter by client ID")
    client_name: Optional[str] = Field(None, description="Partial search in client name")
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    business_area_id: Optional[int] = Field(None, description="Filter by business area ID")
    start_date: Optional[date] = Field(None, description="Start date filter (due_date >= start_date)")
    end_date: Optional[date] = Field(None, description="End date filter (due_date <= end_date)")
    min_amount: Optional[float] = Field(None, description="Minimum amount filter")
    max_amount: Optional[float] = Field(None, description="Maximum amount filter")
    limit: int = Field(100, ge=1, le=1000, description="Maximum records to return")
    offset: int = Field(0, ge=0, description="Number of records to skip (pagination)")


class OutcomeFilters(BaseModel):
    """Query parameters for outcome endpoint"""
    company_id: Optional[int] = Field(None, description="Filter by company ID")
    company_name: Optional[str] = Field(None, description="Partial search in company name")
    creditor_id: Optional[int] = Field(None, description="Filter by creditor/supplier ID")
    creditor_name: Optional[str] = Field(None, description="Partial search in creditor name")
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    business_area_id: Optional[int] = Field(None, description="Filter by business area ID")
    start_date: Optional[date] = Field(None, description="Start date filter (due_date >= start_date)")
    end_date: Optional[date] = Field(None, description="End date filter (due_date <= end_date)")
    min_amount: Optional[float] = Field(None, description="Minimum amount filter")
    max_amount: Optional[float] = Field(None, description="Maximum amount filter")
    authorization_status: Optional[str] = Field(None, description="Filter by authorization status")
    limit: int = Field(100, ge=1, le=1000, description="Maximum records to return")
    offset: int = Field(0, ge=0, description="Number of records to skip (pagination)")


class HealthCheck(BaseModel):
    """Health check response"""
    status: str = "healthy"
    database: str = "connected"
    timestamp: datetime = Field(default_factory=datetime.now)


class ApiInfo(BaseModel):
    """API information response"""
    name: str = "Sienge Financial API"
    version: str = "1.0.0"
    description: str = "API para consulta de dados financeiros do Sienge"
    endpoints: dict = {
        "income": "/api/income",
        "outcome": "/api/outcome",
        "health": "/api/health",
        "docs": "/docs",
        "redoc": "/redoc"
    }