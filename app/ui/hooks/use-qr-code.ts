import { useCallback, useEffect, useRef, useState } from 'react'
import type { QrConfig, QrGenerationResult } from '~/business/qr/qr.common'

interface QrCodeState {
  data: QrGenerationResult | null
  isLoading: boolean
  error: string | null
  fromCache: boolean
}

interface QrCodeOptions {
  config?: Partial<QrConfig>
  enableOffline?: boolean
  autoRetry?: boolean
  maxRetries?: number
  retryDelay?: number
}

interface UseQrCodeReturn {
  // State
  qrCode: QrGenerationResult | null
  isLoading: boolean
  error: string | null
  fromCache: boolean

  // Actions
  generateQrCode: (content: string) => Promise<void>
  retry: () => Promise<void>
  clear: () => void

  // Status
  hasQrCode: boolean
  canRetry: boolean
}

/**
 * Custom hook for managing QR code generation and caching
 */
export function useQrCode(options: QrCodeOptions = {}): UseQrCodeReturn {
  const {
    config = {},
    enableOffline = true,
    autoRetry = true,
    maxRetries = 3,
    retryDelay = 1000,
  } = options

  const [state, setState] = useState<QrCodeState>({
    data: null,
    isLoading: false,
    error: null,
    fromCache: false,
  })

  const retryCountRef = useRef(0)
  const lastContentRef = useRef<string | null>(null)
  const lastConfigRef = useRef<Partial<QrConfig> | null>(null)
  const cacheRef = useRef(new Map<string, QrGenerationResult>())

  // Generate cache key for content and config
  const generateCacheKey = useCallback(
    (content: string, qrConfig: Partial<QrConfig>) => {
      const data = JSON.stringify({ content, config: qrConfig })
      // Use TextEncoder for Unicode-safe hashing
      const encoder = new TextEncoder()
      const dataBytes = encoder.encode(data)

      // Simple hash function for cache key
      let hash = 0
      for (let i = 0; i < dataBytes.length; i++) {
        const char = dataBytes[i] || 0
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32bit integer
      }

      return Math.abs(hash).toString(16).substring(0, 16)
    },
    []
  )

  // Save to localStorage for offline support
  const saveToOfflineCache = useCallback(
    (content: string, result: QrGenerationResult) => {
      if (!enableOffline || typeof window === 'undefined') return

      try {
        const cacheKey = `qr_offline_${generateCacheKey(content, config)}`
        const cacheData = {
          result,
          timestamp: Date.now(),
          content: content.substring(0, 100), // Truncate for storage
        }
        localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      } catch (error) {
        console.warn('Failed to save QR code to offline cache:', error)
      }
    },
    [enableOffline, generateCacheKey, config]
  )

  // Load from localStorage for offline support
  const loadFromOfflineCache = useCallback(
    (content: string): QrGenerationResult | null => {
      if (!enableOffline || typeof window === 'undefined') return null

      try {
        const cacheKey = `qr_offline_${generateCacheKey(content, config)}`
        const cached = localStorage.getItem(cacheKey)

        if (!cached) return null

        const cacheData = JSON.parse(cached)
        const age = Date.now() - cacheData.timestamp

        // Cache expires after 24 hours
        if (age > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(cacheKey)
          return null
        }

        return cacheData.result
      } catch (error) {
        console.warn('Failed to load QR code from offline cache:', error)
        return null
      }
    },
    [enableOffline, generateCacheKey, config]
  )

  // Generate QR code with error handling and retry logic
  const generateQrCode = useCallback(
    async (content: string) => {
      if (!content.trim()) {
        setState((prev) => ({
          ...prev,
          error: 'Content cannot be empty',
          isLoading: false,
        }))
        return
      }

      lastContentRef.current = content
      lastConfigRef.current = config
      retryCountRef.current = 0

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        // Check memory cache first
        const memoryCacheKey = generateCacheKey(content, config)
        const memoryCache = cacheRef.current.get(memoryCacheKey)

        if (memoryCache) {
          setState({
            data: memoryCache,
            isLoading: false,
            error: null,
            fromCache: true,
          })
          return
        }

        // Check offline cache
        const offlineCache = loadFromOfflineCache(content)
        if (offlineCache) {
          setState({
            data: offlineCache,
            isLoading: false,
            error: null,
            fromCache: true,
          })

          // Store in memory cache too
          cacheRef.current.set(memoryCacheKey, offlineCache)
          return
        }

        // Generate new QR code via API
        const response = await fetch('/qr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            config,
          }),
        })

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to generate QR code' }))
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to generate QR code')
        }

        const qrResult = result.data

        // Cache the result
        cacheRef.current.set(memoryCacheKey, qrResult)
        saveToOfflineCache(content, qrResult)

        setState({
          data: qrResult,
          isLoading: false,
          error: null,
          fromCache: result.fromCache || false,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to generate QR code'

        setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }))

        // Auto-retry if enabled and we haven't exceeded max retries
        if (autoRetry && retryCountRef.current < maxRetries) {
          retryCountRef.current++

          setTimeout(() => {
            if (lastContentRef.current) {
              generateQrCode(lastContentRef.current)
            }
          }, retryDelay * retryCountRef.current) // Exponential backoff
        }
      }
    },
    [
      config,
      generateCacheKey,
      loadFromOfflineCache,
      saveToOfflineCache,
      autoRetry,
      maxRetries,
      retryDelay,
    ]
  )

  // Manual retry function
  const retry = useCallback(async () => {
    if (lastContentRef.current) {
      retryCountRef.current = 0 // Reset retry count for manual retry
      await generateQrCode(lastContentRef.current)
    }
  }, [generateQrCode])

  // Clear QR code and caches
  const clear = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      fromCache: false,
    })

    lastContentRef.current = null
    lastConfigRef.current = null
    retryCountRef.current = 0
    cacheRef.current.clear()
  }, [])

  // Cleanup offline cache on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && enableOffline) {
        // Clean up old offline cache entries
        try {
          const keys = Object.keys(localStorage)
          const qrKeys = keys.filter((key) => key.startsWith('qr_offline_'))

          qrKeys.forEach((key) => {
            try {
              const cached = localStorage.getItem(key)
              if (cached) {
                const cacheData = JSON.parse(cached)
                const age = Date.now() - cacheData.timestamp

                // Remove entries older than 24 hours
                if (age > 24 * 60 * 60 * 1000) {
                  localStorage.removeItem(key)
                }
              }
            } catch {
              // Remove corrupted entries
              localStorage.removeItem(key)
            }
          })
        } catch (error) {
          console.warn('Failed to cleanup offline cache:', error)
        }
      }
    }
  }, [enableOffline])

  return {
    // State
    qrCode: state.data,
    isLoading: state.isLoading,
    error: state.error,
    fromCache: state.fromCache,

    // Actions
    generateQrCode,
    retry,
    clear,

    // Status
    hasQrCode: state.data !== null,
    canRetry: state.error !== null && retryCountRef.current < maxRetries,
  }
}

/**
 * Hook for managing multiple QR codes
 */
export function useQrCodeBatch(options: QrCodeOptions = {}) {
  const [qrCodes, setQrCodes] = useState<Map<string, QrCodeState>>(new Map())
  const [isLoading, setIsLoading] = useState(false)

  const generateBatch = useCallback(
    async (contents: string[]) => {
      setIsLoading(true)

      try {
        const response = await fetch('/qr/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: contents.map((content) => ({
              content,
              config: options.config,
            })),
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(
            result.error?.message || 'Failed to generate QR codes'
          )
        }

        const newQrCodes = new Map<string, QrCodeState>()

        result.data.results.forEach((item: any) => {
          const content = contents[item.index]
          if (content) {
            newQrCodes.set(content, {
              data: item.success ? item.data : null,
              isLoading: false,
              error: item.success
                ? null
                : item.error?.message || 'Generation failed',
              fromCache: false,
            })
          }
        })

        setQrCodes(newQrCodes)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to generate QR codes'

        // Set error state for all contents
        const errorQrCodes = new Map<string, QrCodeState>()
        contents.forEach((content) => {
          errorQrCodes.set(content, {
            data: null,
            isLoading: false,
            error: errorMessage,
            fromCache: false,
          })
        })

        setQrCodes(errorQrCodes)
      } finally {
        setIsLoading(false)
      }
    },
    [options.config]
  )

  const getQrCode = useCallback(
    (content: string): QrCodeState => {
      return (
        qrCodes.get(content) || {
          data: null,
          isLoading: false,
          error: null,
          fromCache: false,
        }
      )
    },
    [qrCodes]
  )

  const clear = useCallback(() => {
    setQrCodes(new Map())
  }, [])

  return {
    generateBatch,
    getQrCode,
    clear,
    isLoading,
    totalCount: qrCodes.size,
    successCount: Array.from(qrCodes.values()).filter(
      (state) => state.data !== null
    ).length,
    errorCount: Array.from(qrCodes.values()).filter(
      (state) => state.error !== null
    ).length,
  }
}
