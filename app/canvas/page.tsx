'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/layout/Header'
import Toolbar from '@/components/layout/Toolbar'
import { CanvasState } from '@/types/canvas'

// Dynamically import Canvas with SSR disabled to prevent server-side rendering issues
const Canvas = dynamic(() => import('@/components/canvas/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
})

export default function CanvasPage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [currentTool, setCurrentTool] = useState<CanvasState['tool']>('select')

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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <Header 
        userName={profile?.display_name} 
        onSignOut={handleSignOut} 
      />

      {/* Main Canvas Area */}
      <div className="flex flex-1">
        {/* Toolbar */}
        <Toolbar 
          currentTool={currentTool}
          onToolChange={setCurrentTool}
        />
        
        {/* Canvas */}
        <main className="flex-1 bg-gray-50">
          <Canvas 
            className="h-screen" 
            currentTool={currentTool}
            onToolChange={setCurrentTool}
          />
        </main>
      </div>
    </div>
  )
}
