'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircleIcon, ArrowRightIcon, KeyIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline'
import { quantaAPI, TradingAccount } from '@/lib/api'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

interface APIKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  created_at: string
}

function SearchParamsHandler({ onStepChange }: { onStepChange: (step: string) => void }) {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const step = searchParams.get('step')
    if (step) {
      onStepChange(step)
    }
  }, [searchParams, onStepChange])
  
  return null
}

function OnboardingContent() {
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState('account')
  const [isLoading, setIsLoading] = useState(false)
  
  // Account creation state
  const [accountData, setAccountData] = useState({
    account_name: '',
    account_number: '',
    broker: 'FTMO',
    account_type: 'challenge',
    currency: 'USD',
    starting_balance: 10000,
    password: 'placeholder',
    server: 'Unknown'
  })
  const [createdAccount, setCreatedAccount] = useState<TradingAccount | null>(null)
  
  // API key creation state
  const [apiKeyData, setApiKeyData] = useState({
    name: '',
    scopes: ['trades:write', 'account:read', 'analytics:read']
  })
  const [createdApiKey, setCreatedApiKey] = useState<APIKey & { key?: string } | null>(null)

  const createTradingAccount = async () => {
    try {
      setIsLoading(true)
      
      // Get user ID from localStorage or auth context
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login?redirect=/onboarding')
        return
      }
      
      // Decode user ID from token (simple implementation)
      const payload = JSON.parse(atob(token.split('.')[1]))
      const userId = payload.sub
      
      const accountPayload = {
        ...accountData,
        account_number: parseInt(accountData.account_number),
        user_id: userId
      }
      
      const account = await quantaAPI.createTradingAccount(accountPayload)
      setCreatedAccount(account)
      
      // Auto-generate API key name
      setApiKeyData(prev => ({
        ...prev,
        name: `${accountData.account_name} Integration`
      }))
      
      setCurrentTab('api-key')
    } catch (error) {
      console.error('Failed to create trading account:', error)
      alert('Failed to create trading account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  const createAPIKey = async () => {
    try {
      setIsLoading(true)
      
      const keyPayload = {
        ...apiKeyData,
        trading_account_id: createdAccount?.id
      }
      
      const apiKey = await quantaAPI.createApiKey(keyPayload)
      setCreatedApiKey(apiKey)
      setCurrentTab('download')
    } catch (error) {
      console.error('Failed to create API key:', error)
      alert('Failed to create API key. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccountInputChange = (field: string, value: string | number) => {
    setAccountData(prev => ({ ...prev, [field]: value }))
  }

  const handleStepChange = (step: string) => {
    setCurrentTab(step)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Suspense fallback={null}>
        <SearchParamsHandler onStepChange={handleStepChange} />
      </Suspense>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to QuantaView
          </h1>
          <p className="text-gray-600 text-lg">
            Let's get your MT5 account connected in just 3 steps
          </p>
        </div>

        <div className="space-y-6">
          {/* Progress Tabs */}
          <div className="grid w-full grid-cols-3 bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => setCurrentTab('account')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
                currentTab === 'account' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {createdAccount ? <CheckCircleIcon className="w-4 h-4" /> : <span>1</span>}
              Trading Account
            </button>
            <button 
              onClick={() => createdAccount && setCurrentTab('api-key')}
              disabled={!createdAccount}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
                currentTab === 'api-key' ? 'bg-white shadow text-blue-600' : 
                createdAccount ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              {createdApiKey ? <CheckCircleIcon className="w-4 h-4" /> : <span>2</span>}
              API Key
            </button>
            <button 
              onClick={() => createdApiKey && setCurrentTab('download')}
              disabled={!createdApiKey}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
                currentTab === 'download' ? 'bg-white shadow text-blue-600' : 
                createdApiKey ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>3</span>
              MT5 Setup
            </button>
          </div>

          {/* Step 1: Create Trading Account */}
          {currentTab === 'account' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Your Trading Account</h2>
                <p className="text-gray-600">
                  Connect your FTMO or other prop trading account to QuantaView
                </p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="account_name" className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input
                      id="account_name"
                      type="text"
                      placeholder="e.g., FTMO Challenge #1"
                      value={accountData.account_name}
                      onChange={(e) => handleAccountInputChange('account_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="account_number" className="block text-sm font-medium text-gray-700 mb-1">MT5 Account Number</label>
                    <input
                      id="account_number"
                      type="number"
                      placeholder="e.g., 510266178"
                      value={accountData.account_number}
                      onChange={(e) => handleAccountInputChange('account_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="broker" className="block text-sm font-medium text-gray-700 mb-1">Broker</label>
                    <select
                      id="broker"
                      value={accountData.broker}
                      onChange={(e) => handleAccountInputChange('broker', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="FTMO">FTMO</option>
                      <option value="MyForexFunds">MyForexFunds</option>
                      <option value="TheForexFunder">The Forex Funder</option>
                      <option value="FundedNext">FundedNext</option>
                      <option value="E8Funding">E8 Funding</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="account_type" className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                    <select
                      id="account_type"
                      value={accountData.account_type}
                      onChange={(e) => handleAccountInputChange('account_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="challenge">Challenge</option>
                      <option value="funded">Funded</option>
                      <option value="demo">Demo</option>
                      <option value="live">Live</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      id="currency"
                      value={accountData.currency}
                      onChange={(e) => handleAccountInputChange('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="starting_balance" className="block text-sm font-medium text-gray-700 mb-1">Starting Balance</label>
                    <input
                      id="starting_balance"
                      type="number"
                      value={accountData.starting_balance}
                      onChange={(e) => handleAccountInputChange('starting_balance', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <button 
                  onClick={createTradingAccount}
                  disabled={isLoading || !accountData.account_name || !accountData.account_number}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? 'Creating Account...' : 'Create Trading Account'}
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Create API Key */}
          {currentTab === 'api-key' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Create API Key</h2>
                <p className="text-gray-600">
                  Generate a secure API key for MT5 integration
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="api_key_name" className="block text-sm font-medium text-gray-700 mb-1">API Key Name</label>
                  <input
                    id="api_key_name"
                    type="text"
                    placeholder="e.g., FTMO Challenge #1 Integration"
                    value={apiKeyData.name}
                    onChange={(e) => setApiKeyData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                  <div className="space-y-2">
                    {['trades:write', 'account:read', 'analytics:read'].map((scope) => (
                      <div key={scope} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={apiKeyData.scopes.includes(scope)}
                          readOnly
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{scope}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    These permissions are required for MT5 integration
                  </p>
                </div>
                
                <button 
                  onClick={createAPIKey}
                  disabled={isLoading || !apiKeyData.name}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <KeyIcon className="w-4 h-4 mr-2" />
                  {isLoading ? 'Creating API Key...' : 'Create API Key'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Download & Setup */}
          {currentTab === 'download' && createdAccount && createdApiKey && (
            <OnboardingWizard
              accountId={createdAccount.id}
              apiKey={createdApiKey.key || ''}
              accountName={createdAccount.account_name}
              onComplete={() => {
                router.push('/dashboard?welcome=true')
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return <OnboardingContent />
}