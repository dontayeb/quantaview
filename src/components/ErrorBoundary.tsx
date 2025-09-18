/**
 * React Error Boundary component for catching and displaying errors
 */

'use client'

import React, { Component, ReactNode } from 'react'
import { AppError, logError } from '@/lib/error-handler'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const appError = new AppError(
      error.message,
      'REACT_ERROR',
      500,
      { stack: error.stack, componentStack: errorInfo.componentStack }
    )
    
    logError(appError, { errorInfo })
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }

      return (
        <ErrorFallback error={this.state.error} reset={this.reset} />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error
  reset: () => void
}

function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <div className="mt-4 text-center">
          <h2 className="text-lg font-medium text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Error Details:</h3>
            <p className="text-xs text-gray-700 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="mt-6 flex space-x-3">
          <button
            onClick={reset}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm font-medium"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  )
}