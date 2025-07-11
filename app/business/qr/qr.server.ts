/**
 * Server-side QR code generation functions
 *
 * This module provides server-only functions for QR code generation,
 * including validation, caching, and optimization.
 */

import QRCode from 'qrcode'
import {
  analyzeQrContent,
  DEFAULT_QR_CONFIG,
  generateQrCacheKey,
  type QrCacheEntry,
  type QrConfig,
  type QrGenerationResult,
  validateQrConfig,
  validateQrContent,
  validateQrGenerationRequest,
} from './qr.common'

/**
 * Server-side QR code generation with validation and optimization
 */
export async function generateQrCodeServer(
  content: string,
  config: Partial<QrConfig> = {}
): Promise<
  | { success: true; data: QrGenerationResult }
  | { success: false; error: { message: string; code: string } }
> {
  try {
    // Validate content
    const contentValidation = validateQrContent(content)
    if (!contentValidation.success) {
      const firstError = contentValidation.error.issues[0]
      return {
        success: false,
        error: {
          message: firstError?.message || 'Invalid QR code content',
          code: 'invalid_content',
        },
      }
    }

    // Merge with default config and validate
    const fullConfig = { ...DEFAULT_QR_CONFIG, ...config }
    const configValidation = validateQrConfig(fullConfig)
    if (!configValidation.success) {
      const firstError = configValidation.error.issues[0]
      return {
        success: false,
        error: {
          message: firstError?.message || 'Invalid QR code configuration',
          code: 'invalid_config',
        },
      }
    }

    const validatedConfig = configValidation.data

    // Generate QR code using qrcode library
    const qrOptions = {
      errorCorrectionLevel: validatedConfig.errorCorrectionLevel,
      margin: validatedConfig.margin,
      width: validatedConfig.size,
      color: {
        dark: validatedConfig.colors.dark,
        light: validatedConfig.colors.light,
      },
    }

    // Generate as PNG data URL
    const dataUrl = await QRCode.toDataURL(content, qrOptions)

    const result: QrGenerationResult = {
      content: contentValidation.data,
      config: validatedConfig,
      dataUrl,
      size: {
        width: validatedConfig.size,
        height: validatedConfig.size,
      },
      generatedAt: new Date(),
      format: 'png',
    }

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to generate QR code',
        code: 'generation_failed',
      },
    }
  }
}

/**
 * Generate QR code with automatic optimization
 */
export async function generateOptimizedQrCode(
  content: string,
  config: Partial<QrConfig> = {}
): Promise<
  | { success: true; data: QrGenerationResult; analysis: any }
  | { success: false; error: { message: string; code: string } }
> {
  try {
    // Analyze content for optimization recommendations
    const analysis = analyzeQrContent(content)

    if (!analysis.isValid) {
      return {
        success: false,
        error: {
          message: analysis.errors.join(', ') || 'Invalid QR content',
          code: 'content_analysis_failed',
        },
      }
    }

    // Apply optimization recommendations
    const optimizedConfig = { ...DEFAULT_QR_CONFIG, ...config }

    if (analysis.recommendedErrorLevel) {
      optimizedConfig.errorCorrectionLevel = analysis.recommendedErrorLevel
    }

    // Generate the QR code
    const result = await generateQrCodeServer(content, optimizedConfig)

    if (!result.success) {
      return result
    }

    return {
      success: true,
      data: result.data,
      analysis,
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to generate optimized QR code',
        code: 'optimization_failed',
      },
    }
  }
}

/**
 * Batch QR code generation for multiple URLs
 */
export async function batchGenerateQrCodes(
  requests: Array<{ content: string; config?: Partial<QrConfig> }>
): Promise<{
  results: Array<{
    index: number
    content: string
    success: boolean
    data?: QrGenerationResult
    error?: { message: string; code: string }
  }>
  summary: { total: number; successful: number; failed: number }
}> {
  const results = []

  for (const [index, request] of requests.entries()) {
    const result = await generateQrCodeServer(request.content, request.config)

    results.push({
      index,
      content: request.content.substring(0, 100), // Truncate for safety
      success: result.success,
      ...(result.success ? { data: result.data } : { error: result.error }),
    })
  }

  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  return {
    results,
    summary: {
      total: requests.length,
      successful: successful.length,
      failed: failed.length,
    },
  }
}

/**
 * Simple in-memory cache for QR codes
 */
class QrCodeCache {
  private cache = new Map<string, QrCacheEntry>()
  private readonly maxSize: number
  private readonly defaultTtl: number

  constructor(maxSize = 1000, defaultTtl = 3600000) {
    // 1 hour default TTL
    this.maxSize = maxSize
    this.defaultTtl = defaultTtl
  }

  get(key: string): QrGenerationResult | null {
    const entry = this.cache.get(key)

    if (!entry || entry.expiresAt < new Date()) {
      this.cache.delete(key)
      return null
    }

    // Update access stats
    entry.accessCount++
    entry.lastAccessed = new Date()

    return entry.result
  }

  set(key: string, result: QrGenerationResult, ttl?: number): void {
    // Clean expired entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup()

      // If still full, remove oldest entries
      if (this.cache.size >= this.maxSize) {
        const entries = Array.from(this.cache.entries())
        entries
          .sort(
            (a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime()
          )
          .slice(0, Math.floor(this.maxSize * 0.2)) // Remove 20% of oldest entries
          .forEach(([key]) => this.cache.delete(key))
      }
    }

    const expiresAt = new Date(Date.now() + (ttl || this.defaultTtl))
    const now = new Date()

    this.cache.set(key, {
      key,
      result,
      expiresAt,
      accessCount: 0,
      lastAccessed: now,
    })
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  cleanup(): void {
    const now = new Date()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key)
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.values()).map((entry) => ({
        key: entry.key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        expiresAt: entry.expiresAt,
      })),
    }
  }
}

// Global cache instance
const qrCache = new QrCodeCache()

/**
 * Generate QR code with caching support
 */
export async function generateCachedQrCode(
  content: string,
  config: Partial<QrConfig> = {}
): Promise<
  | { success: true; data: QrGenerationResult; fromCache: boolean }
  | { success: false; error: { message: string; code: string } }
> {
  try {
    const fullConfig = { ...DEFAULT_QR_CONFIG, ...config }
    const cacheKey = generateQrCacheKey(content, fullConfig)

    // Try to get from cache first
    const cached = qrCache.get(cacheKey)
    if (cached) {
      return {
        success: true,
        data: cached,
        fromCache: true,
      }
    }

    // Generate new QR code
    const result = await generateQrCodeServer(content, config)

    if (!result.success) {
      return result
    }

    // Cache the result
    qrCache.set(cacheKey, result.data)

    return {
      success: true,
      data: result.data,
      fromCache: false,
    }
  } catch (error) {
    return {
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to generate cached QR code',
        code: 'cache_generation_failed',
      },
    }
  }
}

/**
 * Validate QR generation request
 */
export function validateQrGenerationRequestServer(request: unknown) {
  const result = validateQrGenerationRequest(request)

  if (!result.success) {
    const firstError = result.error.issues[0]
    return {
      success: false as const,
      error: {
        message: firstError?.message || 'Invalid QR generation request',
        code: firstError?.code || 'invalid_request',
        path: firstError?.path || [],
      },
    }
  }

  return {
    success: true as const,
    data: result.data,
  }
}

/**
 * Create QR code processor with rate limiting
 */
export function createQrCodeProcessor(
  options: {
    maxRequestsPerMinute?: number
    maxBatchSize?: number
    cacheTtl?: number
  } = {}
) {
  const { maxRequestsPerMinute = 60, maxBatchSize = 20 } = options

  const requestCounts = new Map<string, { count: number; resetTime: number }>()

  return {
    /**
     * Check if a client can make a request
     */
    canMakeRequest(clientId: string): boolean {
      const now = Date.now()
      const minuteMs = 60 * 1000

      const clientData = requestCounts.get(clientId)

      if (!clientData || now > clientData.resetTime) {
        requestCounts.set(clientId, {
          count: 1,
          resetTime: now + minuteMs,
        })
        return true
      }

      if (clientData.count >= maxRequestsPerMinute) {
        return false
      }

      clientData.count++
      return true
    },

    /**
     * Generate single QR code with rate limiting
     */
    async generateQrCode(
      clientId: string,
      content: string,
      config?: Partial<QrConfig>
    ) {
      if (!this.canMakeRequest(clientId)) {
        return {
          success: false as const,
          error: {
            message: 'Rate limit exceeded',
            code: 'rate_limit_exceeded',
            retryAfter: 60,
          },
        }
      }

      return generateCachedQrCode(content, config)
    },

    /**
     * Generate multiple QR codes with rate limiting
     */
    async generateBatch(
      clientId: string,
      requests: Array<{ content: string; config?: Partial<QrConfig> }>
    ) {
      if (requests.length > maxBatchSize) {
        return {
          success: false as const,
          error: {
            message: `Batch size exceeds maximum of ${maxBatchSize}`,
            code: 'batch_size_exceeded',
            maxBatchSize,
          },
        }
      }

      if (!this.canMakeRequest(clientId)) {
        return {
          success: false as const,
          error: {
            message: 'Rate limit exceeded',
            code: 'rate_limit_exceeded',
            retryAfter: 60,
          },
        }
      }

      const results = await batchGenerateQrCodes(requests)
      return {
        success: true as const,
        data: results,
      }
    },

    /**
     * Get cache statistics
     */
    getCacheStats() {
      return qrCache.getStats()
    },

    /**
     * Clear cache
     */
    clearCache() {
      qrCache.clear()
    },
  }
}

/**
 * Export cache for external access if needed
 */
export { qrCache }
