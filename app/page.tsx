'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Redirect authenticated users to canvas
        router.push('/canvas')
      } else {
        // Redirect unauthenticated users to login
        router.push('/login')
      }
    }
  }, [user, loading, router])

  // Show loading state while determining auth status
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Loading CollabCanvas...</p>
        <p className="mt-1 text-xs text-gray-500">Initializing authentication</p>
        <p className="mt-1 text-xs text-gray-400">If this takes more than 10 seconds, check the browser console for errors</p>
      </div>
    </div>
  )
}
