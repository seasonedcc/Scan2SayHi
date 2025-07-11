import { data, useSubmit } from 'react-router'
import {
  createClearCookieHeaders,
  handleCookieValidation,
  storeLinkedinUrlAndGetHeaders,
} from '../business/cookies/cookies.server'
import { LinkedinQrCardApp } from '../ui/components/linkedin-qr-card-app'
import { MainLayout } from '../ui/layouts/main-layout'
import type { Route } from './+types/home'

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'LinkedIn QR Card Generator - Create Professional QR Codes' },
    {
      name: 'description',
      content:
        'Generate professional QR codes for your LinkedIn profile. Perfect for business cards, networking events, and digital sharing. Secure, fast, and works offline.',
    },
    {
      name: 'keywords',
      content:
        'LinkedIn, QR code, business card, networking, professional, generator',
    },
    { property: 'og:title', content: 'LinkedIn QR Card Generator' },
    {
      property: 'og:description',
      content: 'Create professional QR codes for your LinkedIn profile',
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

export default function Home({ loaderData }: Route.ComponentProps) {
  const {
    userData,
    warnings = [],
    errors = [],
  } = loaderData as {
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

      <LinkedinQrCardApp
        initialUserData={userData}
        onUrlSubmit={handleUrlSubmit}
      />
    </MainLayout>
  )
}
