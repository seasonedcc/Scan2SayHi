import type React from 'react'

export interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-gray-200 border-b bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <span className="font-bold text-sm text-white">QR</span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 text-lg dark:text-white">
                  LinkedIn QR Card
                </h1>
                <p className="text-gray-500 text-xs dark:text-gray-400">
                  Generate QR codes for your LinkedIn profile
                </p>
              </div>
            </div>

            {/* Theme toggle placeholder */}
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm dark:text-gray-400">
                v1.0
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-gray-200 border-t bg-white/50 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-2 text-center">
            <p className="text-gray-600 text-sm dark:text-gray-400">
              Create professional QR codes for your LinkedIn profile
            </p>
            <div className="flex items-center justify-center gap-4 text-gray-500 text-xs dark:text-gray-500">
              <span>Built with React Router v7</span>
              <span>•</span>
              <span>Powered by Tailwind CSS</span>
              <span>•</span>
              <span>Secure & Private</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
