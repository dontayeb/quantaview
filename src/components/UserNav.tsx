'use client'

import { Fragment } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContextRailway'
import { 
  ChevronDownIcon, 
  UserCircleIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  KeyIcon
} from '@heroicons/react/24/outline'
import { ThemeToggle } from './ThemeToggle'

export function UserNav() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (!user) return null

  return (
    <div className="flex items-center space-x-3">
      <ThemeToggle />
      <Menu as="div" className="relative inline-block text-left">
      <div>
        <MenuButton className="flex items-center text-sm rounded-full text-dashboard-textLight hover:text-dashboard-text focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200">
          <span className="sr-only">Open user menu</span>
          <UserCircleIcon className="h-8 w-8" />
          <span className="ml-2 hidden sm:block font-medium">
            {user.full_name || user.email?.split('@')[0]}
          </span>
          <ChevronDownIcon className="ml-1 h-4 w-4" />
        </MenuButton>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-xl bg-dashboard-card shadow-dashboard-lg ring-1 ring-gray-100 focus:outline-none">
          <div className="py-1">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm text-dashboard-textLight">Signed in as</p>
              <p className="text-sm font-medium text-dashboard-text truncate">
                {user.email}
              </p>
            </div>
            
            <MenuItem>
              {({ focus }) => (
                <button
                  onClick={() => router.push('/dashboard/profile')}
                  className={`${
                    focus ? 'bg-primary-50 text-dashboard-text' : 'text-dashboard-textLight'
                  } group flex w-full items-center px-4 py-2 text-sm transition-colors duration-150`}
                >
                  <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  Profile Settings
                </button>
              )}
            </MenuItem>
            
            <MenuItem>
              {({ focus }) => (
                <button
                  onClick={() => router.push('/dashboard/accounts')}
                  className={`${
                    focus ? 'bg-primary-50 text-dashboard-text' : 'text-dashboard-textLight'
                  } group flex w-full items-center px-4 py-2 text-sm transition-colors duration-150`}
                >
                  <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  Manage Accounts
                </button>
              )}
            </MenuItem>
            
            <MenuItem>
              {({ focus }) => (
                <button
                  onClick={() => router.push('/dashboard/api-keys')}
                  className={`${
                    focus ? 'bg-primary-50 text-dashboard-text' : 'text-dashboard-textLight'
                  } group flex w-full items-center px-4 py-2 text-sm transition-colors duration-150`}
                >
                  <KeyIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  API Keys
                </button>
              )}
            </MenuItem>
            
            <div className="border-t border-gray-100">
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={handleSignOut}
                    className={`${
                      focus ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } group flex w-full items-center px-4 py-2 text-sm`}
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                    Sign out
                  </button>
                )}
              </MenuItem>
            </div>
          </div>
        </MenuItems>
      </Transition>
      </Menu>
    </div>
  )
}