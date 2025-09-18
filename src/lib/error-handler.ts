/**
 * Comprehensive error handling utilities for QuantaView frontend
 */

export interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    timestamp?: string;
    status: number;
    details?: {
      field_errors?: Record<string, string>;
      [key: string]: any;
    };
    request_id?: string;
  };
}

export interface ErrorContext {
  endpoint?: string;
  method?: string;
  requestData?: any;
  userId?: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    status: number = 500,
    details?: any,
    context?: ErrorContext
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.context = context;
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network connection failed', context?: ErrorContext) {
    super(message, 'NETWORK_ERROR', 0, undefined, context);
  }
}

export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string>;

  constructor(
    message: string = 'Validation failed',
    fieldErrors: Record<string, string> = {},
    context?: ErrorContext
  ) {
    super(message, 'VALIDATION_ERROR', 422, { fieldErrors }, context);
    this.fieldErrors = fieldErrors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: ErrorContext) {
    super(message, 'AUTHENTICATION_ERROR', 401, undefined, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context?: ErrorContext) {
    super(message, 'AUTHORIZATION_ERROR', 403, undefined, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', context?: ErrorContext) {
    super(`${resource} not found`, 'NOT_FOUND', 404, undefined, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: ErrorContext) {
    super(message, 'RATE_LIMIT_ERROR', 429, undefined, context);
  }
}

export class ServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: ErrorContext) {
    super(message, 'SERVER_ERROR', 500, undefined, context);
  }
}

/**
 * Parse API error response and create appropriate error instance
 */
export function parseAPIError(
  response: any,
  context?: ErrorContext
): AppError {
  // Handle network errors
  if (!response) {
    return new NetworkError('No response received', context);
  }

  // Handle Response objects
  if (response instanceof Response) {
    if (!response.ok) {
      const status = response.status;
      const statusText = response.statusText;

      switch (status) {
        case 400:
          return new ValidationError('Bad request', {}, context);
        case 401:
          return new AuthenticationError('Authentication required', context);
        case 403:
          return new AuthorizationError('Access forbidden', context);
        case 404:
          return new NotFoundError('Resource', context);
        case 429:
          return new RateLimitError('Too many requests', context);
        case 500:
        case 502:
        case 503:
        case 504:
          return new ServerError(`Server error: ${statusText}`, context);
        default:
          return new AppError(`HTTP ${status}: ${statusText}`, 'HTTP_ERROR', status, undefined, context);
      }
    }
  }

  // Handle structured API error responses
  if (response.error) {
    const { code, message, status, details } = response.error;

    switch (code) {
      case 'VALIDATION_ERROR':
        return new ValidationError(
          message,
          details?.field_errors || {},
          context
        );
      case 'AUTHENTICATION_ERROR':
        return new AuthenticationError(message, context);
      case 'AUTHORIZATION_ERROR':
        return new AuthorizationError(message, context);
      case 'NOT_FOUND':
        return new NotFoundError(message.replace(' not found', ''), context);
      case 'RATE_LIMIT_ERROR':
        return new RateLimitError(message, context);
      case 'DATABASE_ERROR':
      case 'SERVER_ERROR':
      case 'INTERNAL_ERROR':
        return new ServerError(message, context);
      default:
        return new AppError(message, code, status, details, context);
    }
  }

  // Handle generic error objects
  if (response.message) {
    return new AppError(response.message, 'GENERIC_ERROR', 500, undefined, context);
  }

  // Handle string errors
  if (typeof response === 'string') {
    return new AppError(response, 'GENERIC_ERROR', 500, undefined, context);
  }

  // Fallback for unknown error types
  return new AppError('An unknown error occurred', 'UNKNOWN_ERROR', 500, response, context);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Please check your internet connection and try again.';
    
    case 'AUTHENTICATION_ERROR':
      return 'Please check your credentials and try again.';
    
    case 'AUTHORIZATION_ERROR':
      return 'You don\'t have permission to perform this action.';
    
    case 'VALIDATION_ERROR':
      if (error.details?.fieldErrors) {
        const fieldErrors = Object.values(error.details.fieldErrors) as string[];
        return fieldErrors.length > 0 ? fieldErrors[0] : 'Please check your input and try again.';
      }
      return 'Please check your input and try again.';
    
    case 'NOT_FOUND':
      return 'The requested resource was not found.';
    
    case 'RATE_LIMIT_ERROR':
      return 'Too many requests. Please wait a moment and try again.';
    
    case 'SERVER_ERROR':
    case 'DATABASE_ERROR':
      return 'Server is temporarily unavailable. Please try again later.';
    
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Log error for debugging and monitoring
 */
export function logError(error: AppError, additionalContext?: any): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: error.message,
    code: error.code,
    status: error.status,
    stack: error.stack,
    context: error.context,
    details: error.details,
    additionalContext,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
    url: typeof window !== 'undefined' ? window.location.href : 'SSR',
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('AppError:', errorLog);
  }

  // In production, you might want to send to error monitoring service
  // Example: Sentry, LogRocket, etc.
  // if (process.env.NODE_ENV === 'production') {
  //   sendToErrorMonitoring(errorLog);
  // }
}

/**
 * Retry logic for network requests
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  context?: ErrorContext
): Promise<T> {
  let lastError: AppError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof AppError ? error : parseAPIError(error, context);
      
      // Don't retry client errors (4xx)
      if (lastError.status >= 400 && lastError.status < 500) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract field errors for form validation
 */
export function getFieldErrors(error: AppError): Record<string, string> {
  if (error instanceof ValidationError) {
    return error.fieldErrors;
  }
  
  if (error.details?.field_errors) {
    return error.details.field_errors;
  }
  
  return {};
}