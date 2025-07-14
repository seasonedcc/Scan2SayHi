import { z } from 'zod'

// Cookie options type
export type CookieOptions = {
  maxAge?: number
  path?: string
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

// Default cookie options
export const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  maxAge: 30 * 24 * 60 * 60, // 30 days
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
}

// LinkedIn URL cookie data schema
const linkedinUrlCookieSchema = z.object({
  url: z.string().url(),
  validatedAt: z.string().datetime(),
  lastUsed: z.string().datetime(),
  usageCount: z.number().int().nonnegative().default(0),
})

// QR configuration cookie data schema
const qrConfigCookieSchema = z.object({
  size: z.number().int().min(64).max(1024).default(256),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).default('M'),
  colors: z
    .object({
      dark: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .default('#000000'),
      light: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .default('#FFFFFF'),
    })
    .default({ dark: '#000000', light: '#FFFFFF' }),
  lastUpdated: z.string().datetime(),
})

// User preferences cookie data schema
const userPreferencesCookieSchema = z.object({
  showInstructions: z.boolean().default(true),
  enableOfflineQr: z.boolean().default(true),
  autoGenerateQr: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  lastUpdated: z.string().datetime(),
})

// Combined user data schema for main cookie
const userDataCookieSchema = z.object({
  linkedinUrl: linkedinUrlCookieSchema.optional(),
  qrConfig: qrConfigCookieSchema.optional(),
  preferences: userPreferencesCookieSchema.optional(),
  version: z.string().default('1.0'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Cookie validation result schema
const cookieValidationResultSchema = z.object({
  isValid: z.boolean(),
  data: userDataCookieSchema.optional(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  shouldReset: z.boolean().default(false),
})

// Export types
export type LinkedinUrlCookie = z.infer<typeof linkedinUrlCookieSchema>
export type QrConfigCookie = z.infer<typeof qrConfigCookieSchema>
export type UserPreferencesCookie = z.infer<typeof userPreferencesCookieSchema>
export type UserDataCookie = z.infer<typeof userDataCookieSchema>
export type CookieValidationResult = z.infer<
  typeof cookieValidationResultSchema
>

// Cookie names constants
export const COOKIE_NAMES = {
  USER_DATA: 'linkedin_card_data',
  SESSION_ID: 'linkedin_card_session',
  PREFERENCES: 'linkedin_card_prefs',
} as const

// Cookie size limits (browsers typically limit to 4KB per cookie)
export const COOKIE_LIMITS = {
  MAX_SIZE: 3900, // Leave some buffer
  MAX_URL_LENGTH: 2000, // Standard URL length limit
  MAX_COOKIES_PER_DOMAIN: 50,
} as const

export const validateLinkedinUrlCookie = (data: unknown) => {
  return linkedinUrlCookieSchema.safeParse(data)
}

export const validateQrConfigCookie = (data: unknown) => {
  return qrConfigCookieSchema.safeParse(data)
}

export const validateUserPreferencesCookie = (data: unknown) => {
  return userPreferencesCookieSchema.safeParse(data)
}

export const validateUserDataCookie = (data: unknown) => {
  return userDataCookieSchema.safeParse(data)
}

/**
 * Validate cookie data and check for corruption or expiration
 */
export const validateCookieData = (
  cookieValue: string | undefined
): CookieValidationResult => {
  if (!cookieValue) {
    return {
      isValid: false,
      errors: [], // Empty cookie is not an error - it's expected for new users
      warnings: [],
      shouldReset: false,
    }
  }

  try {
    // Try to parse JSON
    const parsedData = JSON.parse(cookieValue)

    // Validate against schema
    const validation = validateUserDataCookie(parsedData)

    if (!validation.success) {
      return {
        isValid: false,
        errors: validation.error.issues.map((issue) => issue.message),
        warnings: [],
        shouldReset: true, // Corrupted data should be reset
      }
    }

    const data = validation.data
    const warnings: string[] = []

    // Check for data freshness (warn if older than 90 days)
    const updatedAt = new Date(data.updatedAt)
    const now = new Date()
    const daysSinceUpdate =
      (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceUpdate > 90) {
      warnings.push('Cookie data is older than 90 days')
    }

    // Check for version compatibility
    if (data.version !== '1.0') {
      warnings.push(`Cookie version ${data.version} may be incompatible`)
    }

    // Validate LinkedIn URL if present
    if (data.linkedinUrl) {
      const urlValidatedAt = new Date(data.linkedinUrl.validatedAt)
      const daysSinceValidation =
        (now.getTime() - urlValidatedAt.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceValidation > 7) {
        warnings.push('LinkedIn URL validation is older than 7 days')
      }
    }

    return {
      isValid: true,
      data,
      errors: [],
      warnings,
      shouldReset: false,
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [
        `Failed to parse cookie JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      warnings: [],
      shouldReset: true,
    }
  }
}

/**
 * Create new user data cookie structure
 */
export const createUserDataCookie = (
  linkedinUrl?: string,
  qrConfig?: Partial<QrConfigCookie>,
  preferences?: Partial<UserPreferencesCookie>
): UserDataCookie => {
  const now = new Date().toISOString()

  const data: UserDataCookie = {
    version: '1.0',
    createdAt: now,
    updatedAt: now,
  }

  if (linkedinUrl) {
    data.linkedinUrl = {
      url: linkedinUrl,
      validatedAt: now,
      lastUsed: now,
      usageCount: 1,
    }
  }

  if (qrConfig) {
    data.qrConfig = {
      size: qrConfig.size || 256,
      errorCorrectionLevel: qrConfig.errorCorrectionLevel || 'M',
      colors: qrConfig.colors || { dark: '#000000', light: '#FFFFFF' },
      lastUpdated: now,
    }
  }

  if (preferences) {
    data.preferences = {
      showInstructions: preferences.showInstructions ?? true,
      enableOfflineQr: preferences.enableOfflineQr ?? true,
      autoGenerateQr: preferences.autoGenerateQr ?? true,
      theme: preferences.theme || 'auto',
      lastUpdated: now,
    }
  }

  return data
}

/**
 * Update existing user data cookie
 */
export const updateUserDataCookie = (
  existingData: UserDataCookie,
  updates: {
    linkedinUrl?: string
    qrConfig?: Partial<QrConfigCookie>
    preferences?: Partial<UserPreferencesCookie>
  }
): UserDataCookie => {
  const now = new Date().toISOString()

  const updatedData: UserDataCookie = {
    ...existingData,
    updatedAt: now,
  }

  if (updates.linkedinUrl) {
    const existingUrl = existingData.linkedinUrl

    updatedData.linkedinUrl = {
      url: updates.linkedinUrl,
      validatedAt: now,
      lastUsed: now,
      usageCount:
        existingUrl?.url === updates.linkedinUrl
          ? existingUrl.usageCount + 1
          : 1,
    }
  }

  if (updates.qrConfig) {
    const defaultConfig = {
      size: 256,
      errorCorrectionLevel: 'M' as const,
      colors: { dark: '#000000', light: '#FFFFFF' },
      lastUpdated: now,
    }

    updatedData.qrConfig = {
      ...defaultConfig,
      ...existingData.qrConfig,
      ...updates.qrConfig,
      lastUpdated: now,
    }
  }

  if (updates.preferences) {
    const defaultPreferences = {
      showInstructions: true,
      enableOfflineQr: true,
      autoGenerateQr: true,
      theme: 'auto' as const,
      lastUpdated: now,
    }

    updatedData.preferences = {
      ...defaultPreferences,
      ...existingData.preferences,
      ...updates.preferences,
      lastUpdated: now,
    }
  }

  return updatedData
}

/**
 * Check if cookie data exceeds size limits
 */
export const checkCookieSize = (
  data: UserDataCookie
): { isValid: boolean; size: number; maxSize: number } => {
  const serialized = JSON.stringify(data)
  const size = new Blob([serialized]).size

  return {
    isValid: size <= COOKIE_LIMITS.MAX_SIZE,
    size,
    maxSize: COOKIE_LIMITS.MAX_SIZE,
  }
}

/**
 * Sanitize cookie data to fit within size limits
 */
export const sanitizeCookieData = (
  data: UserDataCookie
): { sanitized: UserDataCookie; wasSanitized: boolean } => {
  const sizeCheck = checkCookieSize(data)

  if (sizeCheck.isValid) {
    return { sanitized: data, wasSanitized: false }
  }

  let wasSanitized = false

  // Remove least important data first
  const sanitized = { ...data }

  // Cap usage count first
  if (sanitized.linkedinUrl && sanitized.linkedinUrl.usageCount > 999) {
    sanitized.linkedinUrl = {
      ...sanitized.linkedinUrl,
      usageCount: Math.min(sanitized.linkedinUrl.usageCount, 999),
    }
    wasSanitized = true
  }

  // If still too large, remove non-essential data
  const newSizeCheck = checkCookieSize(sanitized)
  if (!newSizeCheck.isValid) {
    wasSanitized = true
    // Keep only essential data
    const essentialData = {
      version: sanitized.version,
      createdAt: sanitized.createdAt,
      updatedAt: sanitized.updatedAt,
      linkedinUrl: sanitized.linkedinUrl,
    }
    return { sanitized: essentialData, wasSanitized }
  }

  return { sanitized, wasSanitized }
}

/**
 * Generate secure cookie name with optional prefix
 */
export const generateCookieName = (
  baseName: string,
  prefix?: string
): string => {
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_')
  return prefix ? `${prefix}_${cleanBaseName}` : cleanBaseName
}

/**
 * Cookie cleanup utilities
 */
export const shouldCleanupCookie = (data: UserDataCookie): boolean => {
  const now = new Date()
  const updatedAt = new Date(data.updatedAt)
  const daysSinceUpdate =
    (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

  // Clean up if data is older than 90 days
  if (daysSinceUpdate > 90) {
    return true
  }

  // Clean up if version is incompatible
  if (data.version !== '1.0') {
    return true
  }

  // Clean up if LinkedIn URL is invalid or very old
  if (data.linkedinUrl) {
    const validatedAt = new Date(data.linkedinUrl.validatedAt)
    const daysSinceValidation =
      (now.getTime() - validatedAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceValidation > 30) {
      return true
    }
  }

  return false
}
