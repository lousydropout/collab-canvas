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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">CollabCanvas</h1>
          <p className="text-sm text-gray-600 mt-2">Real-time collaborative design</p>
        </div>
        
        {/* Auth Content */}
        <main className="w-full max-w-md">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-gray-500">
          <p>&copy; 2025 CollabCanvas. Built for collaborative creativity.</p>
        </footer>
      </div>
    </div>
  )
}
