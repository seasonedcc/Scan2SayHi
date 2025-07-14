/**
 * Server-side cookie management for React Router v7
 *
 * This module provides secure cookie handling on the server-side using
 * React Router's built-in cookie utilities with proper validation and security.
 */

import { validateLinkedinUrl } from '../linkedin/linkedin.common'
import { normalizeLinkedinUrlServer } from '../linkedin/linkedin.server'
import {
  COOKIE_NAMES,
  type CookieOptions,
  checkCookieSize,
  createUserDataCookie,
  DEFAULT_COOKIE_OPTIONS,
  sanitizeCookieData,
  shouldCleanupCookie,
  type UserDataCookie,
  updateUserDataCookie,
  validateCookieData,
} from './cookies.common'

/**
 * Cookie manager for handling user data persistence
 */
export class CookieManager {
  private readonly cookieName: string
  private readonly options: CookieOptions

  constructor(
    cookieName = COOKIE_NAMES.USER_DATA,
    options = DEFAULT_COOKIE_OPTIONS
  ) {
    this.cookieName = cookieName
    this.options = options
  }

  /**
   * Parse cookie header string into key-value pairs
   */
  private parseCookieHeader(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {}

    if (!cookieHeader) return cookies

    cookieHeader.split(';').forEach((cookie) => {
      const [name, ...rest] = cookie.trim().split('=')
      if (name && rest.length > 0) {
        cookies[name] = decodeURIComponent(rest.join('='))
      }
    })

    return cookies
  }

  /**
   * Get user data from request cookies
   */
  getUserData(request: Request): {
    success: boolean
    data?: UserDataCookie
    errors: string[]
    warnings: string[]
    shouldReset: boolean
  } {
    try {
      const cookieHeader = request.headers.get('Cookie') || ''
      const cookies = this.parseCookieHeader(cookieHeader)
      const cookieValue = cookies[this.cookieName]

      const validation = validateCookieData(cookieValue)

      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
          shouldReset: validation.shouldReset,
        }
      }

      // Check if cookie should be cleaned up
      if (validation.data && shouldCleanupCookie(validation.data)) {
        return {
          success: false,
          errors: ['Cookie data is expired and should be reset'],
          warnings: ['Cookie data requires cleanup'],
          shouldReset: true,
        }
      }

      const returnValue: {
        success: boolean
        data?: UserDataCookie
        errors: string[]
        warnings: string[]
        shouldReset: boolean
      } = {
        success: true,
        errors: [],
        warnings: validation.warnings,
        shouldReset: false,
      }

      if (validation.data) {
        returnValue.data = validation.data
      }

      return returnValue
    } catch (error) {
      return {
        success: false,
        errors: [
          `Failed to parse cookies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
        shouldReset: true,
      }
    }
  }

  /**
   * Set user data cookie in response
   */
  setUserData(
    data: UserDataCookie,
    options?: Partial<CookieOptions>
  ): {
    success: boolean
    cookieHeader: string
    errors: string[]
    warnings: string[]
  } {
    try {
      // Sanitize data to fit within cookie size limits
      const sanitizationResult = sanitizeCookieData(data)
      const sanitizedData = sanitizationResult.sanitized
      const sizeCheck = checkCookieSize(sanitizedData)

      const warnings: string[] = []

      if (!sizeCheck.isValid) {
        return {
          success: false,
          cookieHeader: '',
          errors: [
            `Cookie data too large: ${sizeCheck.size} bytes (max: ${sizeCheck.maxSize})`,
          ],
          warnings: [],
        }
      }

      if (sanitizationResult.wasSanitized) {
        warnings.push('Cookie data was sanitized to fit size limits')
      }

      const cookieOptions = { ...this.options, ...options }
      const serializedData = JSON.stringify(sanitizedData)

      // Build cookie header
      const cookieParts = [
        `${this.cookieName}=${encodeURIComponent(serializedData)}`,
      ]

      if (cookieOptions.maxAge) {
        cookieParts.push(`Max-Age=${cookieOptions.maxAge}`)
      }

      if (cookieOptions.path) {
        cookieParts.push(`Path=${cookieOptions.path}`)
      }

      if (cookieOptions.httpOnly) {
        cookieParts.push('HttpOnly')
      }

      if (cookieOptions.secure) {
        cookieParts.push('Secure')
      }

      if (cookieOptions.sameSite) {
        cookieParts.push(`SameSite=${cookieOptions.sameSite}`)
      }

      return {
        success: true,
        cookieHeader: cookieParts.join('; '),
        errors: [],
        warnings,
      }
    } catch (error) {
      return {
        success: false,
        cookieHeader: '',
        errors: [
          `Failed to serialize cookie data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      }
    }
  }

  /**
   * Clear user data cookie
   */
  clearUserData(): string {
    return `${this.cookieName}=; Max-Age=0; Path=${this.options.path}; HttpOnly; Secure; SameSite=${this.options.sameSite}`
  }

  /**
   * Store LinkedIn URL with validation
   */
  async storeLinkedinUrl(
    request: Request,
    linkedinUrl: string
  ): Promise<{
    success: boolean
    cookieHeader?: string
    data?: UserDataCookie
    errors: string[]
    warnings: string[]
  }> {
    try {
      // Try to normalize and validate LinkedIn URL (supports usernames too)
      const urlNormalization = normalizeLinkedinUrlServer(linkedinUrl)
      let validatedUrl: string

      if (!urlNormalization.success) {
        // If normalization fails, try direct validation for existing URLs
        const urlValidation = validateLinkedinUrl(linkedinUrl)
        if (!urlValidation.success) {
          return {
            success: false,
            errors: [urlNormalization.error.message],
            warnings: [],
          }
        }
        // Use the directly validated URL
        validatedUrl = urlValidation.data
      } else {
        // Use the normalized URL
        validatedUrl = urlNormalization.data.normalizedUrl
      }

      // Get existing user data
      const existingData = this.getUserData(request)

      let userData: UserDataCookie

      if (existingData.success && existingData.data) {
        // Update existing data
        userData = updateUserDataCookie(existingData.data, {
          linkedinUrl: validatedUrl,
        })
      } else {
        // Create new data
        userData = createUserDataCookie(validatedUrl)
      }

      // Set cookie
      const setCookieResult = this.setUserData(userData)

      if (!setCookieResult.success) {
        return {
          success: false,
          errors: setCookieResult.errors,
          warnings: setCookieResult.warnings,
        }
      }

      return {
        success: true,
        cookieHeader: setCookieResult.cookieHeader,
        data: userData,
        errors: [],
        warnings: [...existingData.warnings, ...setCookieResult.warnings],
      }
    } catch (error) {
      return {
        success: false,
        errors: [
          `Failed to store LinkedIn URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      }
    }
  }

  /**
   * Update QR configuration
   */
  updateQrConfig(
    request: Request,
    qrConfig: {
      size?: number
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
      colors?: { dark: string; light: string }
    }
  ): {
    success: boolean
    cookieHeader?: string
    data?: UserDataCookie
    errors: string[]
    warnings: string[]
  } {
    try {
      // Get existing user data
      const existingData = this.getUserData(request)

      let userData: UserDataCookie

      if (existingData.success && existingData.data) {
        // Update existing data
        userData = updateUserDataCookie(existingData.data, {
          qrConfig,
        })
      } else {
        // Create new data with QR config
        userData = createUserDataCookie(undefined, qrConfig)
      }

      // Set cookie
      const setCookieResult = this.setUserData(userData)

      if (!setCookieResult.success) {
        return {
          success: false,
          errors: setCookieResult.errors,
          warnings: setCookieResult.warnings,
        }
      }

      return {
        success: true,
        cookieHeader: setCookieResult.cookieHeader,
        data: userData,
        errors: [],
        warnings: [...existingData.warnings, ...setCookieResult.warnings],
      }
    } catch (error) {
      return {
        success: false,
        errors: [
          `Failed to update QR config: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      }
    }
  }

  /**
   * Update user preferences
   */
  updatePreferences(
    request: Request,
    preferences: {
      showInstructions?: boolean
      enableOfflineQr?: boolean
      autoGenerateQr?: boolean
      theme?: 'light' | 'dark' | 'auto'
    }
  ): {
    success: boolean
    cookieHeader?: string
    data?: UserDataCookie
    errors: string[]
    warnings: string[]
  } {
    try {
      // Get existing user data
      const existingData = this.getUserData(request)

      let userData: UserDataCookie

      if (existingData.success && existingData.data) {
        // Update existing data
        userData = updateUserDataCookie(existingData.data, {
          preferences,
        })
      } else {
        // Create new data with preferences
        userData = createUserDataCookie(undefined, undefined, preferences)
      }

      // Set cookie
      const setCookieResult = this.setUserData(userData)

      if (!setCookieResult.success) {
        return {
          success: false,
          errors: setCookieResult.errors,
          warnings: setCookieResult.warnings,
        }
      }

      return {
        success: true,
        cookieHeader: setCookieResult.cookieHeader,
        data: userData,
        errors: [],
        warnings: [...existingData.warnings, ...setCookieResult.warnings],
      }
    } catch (error) {
      return {
        success: false,
        errors: [
          `Failed to update preferences: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      }
    }
  }

  /**
   * Increment LinkedIn URL usage count
   */
  incrementUrlUsage(request: Request): {
    success: boolean
    cookieHeader?: string
    data?: UserDataCookie
    errors: string[]
    warnings: string[]
  } {
    try {
      const existingData = this.getUserData(request)

      if (!existingData.success || !existingData.data?.linkedinUrl) {
        return {
          success: false,
          errors: ['No LinkedIn URL found to increment usage'],
          warnings: [],
        }
      }

      const userData = updateUserDataCookie(existingData.data, {
        linkedinUrl: existingData.data.linkedinUrl.url, // This will increment usage count
      })

      const setCookieResult = this.setUserData(userData)

      if (!setCookieResult.success) {
        return {
          success: false,
          errors: setCookieResult.errors,
          warnings: setCookieResult.warnings,
        }
      }

      return {
        success: true,
        cookieHeader: setCookieResult.cookieHeader,
        data: userData,
        errors: [],
        warnings: [...existingData.warnings, ...setCookieResult.warnings],
      }
    } catch (error) {
      return {
        success: false,
        errors: [
          `Failed to increment URL usage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      }
    }
  }
}

/**
 * Default cookie manager instance
 */
const defaultCookieManager = new CookieManager()

/**
 * Utility functions for cookie management
 */

/**
 * Extract user data from request and handle errors gracefully
 */
export const getUserDataFromRequest = (request: Request) => {
  return defaultCookieManager.getUserData(request)
}

/**
 * Create response headers with user data cookie
 */
export const createUserDataCookieHeaders = (
  data: UserDataCookie,
  options?: Partial<CookieOptions>
): Headers => {
  const headers = new Headers()
  const result = defaultCookieManager.setUserData(data, options)

  if (result.success) {
    headers.set('Set-Cookie', result.cookieHeader)
  }

  return headers
}

/**
 * Create response headers to clear user data cookie
 */
export const createClearCookieHeaders = (): Headers => {
  const headers = new Headers()
  headers.set('Set-Cookie', defaultCookieManager.clearUserData())
  return headers
}

/**
 * Middleware helper to handle cookie validation and cleanup
 */
export const handleCookieValidation = (
  request: Request
): {
  userData?: UserDataCookie
  shouldClearCookie: boolean
  warnings: string[]
  errors: string[]
} => {
  const result = defaultCookieManager.getUserData(request)

  const returnValue: {
    userData?: UserDataCookie
    shouldClearCookie: boolean
    warnings: string[]
    errors: string[]
  } = {
    shouldClearCookie: result.shouldReset,
    warnings: result.warnings,
    errors: result.errors,
  }

  if (result.data) {
    returnValue.userData = result.data
  }

  return returnValue
}

/**
 * Helper to store LinkedIn URL and return cookie headers
 */
export const storeLinkedinUrlAndGetHeaders = async (
  request: Request,
  linkedinUrl: string
): Promise<{
  success: boolean
  headers?: Headers
  userData?: UserDataCookie
  errors: string[]
  warnings: string[]
}> => {
  const result = await defaultCookieManager.storeLinkedinUrl(
    request,
    linkedinUrl
  )

  if (!result.success || !result.cookieHeader) {
    return {
      success: false,
      errors: result.errors,
      warnings: result.warnings,
    }
  }

  const headers = new Headers()
  headers.set('Set-Cookie', result.cookieHeader)

  const returnValue: {
    success: boolean
    headers?: Headers
    userData?: UserDataCookie
    errors: string[]
    warnings: string[]
  } = {
    success: true,
    errors: result.errors,
    warnings: result.warnings,
  }

  if (headers) {
    returnValue.headers = headers
  }

  if (result.data) {
    returnValue.userData = result.data
  }

  return returnValue
}

export const updateQrConfigAndGetHeaders = async (
  request: Request,
  qrConfig: {
    size?: number
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    colors?: { dark: string; light: string }
  }
): Promise<{
  success: boolean
  headers?: Headers
  userData?: UserDataCookie
  errors: string[]
  warnings: string[]
}> => {
  const result = await defaultCookieManager.updateQrConfig(request, qrConfig)

  if (!result.success || !result.cookieHeader) {
    return {
      success: false,
      errors: result.errors,
      warnings: result.warnings,
    }
  }

  const headers = new Headers()
  headers.set('Set-Cookie', result.cookieHeader)

  const returnValue: {
    success: boolean
    headers?: Headers
    userData?: UserDataCookie
    errors: string[]
    warnings: string[]
  } = {
    success: true,
    errors: result.errors,
    warnings: result.warnings,
  }

  if (headers) {
    returnValue.headers = headers
  }

  if (result.data) {
    returnValue.userData = result.data
  }

  return returnValue
}

/**
 * Session management utilities
 */
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Create session cookie
 */
export const createSessionCookie = (sessionId: string): string => {
  const options = {
    ...DEFAULT_COOKIE_OPTIONS,
    maxAge: 24 * 60 * 60, // 24 hours
  }

  const cookieParts = [
    `${COOKIE_NAMES.SESSION_ID}=${sessionId}`,
    `Max-Age=${options.maxAge}`,
    `Path=${options.path}`,
  ]

  if (options.httpOnly) cookieParts.push('HttpOnly')
  if (options.secure) cookieParts.push('Secure')
  if (options.sameSite) cookieParts.push(`SameSite=${options.sameSite}`)

  return cookieParts.join('; ')
}

/**
 * Cookie cleanup utilities for maintenance
 */
export const getExpiredCookieCleanupHeaders = (): Headers => {
  const headers = new Headers()

  // Clear all potential cookie names that might be stale
  const cookieNamesToClean = [
    COOKIE_NAMES.USER_DATA,
    COOKIE_NAMES.SESSION_ID,
    COOKIE_NAMES.PREFERENCES,
    // Add any legacy cookie names here
    'linkedin_url', // Legacy
    'qr_config', // Legacy
  ]

  cookieNamesToClean.forEach((name) => {
    headers.append(
      'Set-Cookie',
      `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=lax`
    )
  })

  return headers
}
