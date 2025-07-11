import { useState } from 'react'
import type { QrGenerationResult } from '~/business/qr/qr.common'
import { Form } from 'react-router'

interface QrCodeComponentProps {
  qrCode?: QrGenerationResult | null | undefined
  error?: string | null | undefined
  className?: string
  showInstructions?: boolean
}

/**
 * Professional QR code component with card layout and animations
 */
export function QrCode({
  qrCode,
  error,
  className = '',
  showInstructions = true,
}: QrCodeComponentProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

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
        {/* Error State */}
        {error && (
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
              {error}
            </span>
            <Form method="post">
              <button
                name="_action"
                value="retry_qr"
                className="cursor-pointer rounded-lg border-none bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 font-medium text-sm text-white transition-all duration-200 hover:scale-105 hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                type="submit"
              >
                Try Again
              </button>
            </Form>
          </div>
        )}

        {/* Success State */}
        {qrCode && (
          <div className="flex w-full flex-col items-center gap-5">
            <div className="relative flex items-center justify-center">
              <img
                src={qrCode.dataUrl}
                alt="QR code for LinkedIn profile"
                className={`h-auto max-w-full rounded-lg transition-all duration-300 ${
                  imageLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                }`}
                width={qrCode.size.width}
                height={qrCode.size.height}
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

