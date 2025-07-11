import { z } from 'zod'

/**
 * QR code generation and configuration schemas
 *
 * This module provides Zod schemas for QR code configuration,
 * including size, error correction, and content validation.
 */

// QR code error correction levels
export const qrErrorCorrectionLevelSchema = z.enum(['L', 'M', 'Q', 'H'])

// QR code size configuration
export const qrSizeSchema = z
  .number()
  .int()
  .min(64, 'QR code size must be at least 64px')
  .max(1024, 'QR code size must be at most 1024px')
  .default(256)

// QR code margin configuration
export const qrMarginSchema = z
  .number()
  .int()
  .min(0, 'QR code margin must be non-negative')
  .max(10, 'QR code margin must be at most 10 modules')
  .default(4)

// QR code color configuration
export const qrColorSchema = z.object({
  dark: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Dark color must be a valid hex color')
    .default('#000000'),
  light: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Light color must be a valid hex color')
    .default('#FFFFFF'),
})

// QR code configuration schema
export const qrConfigSchema = z.object({
  size: qrSizeSchema,
  errorCorrectionLevel: qrErrorCorrectionLevelSchema.default('M'),
  margin: qrMarginSchema,
  colors: qrColorSchema.default({ dark: '#000000', light: '#FFFFFF' }),
  includeMargin: z.boolean().default(true),
})

// QR code content validation
export const qrContentSchema = z
  .string()
  .min(1, 'QR code content cannot be empty')
  .max(2953, 'QR code content exceeds maximum length for reliable encoding')
  .refine(
    (content) => {
      // Basic URL validation - should be a valid URL or at least URL-like
      try {
        new URL(content)
        return true
      } catch {
        // Allow non-URLs but they should at least look like text content
        return content.length >= 3
      }
    },
    {
      message: 'QR code content must be a valid URL or meaningful text',
    }
  )

// QR code generation request schema
export const qrGenerationRequestSchema = z.object({
  content: qrContentSchema,
  config: qrConfigSchema.optional(),
})

// QR code generation result schema
export const qrGenerationResultSchema = z.object({
  content: qrContentSchema,
  config: qrConfigSchema,
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|svg\+xml);base64,/, 'Must be a valid data URL'),
  size: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  generatedAt: z.date(),
  format: z.enum(['png', 'svg']).default('png'),
})

// QR code cache entry schema
export const qrCacheEntrySchema = z.object({
  key: z.string().min(1, 'Cache key cannot be empty'),
  result: qrGenerationResultSchema,
  expiresAt: z.date(),
  accessCount: z.number().int().nonnegative().default(0),
  lastAccessed: z.date(),
})

// QR code validation result schema
export const qrValidationResultSchema = z.object({
  isValid: z.boolean(),
  estimatedSize: z.number().int().positive().optional(),
  recommendedErrorLevel: qrErrorCorrectionLevelSchema.optional(),
  warnings: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
})

// Export types
export type QrErrorCorrectionLevel = z.infer<
  typeof qrErrorCorrectionLevelSchema
>
export type QrSize = z.infer<typeof qrSizeSchema>
export type QrMargin = z.infer<typeof qrMarginSchema>
export type QrColor = z.infer<typeof qrColorSchema>
export type QrConfig = z.infer<typeof qrConfigSchema>
export type QrContent = z.infer<typeof qrContentSchema>
export type QrGenerationRequest = z.infer<typeof qrGenerationRequestSchema>
export type QrGenerationResult = z.infer<typeof qrGenerationResultSchema>
export type QrCacheEntry = z.infer<typeof qrCacheEntrySchema>
export type QrValidationResult = z.infer<typeof qrValidationResultSchema>

// Validation helper functions
export const validateQrContent = (content: string) => {
  return qrContentSchema.safeParse(content)
}

export const validateQrConfig = (config: unknown) => {
  return qrConfigSchema.safeParse(config)
}

export const validateQrGenerationRequest = (request: unknown) => {
  return qrGenerationRequestSchema.safeParse(request)
}

// QR code content analysis function
export const analyzeQrContent = (content: string): QrValidationResult => {
  const validation = validateQrContent(content)

  if (!validation.success) {
    return {
      isValid: false,
      warnings: [],
      errors: validation.error.issues.map((issue) => issue.message),
    }
  }

  const warnings: string[] = []
  let recommendedErrorLevel: QrErrorCorrectionLevel = 'M'

  // Estimate QR code complexity
  const length = content.length
  let estimatedSize = 21 // Version 1 QR code base size

  if (length > 25) estimatedSize = 25 // Version 2
  if (length > 47) estimatedSize = 29 // Version 3
  if (length > 77) estimatedSize = 33 // Version 4
  if (length > 114) estimatedSize = 37 // Version 5
  if (length > 154) estimatedSize = 41 // Version 6
  if (length > 195) estimatedSize = 45 // Version 7
  if (length > 224) estimatedSize = 49 // Version 8
  if (length > 279) estimatedSize = 53 // Version 9
  if (length > 335) estimatedSize = 57 // Version 10

  // Content-based recommendations
  if (content.includes('utm_') || content.includes('tracking')) {
    warnings.push(
      'URL contains tracking parameters that increase QR code complexity'
    )
  }

  if (length > 200) {
    warnings.push(
      'Long URLs may result in dense QR codes that are harder to scan'
    )
    recommendedErrorLevel = 'L' // Lower error correction for dense codes
  }

  if (length > 500) {
    warnings.push('Very long content may not be suitable for QR codes')
    recommendedErrorLevel = 'L'
  }

  // LinkedIn-specific optimizations
  if (content.includes('linkedin.com/in/')) {
    if (content.length < 50) {
      recommendedErrorLevel = 'H' // High error correction for clean, short LinkedIn URLs
    } else if (content.length < 100) {
      recommendedErrorLevel = 'Q' // Medium-high for moderate length
    }
  }

  return {
    isValid: true,
    estimatedSize,
    recommendedErrorLevel,
    warnings,
    errors: [],
  }
}

// Generate cache key for QR code
export const generateQrCacheKey = (
  content: string,
  config: QrConfig
): string => {
  const configHash = JSON.stringify({
    size: config.size,
    errorCorrectionLevel: config.errorCorrectionLevel,
    margin: config.margin,
    colors: config.colors,
    includeMargin: config.includeMargin,
  })

  // Simple hash function for cache key - using TextEncoder for Unicode safety
  const encoder = new TextEncoder()
  const data = encoder.encode(`${content}|${configHash}`)

  // Create a simple hash from the bytes
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]
    if (byte !== undefined) {
      hash = ((hash << 5) - hash + byte) & 0xffffffff
    }
  }

  // Convert to base36 and ensure it's always 32 chars
  const hashStr =
    Math.abs(hash).toString(36).padStart(8, '0') +
    Math.abs(hash ^ 0xaaaaaaaa)
      .toString(36)
      .padStart(8, '0')

  if (!hashStr) {
    throw new Error('Failed to generate cache key hash')
  }

  return `qr_${hashStr.substring(0, 32)}`
}

// Default QR code configuration
export const DEFAULT_QR_CONFIG: QrConfig = {
  size: 256,
  errorCorrectionLevel: 'M',
  margin: 4,
  colors: {
    dark: '#000000',
    light: '#FFFFFF',
  },
  includeMargin: true,
}

// QR code size presets
export const QR_SIZE_PRESETS = {
  SMALL: 128,
  MEDIUM: 256,
  LARGE: 512,
  EXTRA_LARGE: 1024,
} as const

// QR code error correction info
export const ERROR_CORRECTION_INFO = {
  L: {
    name: 'Low',
    recovery: '~7%',
    description: 'Good for clean environments',
  },
  M: {
    name: 'Medium',
    recovery: '~15%',
    description: 'Balanced option for most uses',
  },
  Q: {
    name: 'Quartile',
    recovery: '~25%',
    description: 'Good for potentially damaged codes',
  },
  H: {
    name: 'High',
    recovery: '~30%',
    description: 'Best for harsh environments',
  },
} as const
