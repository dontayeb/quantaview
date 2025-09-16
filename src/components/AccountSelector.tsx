'use client'

import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, CheckIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import type { TradingAccount } from '@/lib/supabase'

interface AccountSelectorProps {
  accounts: TradingAccount[]
  selectedAccount: TradingAccount | null
  onSelect: (account: TradingAccount) => void
  loading?: boolean
}

export function AccountSelector({ accounts, selectedAccount, onSelect, loading }: AccountSelectorProps) {
  if (loading) {
    return (
      <div className="w-full max-w-sm">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <BuildingOfficeIcon className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
        <p className="text-yellow-800 font-medium">No Trading Accounts Found</p>
        <p className="text-yellow-600 text-sm">Import some trading data to get started</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <Listbox value={selectedAccount} onChange={onSelect}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm border border-gray-300">
            <span className="block truncate">
              {selectedAccount ? (
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="font-medium">{selectedAccount.account_name}</span>
                  <span className="ml-2 text-gray-500">({selectedAccount.account_number})</span>
                </div>
              ) : (
                <span className="text-gray-400">Select a trading account...</span>
              )}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
              {accounts.map((account) => (
                <Listbox.Option
                  key={account.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                    }`
                  }
                  value={account}
                >
                  {({ selected }) => (
                    <>
                      <div className="block truncate">
                        <div className="flex flex-col">
                          <span className={`font-medium ${selected ? 'text-amber-600' : ''}`}>
                            {account.account_name}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center space-x-2">
                            <span>#{account.account_number}</span>
                            <span>•</span>
                            <span>{account.server}</span>
                            <span>•</span>
                            <span>{account.currency}</span>
                            {account.account_type && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{account.account_type}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}