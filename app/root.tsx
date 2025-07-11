import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router'

import type { Route } from './+types/root'
import './app.css'

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
  // PWA manifest
  { rel: 'manifest', href: '/manifest.json' },
  // Favicon
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { rel: 'icon', type: 'image/png', href: '/favicon.png' },
  // Apple touch icon
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Generate professional QR codes for your LinkedIn profile with Scan2SayHi. Perfect for business cards, networking events, and digital sharing."
        />
        <meta
          name="keywords"
          content="Scan2SayHi, LinkedIn, QR code, business card, networking, professional, generator"
        />
        <meta name="author" content="Scan2SayHi" />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="Scan2SayHi" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Scan2SayHi" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#7c3aed" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Scan2SayHi" />
        <meta property="og:locale" content="en_US" />

        <Meta />
        <Links />
      </head>
      <body className="h-full bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!'
  let details = 'An unexpected error occurred.'
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? 'Page Not Found' : 'Application Error'
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      <main className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <div className="space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <span className="text-3xl text-red-600 dark:text-red-400">
                {isRouteErrorResponse(error) && error.status === 404
                  ? '🔍'
                  : '⚠️'}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="font-bold text-3xl text-gray-900 dark:text-white">
                {message}
              </h1>
              <p className="text-gray-600 text-lg dark:text-gray-400">
                {details}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Try Again
            </button>
            <a
              href="/"
              className="rounded-lg bg-gray-100 px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            >
              Go Home
            </a>
          </div>

          {stack && (
            <details className="mt-8 text-left">
              <summary className="cursor-pointer text-gray-500 text-sm hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                Show Technical Details
              </summary>
              <pre className="mt-4 overflow-x-auto rounded-lg border bg-gray-50 p-4 text-xs dark:bg-gray-800">
                <code className="text-gray-800 dark:text-gray-200">
                  {stack}
                </code>
              </pre>
            </details>
          )}
        </div>
      </main>
    </div>
  )
}
