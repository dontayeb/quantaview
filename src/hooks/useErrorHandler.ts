/**
 * React hook for handling errors in UI components
 */

import { useState, useCallback } from 'react'
import { 
  AppError, 
  getUserFriendlyMessage, 
  getFieldErrors, 
  isAppError,
  logError 
} from '@/lib/error-handler'

interface UseErrorHandlerReturn {
  error: AppError | null
  fieldErrors: Record<string, string>
  isLoading: boolean
  clearError: () => void
  handleError: (error: any) => void
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: AppError) => void
  ) => Promise<void>
  getUserMessage: () => string
  hasError: boolean
  hasFieldErrors: boolean
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<AppError | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((err: any) => {
    const appError = isAppError(err) ? err : new AppError(
      (err instanceof Error ? err.message : String(err)) || 'An unexpected error occurred'
    )
    setError(appError)
    logError(appError)
  }, [])

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: AppError) => void
  ) => {
    setIsLoading(true)
    clearError()

    try {
      const result = await operation()
      onSuccess?.(result)
    } catch (err) {
      const appError = isAppError(err) ? err : new AppError(
        (err instanceof Error ? err.message : String(err)) || 'An unexpected error occurred'
      )
      setError(appError)
      logError(appError)
      onError?.(appError)
    } finally {
      setIsLoading(false)
    }
  }, [clearError])

  const getUserMessage = useCallback(() => {
    if (!error) return ''
    return getUserFriendlyMessage(error)
  }, [error])

  const fieldErrors = error ? getFieldErrors(error) : {}

  return {
    error,
    fieldErrors,
    isLoading,
    clearError,
    handleError,
    executeWithErrorHandling,
    getUserMessage,
    hasError: !!error,
    hasFieldErrors: Object.keys(fieldErrors).length > 0
  }
}