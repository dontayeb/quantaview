'use client'

import { useState, useEffect } from 'react'
import { ArrowDownTrayIcon, CheckCircleIcon, ExclamationCircleIcon, ClipboardIcon, Cog6ToothIcon, BoltIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { UserNav } from '@/components/UserNav'

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
    
    const selectedAccountData = accounts.find(acc => acc.id === accountId)
    if (!selectedAccountData) return

    // Static instructions for pre-compiled EA approach
    const staticInstructions: SetupInstructions = {
      account_name: selectedAccountData.account_name,
      account_number: selectedAccountData.account_number,
      steps: [
        {
          step: 1,
          title: "Download the EA File",
          description: "Download the pre-compiled QuantaView EA file (.ex4 for MT4 or .ex5 for MT5).",
          action: "Click the download button above to save the EA file to your computer"
        },
        {
          step: 2,
          title: "Install in MetaTrader",
          description: "Copy the EA file to your MetaTrader Experts folder and restart the platform.",
          action: "MT4: File → Open Data Folder → MQL4 → Experts\nMT5: File → Open Data Folder → MQL5 → Experts"
        },
        {
          step: 3,
          title: "Enable WebRequest",
          description: "Allow the EA to communicate with QuantaView servers.",
          action: "Tools → Options → Expert Advisors → Allow WebRequest → Add URL below"
        },
        {
          step: 4,
          title: "Attach to Chart",
          description: "Drag the QuantaView EA from Navigator onto any chart and configure parameters.",
          action: "Navigator → Expert Advisors → QuantaView EA → drag to chart"
        },
        {
          step: 5,
          title: "Configure EA Parameters",
          description: "In the EA settings dialog, enter your QuantaView credentials (see values below).",
          action: `Set ApiKey = "${apiKey}" and AccountId = "${accountId}"`
        },
        {
          step: 6,
          title: "Enable Auto Trading",
          description: "Enable auto trading and verify the EA is running with a smiley face icon.",
          action: "Click 'Auto Trading' button in toolbar (should turn green)"
        }
      ],
      troubleshooting: {
        webRequest_error: "Add the API URL to WebRequest whitelist: Tools → Options → Expert Advisors → Allow WebRequest for 'https://grateful-mindfulness-production-868e.up.railway.app'",
        no_logs: "Check the Experts tab in terminal for EA logs. If no logs appear: 1) Verify EA is attached to chart, 2) Auto trading is enabled, 3) Parameters are set correctly",
        api_error: "Common issues: 1) Check API key format (starts with 'qv_'), 2) Verify Account ID matches your QuantaView account, 3) Ensure internet connection is stable"
      }
    }

    setInstructions(staticInstructions)
  }

  const downloadEA = async () => {
    setDownloadLoading(true)
    try {
      // Download EA file directly from public folder
      const filename = 'QuantaView_EA.ex5'
      const url = `/downloads/${filename}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Download failed - EA file not found')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
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
    <div className="min-h-screen bg-dashboard-bg">
      {/* Navigation */}
      <nav className="bg-dashboard-card shadow-dashboard border-b border-gray-100">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-dashboard-text hover:text-primary-600 transition-colors duration-200">
                QuantaView
              </Link>
            </div>
            <div className="flex items-center">
              <UserNav />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto py-8 space-y-6 max-w-4xl px-4 sm:px-6 lg:px-8">
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
              Download the ready-to-use EA file and set your API credentials in the EA parameters
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div className="space-y-1">
                <p className="font-medium text-gray-900">QuantaView_EA.ex5</p>
                <p className="text-sm text-gray-600">
                  Pre-compiled MT5 Expert Advisor - ready to use with any QuantaView account
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
                  <strong>No Setup Required!</strong> Pre-compiled EA file ready for MT4/MT5. 
                  Just install, attach to chart, and enter your API credentials.
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
                  {step.step === 3 && (
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800">
                        https://grateful-mindfulness-production-868e.up.railway.app
                      </code>
                      <button
                        onClick={() => copyToClipboard('https://grateful-mindfulness-production-868e.up.railway.app')}
                        className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        <ClipboardIcon className="h-3 w-3" />
                        Copy URL
                      </button>
                    </div>
                  )}
                  {step.step === 5 && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">API Key:</span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800">
                          {apiKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(apiKey)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          <ClipboardIcon className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Account ID:</span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800">
                          {selectedAccount}
                        </code>
                        <button
                          onClick={() => copyToClipboard(selectedAccount)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          <ClipboardIcon className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
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
    </div>
  )
}