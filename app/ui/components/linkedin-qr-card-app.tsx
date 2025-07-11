import type React from 'react'
import { useEffect, useState } from 'react'
import type { UserDataCookie } from '../../business/cookies/cookies.common'
import { LinkedinQrDisplay } from './linkedin-qr-display'
import { LinkedinUrlInput } from './linkedin-url-input'

export interface LinkedinQrCardAppProps {
  initialUserData?: UserDataCookie
  onUrlSubmit: (url: string) => Promise<void>
  className?: string
}

export const LinkedinQrCardApp: React.FC<LinkedinQrCardAppProps> = ({
  initialUserData,
  onUrlSubmit,
  className = '',
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [showQrCode, setShowQrCode] = useState(false)
  const [usageCount, setUsageCount] = useState(0)

  // Initialize from cookie data
  useEffect(() => {
    if (initialUserData?.linkedinUrl) {
      setCurrentUrl(initialUserData.linkedinUrl.url)
      setShowQrCode(true)
      setUsageCount(initialUserData.linkedinUrl.usageCount || 0)
    }
  }, [initialUserData])

  const handleUrlSubmit = async (url: string) => {
    try {
      await onUrlSubmit(url)
      setCurrentUrl(url)
      setShowQrCode(true)
      setUsageCount((prev) => prev + 1)
    } catch (error) {
      // Error is handled by the input component
      console.error('Failed to submit URL:', error)
    }
  }

  const handleNewUrl = () => {
    setShowQrCode(false)
    setCurrentUrl('')
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Welcome Section */}
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl text-gray-900 sm:text-4xl dark:text-white">
            LinkedIn QR Card Generator
          </h1>
          <p className="mx-auto max-w-2xl text-gray-600 text-lg dark:text-gray-400">
            Create professional QR codes for your LinkedIn profile. Perfect for
            business cards, networking events, and digital sharing.
          </p>
        </div>

        {/* Usage Stats */}
        {usageCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-blue-700 text-sm dark:bg-blue-900/30 dark:text-blue-400">
            <span>📊</span>
            <span>
              Generated {usageCount} time{usageCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        {/* QR Code Display Section - Show first on mobile when QR exists */}
        <div
          className={`space-y-6 ${showQrCode ? 'order-1 lg:order-2' : 'order-2 lg:order-2'}`}
        >
          {showQrCode ? (
            <LinkedinQrDisplay
              linkedinUrl={currentUrl}
              qrConfig={
                initialUserData?.qrConfig
                  ? {
                      size: initialUserData.qrConfig.size,
                      errorCorrectionLevel:
                        initialUserData.qrConfig.errorCorrectionLevel,
                      colors: initialUserData.qrConfig.colors,
                    }
                  : undefined
              }
              showDownloadButton={true}
              showConfigPanel={true}
            />
          ) : (
            /* Placeholder */
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <div className="space-y-4 py-12 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                  <span className="text-4xl text-gray-400 dark:text-gray-500">
                    📱
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900 text-lg dark:text-white">
                    QR Code Preview
                  </h3>
                  <p className="text-gray-500 text-sm dark:text-gray-400">
                    Enter your LinkedIn URL to generate a QR code
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Section - Show second on mobile when QR exists */}
        <div
          className={`space-y-6 ${showQrCode ? 'order-2 lg:order-1' : 'order-1 lg:order-1'}`}
        >
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-xl dark:text-white">
                  {showQrCode ? 'Update URL' : 'Enter LinkedIn URL'}
                </h2>

                {showQrCode && (
                  <button
                    onClick={handleNewUrl}
                    className="text-blue-600 text-sm transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Start Over
                  </button>
                )}
              </div>

              <LinkedinUrlInput
                initialValue={currentUrl}
                onSubmit={handleUrlSubmit}
              />
            </div>
          </div>

          {/* Features List - Hide on mobile when QR code is shown to save space */}
          <div
            className={`rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50 ${showQrCode ? 'hidden lg:block' : 'block'}`}
          >
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
      </div>

      {/* Tips Section */}
      {!showQrCode && (
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
      )}
    </div>
  )
}

export default LinkedinQrCardApp
