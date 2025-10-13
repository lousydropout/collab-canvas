'use client'

import { Button } from '@/components/ui/button'

interface HeaderProps {
  userName?: string
  onSignOut?: () => void
}

export default function Header({ userName, onSignOut }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">CollabCanvas</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {userName && (
              <span className="text-sm text-gray-600">
                Welcome, {userName}!
              </span>
            )}
            {onSignOut && (
              <Button 
                variant="outline" 
                onClick={onSignOut}
                size="sm"
                className="cursor-pointer"
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
