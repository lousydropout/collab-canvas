import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication | CollabCanvas',
  description: 'Sign in or create an account for CollabCanvas',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Auth Content */}
      <main className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 flex flex-col space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">CollabCanvas</h1>
          <p className="text-sm text-gray-600 mt-2">Real-time collaborative design</p>
        </div>  
        
        {/* Form Content */}
        <div className="flex-1">
          {children}
        </div>
        
        {/* Footer */}
        <footer className="text-center text-xs text-gray-500">
          <p>&copy; 2025 CollabCanvas. Built for collaborative creativity.</p>
        </footer>
      </main>
    </div>
  )
}
