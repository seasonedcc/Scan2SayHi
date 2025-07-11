import type React from 'react'
import { useState } from 'react'
import { validateLinkedinUrl } from '../../business/linkedin/linkedin.common'

export interface LinkedinUrlInputProps {
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

    // Clear previous validation error
    setValidationError(null)

    // Validate on the fly if URL is not empty
    if (newUrl.trim()) {
      setIsValidating(true)

      // Debounce validation
      const timeoutId = setTimeout(() => {
        const validation = validateLinkedinUrl(newUrl.trim())
        if (!validation.success) {
          setValidationError(
            validation.error.issues[0]?.message || 'Invalid LinkedIn URL'
          )
        }
        setIsValidating(false)
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (disabled || isSubmitting) return

    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setValidationError('LinkedIn URL is required')
      return
    }

    // Final validation before submit
    const validation = validateLinkedinUrl(trimmedUrl)
    if (!validation.success) {
      setValidationError(
        validation.error.issues[0]?.message || 'Invalid LinkedIn URL'
      )
      return
    }

    setIsSubmitting(true)
    setValidationError(null)

    try {
      await onSubmit(validation.data)
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
            type="url"
            value={url}
            onChange={handleUrlChange}
            disabled={disabled || isSubmitting}
            placeholder="https://linkedin.com/in/your-username"
            className={`w-full rounded-lg border px-4 py-3 text-sm transition-colors duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-gray-500 ${
              hasError
                ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 dark:border-red-600 dark:bg-red-900/20 dark:text-red-100'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
            }`}
          />

          {isLoading && (
            <div className="-translate-y-1/2 absolute top-1/2 right-3 transform">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
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
        className={`w-full rounded-lg px-6 py-3 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          isSubmitting || hasError || !url.trim()
            ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow-md active:bg-blue-800'
        } `}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            Generating QR Code...
          </span>
        ) : (
          'Generate QR Code'
        )}
      </button>
    </form>
  )
}

export default LinkedinUrlInput
