import type React from 'react'
import { useState } from 'react'
import { normalizeLinkedinUrl } from '../../business/linkedin/linkedin.common'

interface LinkedinUrlInputProps {
  initialValue?: string
  onSubmit: (url: string) => Promise<void> | void
  disabled?: boolean
  className?: string
}

export const LinkedinUrlInput: React.FC<LinkedinUrlInputProps> = ({
  initialValue = '',
  onSubmit,
  disabled = false,
  className = '',
}) => {
  const [url, setUrl] = useState(initialValue)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = event.target.value
    setUrl(newUrl)

    // Clear previous validation error when typing
    setValidationError(null)
    setIsValidating(false)
  }

  const handleBlur = () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setValidationError(null)
      setIsValidating(false)
      return
    }

    setIsValidating(true)
    // Basic validation - accept usernames or LinkedIn URLs
    const isValidInput =
      /^[a-zA-Z0-9\-_]+$/.test(trimmedUrl) || // Username format
      trimmedUrl.includes('linkedin.com/in/') || // LinkedIn URL
      normalizeLinkedinUrl(trimmedUrl).success // Full validation as fallback

    if (!isValidInput) {
      setValidationError('Please enter a LinkedIn username or full profile URL')
    } else {
      setValidationError(null)
    }
    setIsValidating(false)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (disabled || isSubmitting) return

    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setValidationError('LinkedIn URL is required')
      return
    }

    // Final validation before submit - be permissive, let server handle normalization
    const isValidInput =
      /^[a-zA-Z0-9\-_]+$/.test(trimmedUrl) || // Username format
      trimmedUrl.includes('linkedin.com/in/') || // LinkedIn URL
      normalizeLinkedinUrl(trimmedUrl).success // Full validation as fallback

    if (!isValidInput) {
      setValidationError('Please enter a LinkedIn username or full profile URL')
      return
    }

    setIsSubmitting(true)
    setValidationError(null)

    try {
      await onSubmit(trimmedUrl)
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Failed to submit URL'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasError = validationError !== null
  const isLoading = isValidating || isSubmitting

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <label
          htmlFor="linkedin-url"
          className="block font-medium text-gray-900 text-sm dark:text-white"
        >
          LinkedIn Profile URL
        </label>

        <div className="relative">
          <input
            id="linkedin-url"
            type="text"
            value={url}
            onChange={handleUrlChange}
            onBlur={handleBlur}
            disabled={disabled || isSubmitting}
            placeholder="foobar or https://linkedin.com/in/foobar"
            className={`w-full rounded-lg border px-4 py-3 text-sm transition-colors duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-gray-500 ${
              hasError
                ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 dark:border-red-600 dark:bg-red-900/20 dark:text-red-100'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
            }`}
          />

          {isLoading && (
            <div className="-translate-y-1/2 absolute top-1/2 right-3 transform">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-purple-600" />
            </div>
          )}
        </div>

        {hasError && (
          <p className="flex items-center gap-1 text-red-600 text-sm dark:text-red-400">
            <span className="text-red-500">⚠</span>
            {validationError}
          </p>
        )}

        <p className="text-gray-500 text-xs dark:text-gray-400">
          Enter your LinkedIn profile URL to generate a QR code
        </p>
      </div>

      <button
        type="submit"
        disabled={disabled || isSubmitting || hasError || !url.trim()}
        className={`w-full rounded-lg px-6 py-3 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          isSubmitting || hasError || !url.trim()
            ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:scale-105 hover:from-violet-700 hover:to-purple-700 hover:shadow-xl active:scale-95'
        } `}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-purple-600" />
            Generating QR Code...
          </span>
        ) : (
          'Generate QR Code'
        )}
      </button>
    </form>
  )
}

// Removed unused default export
