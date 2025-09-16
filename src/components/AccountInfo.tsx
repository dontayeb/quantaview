'use client'

import { TradingAccount } from '@/lib/supabase'
import { DollarSign, TrendingUp, Wallet, Shield } from 'lucide-react'

interface AccountInfoProps {
  account: TradingAccount
}

export function AccountInfo({ account }: AccountInfoProps) {
  const marginLevel = account.margin_level || 0
  const balance = account.balance || account.starting_balance || 0
  const equity = account.equity || balance
  const freeMargin = account.free_margin || 0

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
        <span className="text-sm text-gray-500">#{account.account_number}</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Balance</p>
            <p className="text-lg font-semibold text-gray-900">
              {balance.toFixed(2)} {account.currency}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Equity</p>
            <p className="text-lg font-semibold text-gray-900">
              {equity.toFixed(2)} {account.currency}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Wallet className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Free Margin</p>
            <p className="text-lg font-semibold text-gray-900">
              {freeMargin.toFixed(2)} {account.currency}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Shield className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Margin Level</p>
            <p className={`text-lg font-semibold ${
              marginLevel > 100 ? 'text-green-600' : marginLevel > 50 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {marginLevel.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Server: {account.server}</span>
          <span>Broker: {account.company}</span>
        </div>
      </div>
    </div>
  )
}