'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export default function CanvasPage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (prevents flash)
  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    console.log('Starting sign out process...')
    await signOut()
    console.log('Sign out completed, redirecting...')
    // Immediate redirect - let root page handle auth routing
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">CollabCanvas</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {profile && (
                <span className="text-sm text-gray-600">
                  Welcome, {profile.display_name}!
                </span>
              )}
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                size="sm"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Canvas Area - Placeholder */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border min-h-[600px] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Canvas Coming Soon!</h2>
            <p className="text-gray-600 mb-4">
              This is where the collaborative canvas will be implemented.
            </p>
            <div className="text-sm text-gray-500">
              <p><strong>User ID:</strong> {user.id}</p>
              {profile && (
                <>
                  <p><strong>Display Name:</strong> {profile.display_name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
