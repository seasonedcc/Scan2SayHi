import { data, redirect, useSubmit } from 'react-router'
import {
  createClearCookieHeaders,
  handleCookieValidation,
  storeLinkedinUrlAndGetHeaders,
} from '../business/cookies/cookies.server'
import { LinkedinUrlInput } from '../ui/components/linkedin-url-input'
import { MainLayout } from '../ui/layouts/main-layout'
import type { Route } from './+types/home'

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Scan2SayHi - Create Professional LinkedIn QR Codes' },
    {
      name: 'description',
      content:
        'Generate QR codes for your LinkedIn profile. Perfect networking events.',
    },
    {
      name: 'keywords',
      content:
        'Scan2SayHi, LinkedIn, QR code, business card, networking, professional, generator',
    },
    { property: 'og:title', content: 'Scan2SayHi - LinkedIn QR Generator' },
    {
      property: 'og:description',
      content:
        'Create professional QR codes for your LinkedIn profile with Scan2SayHi',
    },
    { property: 'og:type', content: 'website' },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  // Handle cookie validation and cleanup
  const cookieValidation = handleCookieValidation(request)

  if (cookieValidation.shouldClearCookie) {
    // Clear corrupted or expired cookies
    const clearHeaders = createClearCookieHeaders()
    return data({ userData: null }, { headers: clearHeaders })
  }

  // If user already has a LinkedIn URL, redirect to QR page
  if (cookieValidation.userData?.linkedinUrl) {
    return redirect('/qr')
  }

  return data({
    userData: cookieValidation.userData || null,
    warnings: cookieValidation.warnings,
    errors: cookieValidation.errors,
  })
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
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

  // Redirect to QR page after successful submission
  return redirect(
    '/qr',
    result.headers
      ? {
          headers: result.headers,
        }
      : undefined
  )
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { warnings = [], errors = [] } = loaderData as {
    userData: any
    warnings: string[]
    errors: string[]
  }

  const submit = useSubmit()

  const handleUrlSubmit = async (url: string) => {
    const formData = new FormData()
    formData.set('linkedinUrl', url)

    submit(formData, { method: 'post' })
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
        {/* Welcome Section */}
        <div className="space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="font-bold text-3xl text-gray-900 sm:text-4xl dark:text-white">
              Create Your LinkedIn QR Code
            </h1>
            <p className="mx-auto max-w-2xl text-gray-600 text-lg dark:text-gray-400">
              Generate QR codes for your LinkedIn profile. Perfect networking
              events.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Input Section */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900 text-xl dark:text-white">
                Enter LinkedIn URL
              </h2>

              <LinkedinUrlInput initialValue="" onSubmit={handleUrlSubmit} />
            </div>
          </div>

          {/* Features List */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
            <h3 className="mb-4 font-semibold text-gray-900 text-lg dark:text-white">
              Features
            </h3>
            <ul className="space-y-3 text-gray-600 text-sm dark:text-gray-400">
              <li className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Instant QR code generation</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Customizable colors and sizes</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Download as high-quality PNG</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Share directly from your device</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Secure and private - no data stored</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Works offline after first load</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Tips Section */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
          <h3 className="mb-3 font-semibold text-blue-900 text-lg dark:text-blue-400">
            💡 Tips for Best Results
          </h3>
          <div className="grid grid-cols-1 gap-4 text-blue-800 text-sm md:grid-cols-2 dark:text-blue-300">
            <div className="space-y-2">
              <p>
                <strong>URL Format:</strong> Use your public LinkedIn profile
                URL
              </p>
              <p>
                <strong>Example:</strong> linkedin.com/in/your-username
              </p>
            </div>
            <div className="space-y-2">
              <p>
                <strong>Print Quality:</strong> Use larger sizes for business
                cards
              </p>
              <p>
                <strong>Sharing:</strong> Medium size (256px) works well for
                digital use
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
