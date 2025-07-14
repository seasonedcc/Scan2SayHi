import { useEffect, useState } from 'react'
import type { QrConfig, QrGenerationResult } from '~/business/qr/qr.common'

interface QrCodeComponentProps {
  qrCode?: QrGenerationResult | null | undefined
  error?: string | null | undefined
  className?: string
  showInstructions?: boolean
  linkedinUrl?: string
  qrConfig?: Partial<QrConfig>
}

/**
 * Professional QR code component with card layout and animations
 */
export function QrCode({
  qrCode,
  error,
  className = '',
  showInstructions = true,
  linkedinUrl,
  qrConfig,
}: QrCodeComponentProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [clientQrCode, setClientQrCode] = useState<QrGenerationResult | null>(
    null
  )
  const [clientIsLoading, setClientIsLoading] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  // Simple client-side QR generation using react-qr-code
  const generateClientQrCode = async (url: string) => {
    if (!url) return

    setClientIsLoading(true)
    setClientError(null)

    try {
      // Import QR code library dynamically for client-side use
      const QRCode = await import('qrcode')

      const size = qrConfig?.size || 256
      const errorCorrectionLevel = qrConfig?.errorCorrectionLevel || 'M'
      const darkColor = qrConfig?.colors?.dark || '#000000'
      const lightColor = qrConfig?.colors?.light || '#FFFFFF'

      const dataUrl = await QRCode.toDataURL(url, {
        width: size,
        errorCorrectionLevel,
        margin: 2,
        color: {
          dark: darkColor,
          light: lightColor,
        },
      })

      const result: QrGenerationResult = {
        content: url,
        config: {
          size,
          errorCorrectionLevel,
          margin: 2,
          colors: {
            dark: darkColor,
            light: lightColor,
          },
          includeMargin: true,
        },
        dataUrl,
        size: { width: size, height: size },
        generatedAt: new Date(),
        format: 'png',
      }

      setClientQrCode(result)
      setClientError(null)
    } catch (error) {
      setClientError(
        error instanceof Error ? error.message : 'Failed to generate QR code'
      )
    } finally {
      setClientIsLoading(false)
    }
  }

  // Determine which QR code to use
  const finalQrCode = qrCode || clientQrCode
  const finalError = error || clientError
  const isLoading = clientIsLoading

  // Always generate client-side QR code as fallback if we have a LinkedIn URL
  useEffect(() => {
    if (linkedinUrl && !clientQrCode && !isLoading && !clientError) {
      generateClientQrCode(linkedinUrl)
    }
  }, [linkedinUrl, clientQrCode, isLoading, clientError])

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleImageError = () => {
    setImageLoaded(false)
  }

  return (
    <div className={`flex w-full flex-col items-center ${className}`}>
      {/* QR Code Card */}
      <div className="hover:-translate-y-0.5 relative flex aspect-[3/4] w-full max-w-80 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl">
        {/* Loading State */}
        {isLoading && (
          <div className="flex max-w-60 flex-col items-center gap-3 text-center">
            <div className="flex-shrink-0 text-purple-500">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="animate-spin"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="opacity-25"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <span className="text-gray-500 text-sm leading-relaxed">
              Generating QR code...
            </span>
          </div>
        )}

        {/* Error State */}
        {finalError && !isLoading && (
          <div className="flex max-w-60 flex-col items-center gap-3 text-center">
            <div className="flex-shrink-0 text-red-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-gray-500 text-sm leading-relaxed">
              {finalError}
            </span>
            <button
              onClick={() => linkedinUrl && generateClientQrCode(linkedinUrl)}
              className="cursor-pointer rounded-lg border-none bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 font-medium text-sm text-white transition-all duration-200 hover:scale-105 hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              type="button"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success State */}
        {finalQrCode && !isLoading && (
          <div className="flex w-full flex-col items-center gap-5">
            <div className="relative flex items-center justify-center">
              <img
                src={finalQrCode.dataUrl}
                alt="QR code for LinkedIn profile"
                className={`h-auto max-w-full rounded-lg transition-all duration-300 ${
                  imageLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                }`}
                width={finalQrCode.size.width}
                height={finalQrCode.size.height}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>

            {/* Instructions */}
            {showInstructions && (
              <div className="text-center">
                <p className="m-0 font-medium text-gray-500 text-sm leading-snug">
                  Point camera here to connect on LinkedIn
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
