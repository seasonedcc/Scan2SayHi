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
    { title: 'Scan2SayHi - Your LinkedIn QR Code' },
    {
      name: 'description',
      content:
        'Your LinkedIn QR code is ready! Download, share, or customize your QR code with Scan2SayHi.',
    },
    {
      name: 'keywords',
      content: 'Scan2SayHi, LinkedIn, QR code, share, download, customize',
    },
    { property: 'og:title', content: 'Scan2SayHi - LinkedIn QR Code Ready' },
    {
      property: 'og:description',
      content: 'Your LinkedIn QR code is ready to share with Scan2SayHi',
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

  // Generate QR code on server side
  const { generateQrCodeServer } = await import('../business/qr/qr.server')

  try {
    const qrResult = await generateQrCodeServer(
      cookieValidation.userData.linkedinUrl.url,
      cookieValidation.userData.qrConfig || {}
    )

    return data({
      userData: cookieValidation.userData,
      warnings: cookieValidation.warnings,
      errors: cookieValidation.errors,
      qrCode: qrResult.success ? qrResult.data : null,
      qrError: qrResult.success ? null : qrResult.error,
    })
  } catch (error) {
    // Fallback if server-side QR generation fails
    return data({
      userData: cookieValidation.userData,
      warnings: [
        ...cookieValidation.warnings,
        'QR code generation failed, will retry on client',
      ],
      errors: cookieValidation.errors,
      qrCode: null,
      qrError: `QR generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}

export async function action({ request }: Route.ActionArgs) {
  // Handle form actions for the QR page
  const formData = await request.formData()
  const action = formData.get('_action') as string

  if (action === 'start_over') {
    // Clear cookies and redirect to home
    const clearHeaders = createClearCookieHeaders()
    return redirect('/', { headers: clearHeaders })
  }

  if (action === 'retry_qr') {
    // Just reload the page to retry QR generation
    return redirect('/qr')
  }

  if (action === 'update_config') {
    const size = Number(formData.get('size')) || 256
    const errorCorrectionLevel =
      (formData.get('errorCorrectionLevel') as 'L' | 'M' | 'Q' | 'H') || 'M'
    const darkColor =
      (formData.get('darkColorText') as string) ||
      (formData.get('darkColor') as string) ||
      '#000000'
    const lightColor =
      (formData.get('lightColorText') as string) ||
      (formData.get('lightColor') as string) ||
      '#FFFFFF'

    // Get current user data from cookies
    const cookieValidation = handleCookieValidation(request)
    if (!cookieValidation.userData?.linkedinUrl) {
      return redirect('/')
    }

    // Import cookie manager functions
    const { updateQrConfigAndGetHeaders } = await import(
      '../business/cookies/cookies.server'
    )

    const result = await updateQrConfigAndGetHeaders(request, {
      size,
      errorCorrectionLevel,
      colors: {
        dark: darkColor,
        light: lightColor,
      },
    })

    if (!result.success) {
      return data(
        {
          success: false,
          error: result.errors[0] || 'Failed to update QR config',
          errors: result.errors,
          warnings: result.warnings,
        },
        { status: 400 }
      )
    }

    // Redirect to reload the page with new QR code
    return redirect(
      '/qr',
      result.headers ? { headers: result.headers } : undefined
    )
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
    qrCode,
    qrError,
  } = loaderData as {
    userData: any
    warnings: string[]
    errors: string[]
    qrCode: any
    qrError: any
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
          qrCode={qrCode}
          qrError={qrError}
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
