'use client'

import { useState, useEffect } from 'react'
import { ArrowDownTrayIcon, CheckCircleIcon, ExclamationCircleIcon, ClipboardIcon, Cog6ToothIcon, BoltIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface TradingAccount {
  id: string
  account_name: string
  account_number: string
  broker: string
}

interface SetupStep {
  step: number
  title: string
  description: string
  action: string
}

interface SetupInstructions {
  account_name: string
  account_number: string
  steps: SetupStep[]
  troubleshooting: {
    webRequest_error: string
    no_logs: string
    api_error: string
  }
}

export default function EASetupPage() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [instructions, setInstructions] = useState<SetupInstructions | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [toast, setToast] = useState<{title: string, description: string, variant?: string} | null>(null)

  const showToast = (title: string, description: string, variant: string = 'default') => {
    setToast({ title, description, variant })
    setTimeout(() => setToast(null), 5000)
  }

  useEffect(() => {
    fetchAccounts()
    fetchApiKey()
  }, [])

  const fetchAccounts = async () => {
    try {
      // Mock account for demo
      const mockAccounts = [
        {
          id: 'ca02be81-8de8-4129-8ddc-4d14cd8cebff',
          account_name: 'FTMO',
          account_number: '510266178',
          broker: 'FTMO'
        }
      ]
      setAccounts(mockAccounts)
      if (mockAccounts.length > 0) {
        setSelectedAccount(mockAccounts[0].id)
        fetchInstructions(mockAccounts[0].id)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      showToast("Error", "Failed to load trading accounts", "destructive")
    }
  }

  const fetchApiKey = async () => {
    try {
      setApiKey('qv_test_1234567890abcdef')
    } catch (error) {
      console.error('Error fetching API key:', error)
    }
  }

  const fetchInstructions = async (accountId: string) => {
    if (!accountId) return
    
    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${apiUrl}/api/v1/ea/setup-instructions/${accountId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch setup instructions')
      }
      
      const data = await response.json()
      setInstructions(data)
    } catch (error) {
      console.error('Error fetching instructions:', error)
      showToast("Error", "Failed to load setup instructions", "destructive")
    } finally {
      setLoading(false)
    }
  }

  const downloadEA = async () => {
    if (!selectedAccount || !apiKey) {
      showToast("Missing Information", "Please select an account and ensure you have an API key", "destructive")
      return
    }

    setDownloadLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(
        `${apiUrl}/api/v1/ea/download/${selectedAccount}?api_key=${apiKey}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Download failed')
      }

      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : 'QuantaView_EA.mq5'

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast("Download Successful", `${filename} has been downloaded to your computer`)
    } catch (error: any) {
      console.error('Download error:', error)
      showToast("Download Failed", error.message || "Failed to download EA file", "destructive")
    } finally {
      setDownloadLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast("Copied", "Copied to clipboard")
  }

  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount)

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg ${
          toast.variant === 'destructive' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <div className="font-medium">{toast.title}</div>
          <div className="text-sm opacity-90">{toast.description}</div>
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">EA Setup & Download</h1>
        <p className="text-gray-600">
          Download your pre-configured Expert Advisor and connect your MT5 account to QuantaView
        </p>
      </div>

      {/* Account Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Cog6ToothIcon className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Select Trading Account</h2>
          </div>
          <p className="text-gray-600 mt-1">
            Choose which trading account you want to connect to QuantaView
          </p>
        </div>
        <div className="p-6">
          {accounts.length > 0 ? (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedAccount === account.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => {
                    setSelectedAccount(account.id)
                    fetchInstructions(account.id)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{account.account_name}</h3>
                      <p className="text-sm text-gray-600">
                        Account: {account.account_number} • Broker: {account.broker}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedAccount === account.id 
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {selectedAccount === account.id ? "Selected" : "Select"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ExclamationCircleIcon className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-800">
                  No trading accounts found. Please create a trading account first.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Download Section */}
      {selectedAccountData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ArrowDownTrayIcon className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Download Pre-Configured EA</h2>
            </div>
            <p className="text-gray-600 mt-1">
              Your EA is automatically configured for {selectedAccountData.account_name} - no manual setup required!
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div className="space-y-1">
                <p className="font-medium text-gray-900">QuantaView_{selectedAccountData.account_name}.mq5</p>
                <p className="text-sm text-gray-600">
                  Pre-configured for account {selectedAccountData.account_number}
                </p>
              </div>
              <button 
                onClick={downloadEA} 
                disabled={downloadLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {downloadLoading ? 'Downloading...' : 'Download EA'}
              </button>
            </div>

            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <BoltIcon className="h-4 w-4 text-green-600" />
                <div className="text-green-800">
                  <strong>Zero Configuration Required!</strong> Your API key and account ID are 
                  already embedded in the downloaded file. Just compile and attach to any chart.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      {instructions && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Setup Instructions</h2>
            <p className="text-gray-600 mt-1">
              Follow these steps to install and configure your QuantaView EA
            </p>
          </div>
          <div className="p-6 space-y-6">
            {instructions.steps.map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                  {step.step}
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-medium text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-mono text-gray-800">{step.action}</p>
                  </div>
                  {step.step === 2 && (
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800">
                        https://grateful-mindfulness-production-868e.up.railway.app
                      </code>
                      <button
                        onClick={() => copyToClipboard('https://grateful-mindfulness-production-868e.up.railway.app')}
                        className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        <ClipboardIcon className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Troubleshooting */}
      {instructions && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ExclamationCircleIcon className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Troubleshooting</h2>
            </div>
            <p className="text-gray-600 mt-1">
              Common issues and their solutions
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-900">WebRequest Error</h4>
              <p className="text-sm text-gray-600">{instructions.troubleshooting.webRequest_error}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900">No Logs Appearing</h4>
              <p className="text-sm text-gray-600">{instructions.troubleshooting.no_logs}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900">API Connection Error</h4>
              <p className="text-sm text-gray-600">{instructions.troubleshooting.api_error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Support */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Need Help?</h2>
          <p className="text-gray-600 mt-1">
            Having trouble with the setup? We're here to help!
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <a 
              href="mailto:support@quantaview.ai" 
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ExclamationCircleIcon className="h-4 w-4" />
              Contact Support
            </a>
            <Link 
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}