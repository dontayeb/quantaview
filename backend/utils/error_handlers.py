"""
Comprehensive error handling utilities for QuantaView API
"""
import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from pydantic import ValidationError
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class APIError(Exception):
    """Base API exception with structured error information"""
    def __init__(
        self, 
        message: str, 
        status_code: int = 500, 
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or "INTERNAL_ERROR"
        self.details = details or {}
        super().__init__(self.message)

class ValidationError(APIError):
    """Validation error with field-specific details"""
    def __init__(self, message: str, field_errors: Dict[str, str] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            details={"field_errors": field_errors or {}}
        )

class AuthenticationError(APIError):
    """Authentication related errors"""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_ERROR"
        )

class AuthorizationError(APIError):
    """Authorization related errors"""
    def __init__(self, message: str = "Access denied"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="AUTHORIZATION_ERROR"
        )

class NotFoundError(APIError):
    """Resource not found errors"""
    def __init__(self, resource: str, identifier: str = None):
        message = f"{resource} not found"
        if identifier:
            message += f": {identifier}"
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND"
        )

class DatabaseError(APIError):
    """Database related errors"""
    def __init__(self, message: str = "Database operation failed"):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DATABASE_ERROR"
        )

class RateLimitError(APIError):
    """Rate limiting errors"""
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_ERROR"
        )

def create_error_response(
    error_code: str,
    message: str,
    status_code: int = 500,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create standardized error response"""
    response = {
        "error": {
            "code": error_code,
            "message": message,
            "timestamp": "2024-01-01T00:00:00Z",  # Will be replaced with actual timestamp
            "status": status_code
        }
    }
    
    if details:
        response["error"]["details"] = details
    
    if request_id:
        response["error"]["request_id"] = request_id
    
    return response

async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handle custom API errors"""
    logger.error(f"API Error: {exc.error_code} - {exc.message} - Details: {exc.details}")
    
    response = create_error_response(
        error_code=exc.error_code,
        message=exc.message,
        status_code=exc.status_code,
        details=exc.details
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response
    )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions"""
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    
    # Map HTTP status codes to error codes
    error_code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        422: "VALIDATION_ERROR",
        500: "INTERNAL_ERROR"
    }
    
    error_code = error_code_map.get(exc.status_code, "HTTP_ERROR")
    
    response = create_error_response(
        error_code=error_code,
        message=str(exc.detail),
        status_code=exc.status_code
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response
    )

async def validation_exception_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle Pydantic validation errors"""
    logger.error(f"Validation Error: {exc.errors()}")
    
    field_errors = {}
    for error in exc.errors():
        field_name = ".".join(str(loc) for loc in error["loc"])
        field_errors[field_name] = error["msg"]
    
    response = create_error_response(
        error_code="VALIDATION_ERROR",
        message="Request validation failed",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details={"field_errors": field_errors}
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response
    )

async def database_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle database errors"""
    logger.error(f"Database Error: {str(exc)}")
    logger.error(f"Database Error Traceback: {traceback.format_exc()}")
    
    # Handle specific database errors
    if isinstance(exc, IntegrityError):
        message = "Data integrity constraint violated"
        error_code = "INTEGRITY_ERROR"
    else:
        message = "Database operation failed"
        error_code = "DATABASE_ERROR"
    
    response = create_error_response(
        error_code=error_code,
        message=message,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected errors"""
    logger.error(f"Unexpected Error: {str(exc)}")
    logger.error(f"Unexpected Error Traceback: {traceback.format_exc()}")
    
    response = create_error_response(
        error_code="INTERNAL_ERROR",
        message="An unexpected error occurred",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response
    )

def log_request_error(
    endpoint: str,
    method: str,
    error: Exception,
    user_id: Optional[str] = None,
    request_data: Optional[Dict[str, Any]] = None
):
    """Log request errors with context"""
    context = {
        "endpoint": endpoint,
        "method": method,
        "error_type": type(error).__name__,
        "error_message": str(error),
        "user_id": user_id,
        "request_data": request_data
    }
    
    logger.error(f"Request Error: {context}")