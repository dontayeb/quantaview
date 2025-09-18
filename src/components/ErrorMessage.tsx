/**
 * Reusable error message component for displaying errors in UI
 */

'use client'

import React from 'react'
import { AppError, getUserFriendlyMessage, getFieldErrors } from '@/lib/error-handler'

interface ErrorMessageProps {
  error: AppError | string | null
  className?: string
  showDetails?: boolean
  onDismiss?: () => void
}

export function ErrorMessage({ 
  error, 
  className = '', 
  showDetails = false,
  onDismiss 
}: ErrorMessageProps) {
  if (!error) return null

  const errorObj = typeof error === 'string' 
    ? new AppError(error) 
    : error

  const message = getUserFriendlyMessage(errorObj)
  const fieldErrors = getFieldErrors(errorObj)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  return (
    <div className={`rounded-md bg-red-50 p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {message}
          </h3>
          
          {hasFieldErrors && (
            <div className="mt-2">
              <ul className="list-disc list-inside text-sm text-red-700">
                {Object.entries(fieldErrors).map(([field, fieldError]) => (
                  <li key={field}>
                    <span className="font-medium">{field}:</span> {fieldError}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showDetails && process.env.NODE_ENV === 'development' && (
            <div className="mt-2">
              <p className="text-xs text-red-600">
                <strong>Error Code:</strong> {errorObj.code}
              </p>
              {errorObj.details && (
                <pre className="mt-1 text-xs text-red-600 overflow-x-auto">
                  {JSON.stringify(errorObj.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface FieldErrorProps {
  fieldName: string
  error: AppError | null
  className?: string
}

export function FieldError({ fieldName, error, className = '' }: FieldErrorProps) {
  if (!error) return null

  const fieldErrors = getFieldErrors(error)
  const fieldError = fieldErrors[fieldName]

  if (!fieldError) return null

  return (
    <p className={`mt-1 text-sm text-red-600 ${className}`}>
      {fieldError}
    </p>
  )
}