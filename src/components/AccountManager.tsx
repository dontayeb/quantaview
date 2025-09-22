'use client'

import { useState, useEffect } from 'react'
import { PencilIcon, TrashIcon, XMarkIcon, CheckIcon, ExclamationTriangleIcon, CloudArrowDownIcon, KeyIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { quantaAPI, type TradingAccount } from '@/lib/api'

interface AccountManagerProps {
  accounts: TradingAccount[]
  selectedAccount: TradingAccount | null
  onSelect: (account: TradingAccount) => void
  onAccountsChange: () => void
  loading?: boolean
}

interface EditingAccount {
  id: string
  account_name: string
  account_number: number
  server: string
  broker: string
  currency: string
  account_type: string
  starting_balance: number
}

export function AccountManager({ accounts, selectedAccount, onSelect, onAccountsChange, loading }: AccountManagerProps) {
  const [editingAccount, setEditingAccount] = useState<EditingAccount | null>(null)
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null)
  const [deletingTradesForAccountId, setDeletingTradesForAccountId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeletingTrades, setIsDeletingTrades] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [showApiKeysModal, setShowApiKeysModal] = useState<string | null>(null)
  const [isDownloadingEA, setIsDownloadingEA] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Fetch API keys when component mounts
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const keys = await quantaAPI.getApiKeys()
        setApiKeys(keys)
      } catch (error) {
        console.error('Error fetching API keys:', error)
      }
    }
    fetchApiKeys()
  }, [])

  const handleDownloadEA = async (account: TradingAccount) => {
    // Find an API key for this account
    const accountApiKey = apiKeys.find(key => key.trading_account_id === account.id)
    
    if (!accountApiKey) {
      alert('No API key found for this account. Please create an API key first.')
      return
    }

    setIsDownloadingEA(account.id)
    try {
      const blob = await quantaAPI.downloadEA(account.id, accountApiKey.api_key)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `QuantaView_${account.account_name.replace(/[^a-zA-Z0-9]/g, '_')}.mq5`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading EA:', error)
      alert('Failed to download EA. Please try again.')
    } finally {
      setIsDownloadingEA(null)
    }
  }

  const handleShowApiKeys = async (accountId: string) => {
    setShowApiKeysModal(accountId)
  }

  const handleCopyApiKey = async (apiKey: string) => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopiedKey(apiKey)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (error) {
      console.error('Failed to copy API key:', error)
    }
  }

  const handleEditClick = (account: TradingAccount) => {
    setEditingAccount({
      id: account.id,
      account_name: account.account_name,
      account_number: account.account_number,
      server: account.server,
      broker: account.broker || '',
      currency: account.currency,
      account_type: account.account_type || '',
      starting_balance: account.starting_balance
    })
  }

  const handleCancelEdit = () => {
    setEditingAccount(null)
  }

  const handleSaveEdit = async () => {
    if (!editingAccount) return

    setIsSaving(true)
    try {
      await quantaAPI.updateTradingAccount(editingAccount.id, {
        account_name: editingAccount.account_name,
        account_number: editingAccount.account_number,
        server: editingAccount.server,
        broker: editingAccount.broker || undefined,
        currency: editingAccount.currency,
        account_type: editingAccount.account_type || undefined,
        starting_balance: editingAccount.starting_balance
      })

      setEditingAccount(null)
      onAccountsChange() // Refresh the accounts list
    } catch (error) {
      console.error('Error updating account:', error)
      alert('Failed to update account. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (accountId: string) => {
    setDeletingAccountId(accountId)
  }

  const handleConfirmDelete = async () => {
    if (!deletingAccountId) return

    setIsDeleting(true)
    try {
      await quantaAPI.deleteTradingAccount(deletingAccountId)

      setDeletingAccountId(null)
      
      // If we deleted the selected account, we need to handle account selection
      const isSelectedAccountDeleted = selectedAccount?.id === deletingAccountId
      
      // Refresh the accounts list first
      onAccountsChange()
      
      // After refresh, if the selected account was deleted, the parent component
      // will handle selecting a new account through the useTrades hook
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setDeletingAccountId(null)
  }

  const handleDeleteTradesClick = (accountId: string) => {
    setDeletingTradesForAccountId(accountId)
  }

  const handleConfirmDeleteTrades = async () => {
    if (!deletingTradesForAccountId) return

    setIsDeletingTrades(true)
    try {
      const result = await quantaAPI.deleteAllTrades(deletingTradesForAccountId)
      
      alert(`Successfully deleted ${result.deleted_count} trades for this account.`)
      setDeletingTradesForAccountId(null)
      
      // Refresh data if this is the currently selected account
      if (selectedAccount?.id === deletingTradesForAccountId) {
        onAccountsChange() // This will trigger a refresh of trades data
      }
    } catch (error) {
      console.error('Error deleting trades:', error)
      alert('Failed to delete trades. Please try again.')
    } finally {
      setIsDeletingTrades(false)
    }
  }

  const handleCancelDeleteTrades = () => {
    setDeletingTradesForAccountId(null)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Accounts</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg mb-2">No accounts found</div>
          <div className="text-gray-500 text-sm">Add your first trading account to get started</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Accounts</h3>
      
      <div className="space-y-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className={`border rounded-lg p-4 transition-colors ${
              selectedAccount?.id === account.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {editingAccount?.id === account.id ? (
              // Edit mode
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={editingAccount.account_name}
                      onChange={(e) => setEditingAccount({ ...editingAccount, account_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="number"
                      value={editingAccount.account_number}
                      onChange={(e) => setEditingAccount({ ...editingAccount, account_number: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Server</label>
                    <input
                      type="text"
                      value={editingAccount.server}
                      onChange={(e) => setEditingAccount({ ...editingAccount, server: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Broker</label>
                    <input
                      type="text"
                      value={editingAccount.broker}
                      onChange={(e) => setEditingAccount({ ...editingAccount, broker: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={editingAccount.currency}
                      onChange={(e) => setEditingAccount({ ...editingAccount, currency: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="JPY">JPY</option>
                      <option value="CHF">CHF</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                    <select
                      value={editingAccount.account_type}
                      onChange={(e) => setEditingAccount({ ...editingAccount, account_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select type</option>
                      <option value="demo">Demo</option>
                      <option value="live">Live</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Starting Balance</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingAccount.starting_balance}
                      onChange={(e) => setEditingAccount({ ...editingAccount, starting_balance: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <>
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => onSelect(account)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{account.account_name}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>#{account.account_number}</span>
                          <span>•</span>
                          <span>{account.server}</span>
                          <span>•</span>
                          <span>{account.currency}</span>
                          {account.broker && (
                            <>
                              <span>•</span>
                              <span>{account.broker}</span>
                            </>
                          )}
                          {account.account_type && (
                            <>
                              <span>•</span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                                account.account_type === 'live' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {account.account_type}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => handleDownloadEA(account)}
                      disabled={isDownloadingEA === account.id}
                      className="p-2 text-gray-400 hover:text-green-600 rounded-full hover:bg-green-50 disabled:opacity-50"
                      title="Download EA file"
                    >
                      <CloudArrowDownIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleShowApiKeys(account.id)}
                      className="p-2 text-gray-400 hover:text-purple-600 rounded-full hover:bg-purple-50"
                      title="View API keys"
                    >
                      <KeyIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditClick(account)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                      title="Edit account"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTradesClick(account.id)}
                      className="p-2 text-gray-400 hover:text-orange-600 rounded-full hover:bg-orange-50"
                      title="Delete all trades for this account"
                    >
                      <ExclamationTriangleIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(account.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                      title="Delete account"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {selectedAccount?.id === account.id && (
                  <div className="mt-2 text-sm text-blue-600 font-medium">
                    ✓ Currently selected
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* API Keys Modal */}
      {showApiKeysModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">API Keys for Account</h3>
              <button
                onClick={() => setShowApiKeysModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              {apiKeys
                .filter(key => key.trading_account_id === showApiKeysModal)
                .map((key) => (
                  <div key={key.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{key.name}</div>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(key.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-1">
                          {key.key_prefix}...
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyApiKey(key.key_prefix)}
                        className="flex items-center px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                        disabled
                        title="Full API key not available for security. Use API Keys page to create new keys."
                      >
                        <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                        View Only
                      </button>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs text-gray-500">Scopes: {key.scopes?.join(', ')}</div>
                    </div>
                  </div>
                ))}
              
              {apiKeys.filter(key => key.trading_account_id === showApiKeysModal).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No API keys found for this account
                </div>
              )}
            </div>
            
            <div className="mt-4 space-y-3">
              <div className="text-sm text-gray-600">
                <p>• Full API keys are only shown when first created for security</p>
                <p>• To get your API key for EA setup, visit the <strong>API Keys</strong> page and create a new key</p>
                <p>• Keep your API keys secure and don't share them</p>
              </div>
              <a 
                href="/dashboard/api-keys"
                className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <KeyIcon className="h-4 w-4 mr-2" />
                Manage API Keys
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deletingAccountId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete Account</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this trading account? This action cannot be undone. The trades will remain in the database.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Trades Confirmation Modal */}
      {deletingTradesForAccountId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete All Trades</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete all trades for this account? This action cannot be undone and will permanently remove all trading history.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDeleteTrades}
                disabled={isDeletingTrades}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteTrades}
                disabled={isDeletingTrades}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {isDeletingTrades ? 'Deleting...' : 'Delete All Trades'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}