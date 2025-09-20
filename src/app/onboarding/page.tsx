'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, ArrowRight, Key, Download } from 'lucide-react'
import { quantaAPI } from '@/lib/api'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

interface TradingAccount {
  id: string
  account_name: string
  account_number: number
  broker: string
  account_type: string
  currency: string
  starting_balance: number
}

interface APIKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  created_at: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  // Check if user is coming from a specific step
  useEffect(() => {
    const step = searchParams.get('step')
    if (step) {
      setCurrentTab(step)
    }
  }, [searchParams])

  const createTradingAccount = async () => {
    try {
      setIsLoading(true)
      
      // Get user ID from localStorage or auth context
      const token = localStorage.getItem('token')
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
      
      const account = await quantaAPI.post('/accounts/', accountPayload)
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
      
      const apiKey = await quantaAPI.post('/api-keys/', keyPayload)
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
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

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          {/* Progress Tabs */}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="flex items-center gap-2">
              {createdAccount ? <CheckCircle2 className="w-4 h-4" /> : <span>1</span>}
              Trading Account
            </TabsTrigger>
            <TabsTrigger value="api-key" disabled={!createdAccount} className="flex items-center gap-2">
              {createdApiKey ? <CheckCircle2 className="w-4 h-4" /> : <span>2</span>}
              API Key
            </TabsTrigger>
            <TabsTrigger value="download" disabled={!createdApiKey} className="flex items-center gap-2">
              <span>3</span>
              MT5 Setup
            </TabsTrigger>
          </TabsList>

          {/* Step 1: Create Trading Account */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Create Your Trading Account</CardTitle>
                <p className="text-gray-600">
                  Connect your FTMO or other prop trading account to QuantaView
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account_name">Account Name</Label>
                    <Input
                      id="account_name"
                      placeholder="e.g., FTMO Challenge #1"
                      value={accountData.account_name}
                      onChange={(e) => handleAccountInputChange('account_name', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="account_number">MT5 Account Number</Label>
                    <Input
                      id="account_number"
                      type="number"
                      placeholder="e.g., 510266178"
                      value={accountData.account_number}
                      onChange={(e) => handleAccountInputChange('account_number', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="broker">Broker</Label>
                    <Select 
                      value={accountData.broker} 
                      onValueChange={(value) => handleAccountInputChange('broker', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FTMO">FTMO</SelectItem>
                        <SelectItem value="MyForexFunds">MyForexFunds</SelectItem>
                        <SelectItem value="TheForexFunder">The Forex Funder</SelectItem>
                        <SelectItem value="FundedNext">FundedNext</SelectItem>
                        <SelectItem value="E8Funding">E8 Funding</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="account_type">Account Type</Label>
                    <Select 
                      value={accountData.account_type} 
                      onValueChange={(value) => handleAccountInputChange('account_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="challenge">Challenge</SelectItem>
                        <SelectItem value="funded">Funded</SelectItem>
                        <SelectItem value="demo">Demo</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={accountData.currency} 
                      onValueChange={(value) => handleAccountInputChange('currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="starting_balance">Starting Balance</Label>
                    <Input
                      id="starting_balance"
                      type="number"
                      value={accountData.starting_balance}
                      onChange={(e) => handleAccountInputChange('starting_balance', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={createTradingAccount}
                  disabled={isLoading || !accountData.account_name || !accountData.account_number}
                  className="w-full"
                >
                  {isLoading ? 'Creating Account...' : 'Create Trading Account'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2: Create API Key */}
          <TabsContent value="api-key">
            <Card>
              <CardHeader>
                <CardTitle>Create API Key</CardTitle>
                <p className="text-gray-600">
                  Generate a secure API key for MT5 integration
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="api_key_name">API Key Name</Label>
                  <Input
                    id="api_key_name"
                    placeholder="e.g., FTMO Challenge #1 Integration"
                    value={apiKeyData.name}
                    onChange={(e) => setApiKeyData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>Permissions</Label>
                  <div className="mt-2 space-y-2">
                    {['trades:write', 'account:read', 'analytics:read'].map((scope) => (
                      <div key={scope} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={apiKeyData.scopes.includes(scope)}
                          readOnly
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">{scope}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    These permissions are required for MT5 integration
                  </p>
                </div>
                
                <Button 
                  onClick={createAPIKey}
                  disabled={isLoading || !apiKeyData.name}
                  className="w-full"
                >
                  <Key className="w-4 h-4 mr-2" />
                  {isLoading ? 'Creating API Key...' : 'Create API Key'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 3: Download & Setup */}
          <TabsContent value="download">
            {createdAccount && createdApiKey && (
              <OnboardingWizard
                accountId={createdAccount.id}
                apiKey={createdApiKey.key || ''}
                accountName={createdAccount.account_name}
                onComplete={() => {
                  router.push('/dashboard?welcome=true')
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}