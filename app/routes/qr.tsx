import { data, redirect } from 'react-router'
import {
  createClearCookieHeaders,
  handleCookieValidation,
  storeLinkedinUrlAndGetHeaders,
} from '../business/cookies/cookies.server'
import { LinkedinQrDisplay } from '../ui/components/linkedin-qr-display'
import { LinkedinUrlInput } from '../ui/components/linkedin-url-input'
import { MainLayout } from '../ui/layouts/main-layout'
import type { Route } from './+types/qr'

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'LinkedIn QR Code - Share Your Profile' },
    {
      name: 'description',
      content:
        'Your LinkedIn QR code is ready! Download, share, or customize your QR code.',
    },
    {
      name: 'keywords',
      content: 'LinkedIn, QR code, share, download, customize',
    },
    { property: 'og:title', content: 'LinkedIn QR Code Ready' },
    {
      property: 'og:description',
      content: 'Your LinkedIn QR code is ready to share',
    },
    { property: 'og:type', content: 'website' },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  // Handle cookie validation and cleanup
  const cookieValidation = handleCookieValidation(request)

  if (cookieValidation.shouldClearCookie) {
    // Clear corrupted or expired cookies and redirect to home
    const clearHeaders = createClearCookieHeaders()
    return redirect('/', { headers: clearHeaders })
  }

  // If no LinkedIn URL in cookies, redirect to home
  if (!cookieValidation.userData?.linkedinUrl) {
    return redirect('/')
  }

  return data({
    userData: cookieValidation.userData,
    warnings: cookieValidation.warnings,
    errors: cookieValidation.errors,
  })
}

export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url)

  // Handle QR generation API calls (from /qr/generate)
  if (url.pathname === '/qr/generate') {
    const { generateQrCodeServer } = await import('../business/qr/qr.server')

    if (request.method !== 'POST') {
      return data(
        { success: false, error: { message: 'Method not allowed' } },
        { status: 405 }
      )
    }

    try {
      const body = await request.json()
      const { content, config } = body

      if (!content || typeof content !== 'string') {
        return data(
          {
            success: false,
            error: { message: 'Content is required and must be a string' },
          },
          { status: 400 }
        )
      }

      const result = await generateQrCodeServer(content, config || {})

      if (!result.success) {
        return data(
          {
            success: false,
            error: result.error,
          },
          { status: 400 }
        )
      }

      return data({
        success: true,
        data: result.data,
        fromCache: false,
      })
    } catch (error) {
      console.error('QR generation error:', error)
      return data(
        {
          success: false,
          error: {
            message:
              error instanceof Error ? error.message : 'Internal server error',
            code: 'GENERATION_ERROR',
          },
        },
        { status: 500 }
      )
    }
  }

  // Handle form actions for the QR page
  const formData = await request.formData()
  const action = formData.get('_action') as string

  if (action === 'start_over') {
    // Clear cookies and redirect to home
    const clearHeaders = createClearCookieHeaders()
    return redirect('/', { headers: clearHeaders })
  }

  if (action === 'update_url') {
    const linkedinUrl = formData.get('linkedinUrl') as string

    if (!linkedinUrl) {
      return data(
        {
          success: false,
          error: 'LinkedIn URL is required',
        },
        { status: 400 }
      )
    }

    const result = await storeLinkedinUrlAndGetHeaders(request, linkedinUrl)

    if (!result.success) {
      return data(
        {
          success: false,
          error: result.errors[0] || 'Failed to store LinkedIn URL',
          errors: result.errors,
          warnings: result.warnings,
        },
        { status: 400 }
      )
    }

    return data(
      {
        success: true,
        userData: result.userData,
        warnings: result.warnings,
      },
      result.headers
        ? {
            headers: result.headers,
          }
        : undefined
    )
  }

  return data({ success: false, error: 'Invalid action' }, { status: 400 })
}

export default function QrPage({ loaderData }: Route.ComponentProps) {
  const {
    userData,
    warnings = [],
    errors = [],
  } = loaderData as {
    userData: any
    warnings: string[]
    errors: string[]
  }

  const handleUrlSubmit = async (url: string) => {
    const formData = new FormData()
    formData.set('_action', 'update_url')
    formData.set('linkedinUrl', url)

    const response = await fetch('/qr', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to update URL')
    }

    // Reload to get updated data
    window.location.reload()
  }

  const handleStartOver = async () => {
    const formData = new FormData()
    formData.set('_action', 'start_over')

    const response = await fetch('/qr', {
      method: 'POST',
      body: formData,
    })

    // The server will redirect, but in case it doesn't work, fallback to manual redirect
    if (response.redirected) {
      window.location.href = response.url
    } else {
      window.location.href = '/'
    }
  }

  return (
    <MainLayout>
      {/* Debug info for development only */}
      {import.meta.env.DEV && (warnings.length > 0 || errors.length > 0) && (
        <div className="mb-6 space-y-2">
          {warnings.map((warning: string, index: number) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: debug
              key={index}
              className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20"
            >
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                ⚠️ {warning}
              </p>
            </div>
          ))}
          {errors.map((error: string, index: number) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: debug
              key={index}
              className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
            >
              <p className="text-red-800 text-sm dark:text-red-400">
                ❌ {error}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-8">
        {/* QR Code Display - Primary focus */}
        <LinkedinQrDisplay
          linkedinUrl={userData.linkedinUrl.url}
          qrConfig={
            userData.qrConfig
              ? {
                  size: userData.qrConfig.size,
                  errorCorrectionLevel: userData.qrConfig.errorCorrectionLevel,
                  colors: userData.qrConfig.colors,
                }
              : undefined
          }
          showDownloadButton={true}
          showConfigPanel={true}
        />

        {/* Compact Update Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-lg dark:text-white">
                Update LinkedIn URL
              </h2>

              <button
                onClick={handleStartOver}
                className="text-gray-600 text-sm transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                ← Start Over
              </button>
            </div>

            <LinkedinUrlInput
              initialValue={userData.linkedinUrl.url}
              onSubmit={handleUrlSubmit}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
