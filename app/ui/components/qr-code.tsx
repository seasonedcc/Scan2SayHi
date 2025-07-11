import { useEffect, useState } from 'react'
import type { QrConfig } from '~/business/qr/qr.common'
import { useQrCode } from '~/ui/hooks/use-qr-code'

interface QrCodeComponentProps {
  content: string
  config?: Partial<QrConfig>
  className?: string
  showInstructions?: boolean
  enableOffline?: boolean
  autoGenerate?: boolean
  onLoad?: () => void
  onError?: (error: string) => void
}

/**
 * Professional QR code component with card layout and animations
 */
export function QrCode({
  content,
  config = {},
  className = '',
  showInstructions = true,
  enableOffline = true,
  autoGenerate = true,
  onLoad,
  onError,
}: QrCodeComponentProps) {
  const {
    qrCode,
    isLoading,
    error,
    fromCache,
    generateQrCode,
    retry,
    canRetry,
  } = useQrCode({
    config,
    enableOffline,
    autoRetry: true,
    maxRetries: 3,
  })

  const [imageLoaded, setImageLoaded] = useState(false)
  const [showRetryButton, setShowRetryButton] = useState(false)

  // Auto-generate QR code when content changes
  useEffect(() => {
    if (autoGenerate && content) {
      generateQrCode(content)
      setImageLoaded(false)
    }
  }, [content, autoGenerate, generateQrCode])

  // Handle load/error callbacks
  useEffect(() => {
    if (qrCode && imageLoaded) {
      onLoad?.()
    }
  }, [qrCode, imageLoaded, onLoad])

  useEffect(() => {
    if (error) {
      onError?.(error)
      // Show retry button after a delay if auto-retry isn't working
      const timer = setTimeout(() => {
        setShowRetryButton(true)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      setShowRetryButton(false)
    }
  }, [error, onError])

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleImageError = () => {
    setImageLoaded(false)
    if (!error) {
      onError?.('Failed to load QR code image')
    }
  }

  const handleRetry = () => {
    retry()
    setShowRetryButton(false)
  }

  return (
    <div className={`flex w-full flex-col items-center ${className}`}>
      {/* QR Code Card */}
      <div className="hover:-translate-y-0.5 relative flex aspect-[3/4] w-full max-w-80 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl">
        {/* Loading State */}
        {isLoading && (
          <div className="relative flex flex-col items-center gap-4">
            <div className="relative h-50 w-50 animate-pulse rounded-lg bg-[length:200%_100%] bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200">
              <div className="absolute inset-0 animate-pulse rounded-lg border-2 border-blue-500" />
            </div>
            <span className="font-medium text-gray-500 text-sm">
              Generating QR code...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
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
            {(canRetry || showRetryButton) && (
              <button
                onClick={handleRetry}
                className="cursor-pointer rounded-lg border-none bg-blue-500 px-4 py-2 font-medium text-sm text-white transition-colors duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                type="button"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Success State */}
        {qrCode && !isLoading && (
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

              {/* Cache indicator */}
              {fromCache && (
                <div
                  className="-top-1.5 -right-1.5 absolute flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-green-500 text-white text-xs shadow-md"
                  title="Loaded from cache"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              )}
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

/**
 * Compact QR code component for smaller spaces
 */
export function QrCodeCompact({
  content,
  config = {},
  className = '',
  size = 128,
}: {
  content: string
  config?: Partial<QrConfig>
  className?: string
  size?: number
}) {
  const { qrCode, isLoading, error, generateQrCode, retry } = useQrCode({
    config: { ...config, size },
    enableOffline: true,
  })

  useEffect(() => {
    if (content) {
      generateQrCode(content)
    }
  }, [content, generateQrCode])

  if (isLoading) {
    return (
      <div className={`inline-block ${className}`}>
        <div
          className="animate-pulse rounded-lg bg-[length:200%_100%] bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"
          style={{ width: size, height: size }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`inline-block ${className}`}>
        <button
          onClick={retry}
          className="flex cursor-pointer items-center justify-center rounded-lg border-none bg-red-500 text-2xl text-white transition-colors duration-200 hover:bg-red-600"
          style={{ width: size, height: size }}
          type="button"
          title={error}
        >
          ⟲
        </button>
      </div>
    )
  }

  if (!qrCode) {
    return null
  }

  return (
    <div className={`inline-block ${className}`}>
      <img
        src={qrCode.dataUrl}
        alt="LinkedIn QR code"
        width={size}
        height={size}
        className="block rounded-lg"
      />
    </div>
  )
}
