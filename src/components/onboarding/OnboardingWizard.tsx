'use client'

import { useState, useEffect } from 'react'
import { CheckCircleIcon, CloudArrowDownIcon, ArrowTopRightOnSquareIcon, ExclamationTriangleIcon, PlayIcon } from '@heroicons/react/24/outline'
import { quantaAPI } from '@/lib/api'

interface OnboardingStep {
  step: number
  title: string
  description: string
  action: string
  completed?: boolean
}

interface OnboardingWizardProps {
  accountId: string
  apiKey: string
  accountName: string
  onComplete?: () => void
}

export default function OnboardingWizard({ 
  accountId, 
  apiKey, 
  accountName, 
  onComplete 
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [setupInstructions, setSetupInstructions] = useState<{
    steps: OnboardingStep[]
    troubleshooting: Record<string, string>
  } | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    fetchSetupInstructions()
  }, [accountId])

  const fetchSetupInstructions = async () => {
    try {
      console.log('Fetching setup instructions for account ID:', accountId)
      
      if (!accountId) {
        console.error('No account ID provided to OnboardingWizard')
        return
      }
      
      const instructions = await quantaAPI.get<{
        steps: OnboardingStep[]
        troubleshooting: Record<string, string>
      }>(`/api/v1/ea/setup-instructions/${accountId}`)
      console.log('Setup instructions fetched successfully:', instructions)
      setSetupInstructions(instructions)
    } catch (error) {
      console.error('Failed to fetch setup instructions:', error)
      console.error('Error details:', error)
    }
  }

  const downloadEA = async () => {
    try {
      setIsDownloading(true)
      
      // Download the pre-compiled EA directly
      const link = document.createElement('a')
      link.href = '/downloads/QuantaViewSync.ex5'
      link.download = 'QuantaViewSync.ex5'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Mark step as completed
      markStepCompleted(1)
      
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const markStepCompleted = (stepNumber: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev)
      newSet.add(stepNumber)
      return newSet
    })
    if (stepNumber === currentStep && stepNumber < 4) {
      setCurrentStep(stepNumber + 1)
    }
  }

  const openMT5Settings = () => {
    // This would ideally open MT5 settings, but we can only provide instructions
    markStepCompleted(2)
  }

  const finishOnboarding = () => {
    markStepCompleted(4)
    onComplete?.()
  }

  if (!setupInstructions) {
    return <div className="text-center py-8">Loading setup instructions...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-2">
          <PlayIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">MT5 Integration Setup</h2>
        </div>
        <p className="text-gray-600">
          Get your {accountName} account connected to QuantaView in 5 simple steps
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                ${completedSteps.has(step) 
                  ? 'bg-green-100 text-green-700 border-2 border-green-200' 
                  : step === currentStep
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                  : 'bg-gray-100 text-gray-500 border-2 border-gray-200'
                }
              `}>
                {completedSteps.has(step) ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  step
                )}
              </div>
              {step < 4 && (
                <div className={`
                  w-16 h-1 mx-2
                  ${completedSteps.has(step) ? 'bg-green-200' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-gray-600">
          Step {currentStep} of 4 • {completedSteps.size}/4 completed
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {setupInstructions.steps.map((step, index) => (
          <div key={step.step} className={`
            bg-white rounded-lg shadow p-6
            ${step.step === currentStep ? 'ring-2 ring-blue-200 border-blue-200' : ''}
            ${completedSteps.has(step.step) ? 'bg-green-50 border-green-200' : ''}
          `}>
            <div className="flex items-start gap-4">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0
                ${completedSteps.has(step.step) 
                  ? 'bg-green-100 text-green-700' 
                  : step.step === currentStep
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
                }
              `}>
                {completedSteps.has(step.step) ? (
                  <CheckCircleIcon className="w-4 h-4" />
                ) : (
                  step.step
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-gray-600 mb-4">{step.description}</p>
                <p className="text-sm text-gray-800 mb-4 bg-gray-50 p-3 rounded">
                  <strong>Action:</strong> {step.action}
                </p>
                
                {/* Step-specific actions */}
                {step.step === 1 && (
                  <button 
                    onClick={downloadEA}
                    disabled={isDownloading || completedSteps.has(1)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <CloudArrowDownIcon className="w-4 h-4 mr-2" />
                    {isDownloading ? 'Preparing Download...' : 'Download Your EA'}
                  </button>
                )}
                
                {step.step === 2 && (
                  <div className="space-y-2">
                    <button 
                      onClick={openMT5Settings}
                      disabled={completedSteps.has(2)}
                      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
                      I've Added the URL
                    </button>
                    <div className="text-xs text-gray-500">
                      Add this URL: <code className="bg-gray-100 px-2 py-1 rounded">
                        https://grateful-mindfulness-production-868e.up.railway.app
                      </code>
                    </div>
                  </div>
                )}
                
                {step.step === 3 && (
                  <button 
                    onClick={() => markStepCompleted(3)}
                    disabled={completedSteps.has(3)}
                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    EA Attached to Chart
                  </button>
                )}
                
                {step.step === 4 && (
                  <button 
                    onClick={finishOnboarding}
                    disabled={completedSteps.has(5)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    Complete Setup
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Troubleshooting */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Common Issues</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(setupInstructions.troubleshooting).map(([issue, solution]) => (
            <div key={issue} className="p-3 bg-amber-50 border border-amber-200 rounded">
              <div className="font-medium text-amber-800 capitalize">
                {issue.replace('_', ' ')}: 
              </div>
              <div className="text-amber-700">{solution}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Success State */}
      {completedSteps.size === 4 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-800 mb-2">
            🎉 Setup Complete!
          </h3>
          <p className="text-green-700 mb-4">
            Your {accountName} account is now connected to QuantaView. 
            Your trades will sync automatically.
          </p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  )
}