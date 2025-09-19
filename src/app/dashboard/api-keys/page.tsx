'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContextRailway'
import { quantaAPI } from '@/lib/api'
import { 
  KeyIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { UserNav } from '@/components/UserNav'
import { EAIntegrationGuide } from '@/components/EAIntegrationGuide'

interface APIKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  trading_account_id?: string
  is_active: boolean
  last_used_at?: string
  expires_at?: string
  days_until_expiry?: number
  created_at: string
}

interface APIKeyWithSecret extends APIKey {
  api_key: string
}

interface ScopeInfo {
  scope: string
  description: string
}

interface ScopePreset {
  name: string
  description: string
  scopes: string[]
}

export default function APIKeysPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [scopes, setScopes] = useState<ScopeInfo[]>([])
  const [presets, setPresets] = useState<Record<string, ScopePreset>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newApiKey, setNewApiKey] = useState<APIKeyWithSecret | null>(null)
  const [showSecret, setShowSecret] = useState(false)

  // Form state
  const [keyName, setKeyName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [selectedPreset, setSelectedPreset] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(365)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchApiKeys()
      fetchScopes()
      fetchPresets()
    }
  }, [user])

  const fetchApiKeys = async () => {
    try {
      const data = await quantaAPI.getApiKeys()
      setApiKeys(data)
    } catch (error) {
      console.error('Error fetching API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchScopes = async () => {
    try {
      const data = await quantaAPI.getApiKeyScopes()
      setScopes(data)
    } catch (error) {
      console.error('Error fetching scopes:', error)
    }
  }

  const fetchPresets = async () => {
    try {
      const data = await quantaAPI.getApiKeyPresets()
      setPresets(data)
    } catch (error) {
      console.error('Error fetching presets:', error)
    }
  }

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey)
    if (presetKey && presets[presetKey]) {
      setSelectedScopes(presets[presetKey].scopes)
    }
  }

  const handleCreateApiKey = async () => {
    console.log('Starting API key creation...')
    try {
      console.log('Form data:', {
        name: keyName,
        scopes: selectedScopes,
        expires_in_days: expiresInDays
      })
      
      const newKey = await quantaAPI.createApiKey({
        name: keyName,
        scopes: selectedScopes,
        expires_in_days: expiresInDays
      })
      
      console.log('API key created successfully:', newKey)
      setNewApiKey(newKey)
      setShowCreateModal(false)
      fetchApiKeys()
      
      // Reset form
      setKeyName('')
      setSelectedScopes([])
      setSelectedPreset('')
      setExpiresInDays(365)
    } catch (error) {
      console.error('Error creating API key:', error)
      alert(`Failed to create API key: ${error}`)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    try {
      await quantaAPI.revokeApiKey(keyId)
      fetchApiKeys()
    } catch (error) {
      console.error('Error revoking API key:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (apiKey: APIKey) => {
    if (!apiKey.is_active) return 'text-red-600 bg-red-100'
    if (apiKey.days_until_expiry && apiKey.days_until_expiry < 30) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getStatusText = (apiKey: APIKey) => {
    if (!apiKey.is_active) return 'Revoked'
    if (apiKey.days_until_expiry && apiKey.days_until_expiry < 30) return `Expires in ${apiKey.days_until_expiry} days`
    return 'Active'
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">QuantaView</h1>
            </div>
            <div className="flex items-center">
              <UserNav />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
              <p className="text-gray-600">Manage your API keys for EA integration and external access</p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create API Key
            </button>
          </div>

          {/* New API Key Alert */}
          {newApiKey && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start">
                <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-green-800 mb-2">
                    API Key Created Successfully!
                  </h3>
                  <p className="text-green-700 mb-4">
                    Your new API key has been generated. Make sure to copy it now - you won't be able to see it again.
                  </p>
                  
                  <div className="bg-white border border-green-200 rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Key
                        </label>
                        <div className="flex items-center">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {showSecret ? newApiKey.api_key : '•'.repeat(35)}
                          </code>
                          <button
                            onClick={() => setShowSecret(!showSecret)}
                            className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                          >
                            {showSecret ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(newApiKey.api_key)}
                            className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setNewApiKey(null)}
                    className="mt-4 text-sm text-green-600 hover:text-green-500"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* API Keys List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Your API Keys</h3>
            </div>
            
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="p-6 text-center">
                <KeyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No API keys yet</h3>
                <p className="text-gray-600 mb-4">Create your first API key to start integrating with your EA or external applications.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Your First API Key
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h4 className="text-lg font-medium text-gray-900">{apiKey.name}</h4>
                          <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(apiKey)}`}>
                            {getStatusText(apiKey)}
                          </span>
                        </div>
                        
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Key:</span> {apiKey.key_prefix}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Scopes:</span> {apiKey.scopes.join(', ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Created:</span> {formatDate(apiKey.created_at)}
                          </p>
                          {apiKey.last_used_at && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Last used:</span> {formatDate(apiKey.last_used_at)}
                            </p>
                          )}
                          {apiKey.expires_at && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Expires:</span> {formatDate(apiKey.expires_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {apiKey.is_active && (
                          <button
                            onClick={() => handleRevokeKey(apiKey.id)}
                            className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EA Integration Guide */}
          <EAIntegrationGuide 
            apiKey={newApiKey?.api_key}
            tradingAccountId="your-trading-account-id"
          />
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New API Key</h3>
              
              <div className="space-y-4">
                {/* Key Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., My EA Integration"
                  />
                </div>

                {/* Preset Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quick Setup (Optional)
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a preset...</option>
                    {Object.entries(presets).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.name} - {preset.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scopes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    {scopes.map((scope) => (
                      <label key={scope.scope} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.scope)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScopes([...selectedScopes, scope.scope])
                            } else {
                              setSelectedScopes(selectedScopes.filter(s => s !== scope.scope))
                            }
                            setSelectedPreset('') // Clear preset when manually changing
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">{scope.scope}</span>
                        <span className="ml-2 text-sm text-gray-500">- {scope.description}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expires In (Days)
                  </label>
                  <input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                    min="1"
                    max="3650"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Default: 365 days (1 year)
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateApiKey}
                  disabled={!keyName || selectedScopes.length === 0}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Create API Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}