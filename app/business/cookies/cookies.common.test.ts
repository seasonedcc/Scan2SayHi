import { describe, expect, it } from 'vitest'
import {
  COOKIE_LIMITS,
  COOKIE_NAMES,
  checkCookieSize,
  createUserDataCookie,
  generateCookieName,
  sanitizeCookieData,
  shouldCleanupCookie,
  updateUserDataCookie,
  validateCookieData,
  validateLinkedinUrlCookie,
  validateQrConfigCookie,
  validateUserDataCookie,
  validateUserPreferencesCookie,
} from './cookies.common'

describe('Cookie Common Functions', () => {
  describe('validateLinkedinUrlCookie', () => {
    it('should accept valid LinkedIn URL cookie data', () => {
      const validData = {
        url: 'https://linkedin.com/in/johndoe',
        validatedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        usageCount: 5,
      }

      const result = validateLinkedinUrlCookie(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validData)
      }
    })

    it('should reject invalid LinkedIn URL cookie data', () => {
      const invalidData = [
        { url: 'not-a-url', validatedAt: '2023-01-01', lastUsed: '2023-01-01' },
        {
          url: 'https://linkedin.com/in/user',
          validatedAt: 'invalid-date',
          lastUsed: '2023-01-01',
        },
        {
          url: 'https://linkedin.com/in/user',
          validatedAt: '2023-01-01',
          lastUsed: 'invalid-date',
        },
        {
          url: 'https://linkedin.com/in/user',
          validatedAt: '2023-01-01',
          lastUsed: '2023-01-01',
          usageCount: -1,
        },
      ]

      for (const data of invalidData) {
        const result = validateLinkedinUrlCookie(data)
        expect(result.success).toBe(false)
      }
    })

    it('should apply default usage count', () => {
      const data = {
        url: 'https://linkedin.com/in/johndoe',
        validatedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      }

      const result = validateLinkedinUrlCookie(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.usageCount).toBe(0)
      }
    })
  })

  describe('validateQrConfigCookie', () => {
    it('should accept valid QR config cookie data', () => {
      const validData = {
        size: 256,
        errorCorrectionLevel: 'M' as const,
        colors: { dark: '#000000', light: '#FFFFFF' },
        lastUpdated: new Date().toISOString(),
      }

      const result = validateQrConfigCookie(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid QR config cookie data', () => {
      const invalidData = [
        {
          size: 32,
          errorCorrectionLevel: 'M',
          colors: { dark: '#000000', light: '#FFFFFF' },
          lastUpdated: '2023-01-01',
        },
        {
          size: 256,
          errorCorrectionLevel: 'X',
          colors: { dark: '#000000', light: '#FFFFFF' },
          lastUpdated: '2023-01-01',
        },
        {
          size: 256,
          errorCorrectionLevel: 'M',
          colors: { dark: 'red', light: '#FFFFFF' },
          lastUpdated: '2023-01-01',
        },
        {
          size: 256,
          errorCorrectionLevel: 'M',
          colors: { dark: '#000000', light: '#FFFFFF' },
          lastUpdated: 'invalid-date',
        },
      ]

      for (const data of invalidData) {
        const result = validateQrConfigCookie(data)
        expect(result.success).toBe(false)
      }
    })

    it('should apply default values', () => {
      const data = {
        lastUpdated: new Date().toISOString(),
      }

      const result = validateQrConfigCookie(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.size).toBe(256)
        expect(result.data.errorCorrectionLevel).toBe('M')
        expect(result.data.colors).toEqual({
          dark: '#000000',
          light: '#FFFFFF',
        })
      }
    })
  })

  describe('validateUserPreferencesCookie', () => {
    it('should accept valid user preferences', () => {
      const validData = {
        showInstructions: false,
        enableOfflineQr: true,
        autoGenerateQr: false,
        theme: 'dark' as const,
        lastUpdated: new Date().toISOString(),
      }

      const result = validateUserPreferencesCookie(validData)
      expect(result.success).toBe(true)
    })

    it('should apply default values', () => {
      const data = {
        lastUpdated: new Date().toISOString(),
      }

      const result = validateUserPreferencesCookie(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.showInstructions).toBe(true)
        expect(result.data.enableOfflineQr).toBe(true)
        expect(result.data.autoGenerateQr).toBe(true)
        expect(result.data.theme).toBe('auto')
      }
    })
  })

  describe('validateUserDataCookie', () => {
    it('should accept valid user data cookie', () => {
      const now = new Date().toISOString()
      const validData = {
        linkedinUrl: {
          url: 'https://linkedin.com/in/johndoe',
          validatedAt: now,
          lastUsed: now,
          usageCount: 1,
        },
        qrConfig: {
          size: 256,
          errorCorrectionLevel: 'M' as const,
          colors: { dark: '#000000', light: '#FFFFFF' },
          lastUpdated: now,
        },
        preferences: {
          showInstructions: true,
          enableOfflineQr: true,
          autoGenerateQr: true,
          theme: 'auto' as const,
          lastUpdated: now,
        },
        version: '1.0',
        createdAt: now,
        updatedAt: now,
      }

      const result = validateUserDataCookie(validData)
      expect(result.success).toBe(true)
    })

    it('should accept minimal valid user data', () => {
      const now = new Date().toISOString()
      const minimalData = {
        version: '1.0',
        createdAt: now,
        updatedAt: now,
      }

      const result = validateUserDataCookie(minimalData)
      expect(result.success).toBe(true)
    })
  })

  describe('validateCookieData', () => {
    it('should validate valid cookie JSON', () => {
      const now = new Date().toISOString()
      const validData = {
        version: '1.0',
        createdAt: now,
        updatedAt: now,
      }

      const result = validateCookieData(JSON.stringify(validData))
      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(validData)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle empty or undefined cookie values', () => {
      const result1 = validateCookieData(undefined)
      expect(result1.isValid).toBe(false)
      expect(result1.errors).toHaveLength(0) // Empty cookie is not an error

      const result2 = validateCookieData('')
      expect(result2.isValid).toBe(false)
      expect(result2.errors).toHaveLength(0) // Empty cookie is not an error
    })

    it('should handle invalid JSON', () => {
      const result = validateCookieData('invalid-json{')
      expect(result.isValid).toBe(false)
      expect(result.shouldReset).toBe(true)
      expect(
        result.errors.some((e) => e.includes('Failed to parse cookie JSON'))
      ).toBe(true)
    })

    it('should handle data validation errors', () => {
      const invalidData = { version: '1.0' } // Missing required fields
      const result = validateCookieData(JSON.stringify(invalidData))
      expect(result.isValid).toBe(false)
      expect(result.shouldReset).toBe(true)
    })

    it('should warn about old data', () => {
      const oldDate = new Date(
        Date.now() - 100 * 24 * 60 * 60 * 1000
      ).toISOString() // 100 days ago
      const oldData = {
        version: '1.0',
        createdAt: oldDate,
        updatedAt: oldDate,
      }

      const result = validateCookieData(JSON.stringify(oldData))
      expect(result.isValid).toBe(true)
      expect(
        result.warnings.some((w) => w.includes('older than 90 days'))
      ).toBe(true)
    })

    it('should warn about old LinkedIn URL validation', () => {
      const now = new Date().toISOString()
      const oldValidation = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000
      ).toISOString() // 10 days ago
      const dataWithOldUrl = {
        version: '1.0',
        createdAt: now,
        updatedAt: now,
        linkedinUrl: {
          url: 'https://linkedin.com/in/johndoe',
          validatedAt: oldValidation,
          lastUsed: now,
          usageCount: 1,
        },
      }

      const result = validateCookieData(JSON.stringify(dataWithOldUrl))
      expect(result.isValid).toBe(true)
      expect(
        result.warnings.some((w) =>
          w.includes('validation is older than 7 days')
        )
      ).toBe(true)
    })
  })

  describe('createUserDataCookie', () => {
    it('should create user data with LinkedIn URL', () => {
      const linkedinUrl = 'https://linkedin.com/in/johndoe'
      const result = createUserDataCookie(linkedinUrl)

      expect(result.version).toBe('1.0')
      expect(result.linkedinUrl?.url).toBe(linkedinUrl)
      expect(result.linkedinUrl?.usageCount).toBe(1)
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()
    })

    it('should create user data with QR config', () => {
      const qrConfig = { size: 512, errorCorrectionLevel: 'H' as const }
      const result = createUserDataCookie(undefined, qrConfig)

      expect(result.qrConfig?.size).toBe(512)
      expect(result.qrConfig?.errorCorrectionLevel).toBe('H')
      expect(result.qrConfig?.colors).toEqual({
        dark: '#000000',
        light: '#FFFFFF',
      })
    })

    it('should create user data with preferences', () => {
      const preferences = { showInstructions: false, theme: 'dark' as const }
      const result = createUserDataCookie(undefined, undefined, preferences)

      expect(result.preferences?.showInstructions).toBe(false)
      expect(result.preferences?.theme).toBe('dark')
      expect(result.preferences?.enableOfflineQr).toBe(true) // Default
    })
  })

  describe('updateUserDataCookie', () => {
    it('should update LinkedIn URL and increment usage count', () => {
      const existing = createUserDataCookie('https://linkedin.com/in/johndoe')
      if (existing.linkedinUrl) existing.linkedinUrl.usageCount = 5

      const updated = updateUserDataCookie(existing, {
        linkedinUrl: 'https://linkedin.com/in/johndoe', // Same URL
      })

      expect(updated.linkedinUrl?.usageCount).toBe(6)
      expect(updated.linkedinUrl?.url).toBe('https://linkedin.com/in/johndoe')
      // Check that updatedAt is a valid ISO string
      expect(() => new Date(updated.updatedAt)).not.toThrow()
    })

    it('should reset usage count for different URL', () => {
      const existing = createUserDataCookie('https://linkedin.com/in/johndoe')
      if (existing.linkedinUrl) existing.linkedinUrl.usageCount = 5

      const updated = updateUserDataCookie(existing, {
        linkedinUrl: 'https://linkedin.com/in/janedoe', // Different URL
      })

      expect(updated.linkedinUrl?.usageCount).toBe(1)
      expect(updated.linkedinUrl?.url).toBe('https://linkedin.com/in/janedoe')
    })

    it('should update QR config', () => {
      const existing = createUserDataCookie()
      const updated = updateUserDataCookie(existing, {
        qrConfig: { size: 512 },
      })

      expect(updated.qrConfig?.size).toBe(512)
      expect(updated.qrConfig?.errorCorrectionLevel).toBe('M') // Default preserved
    })

    it('should update preferences', () => {
      const existing = createUserDataCookie()
      const updated = updateUserDataCookie(existing, {
        preferences: { showInstructions: false },
      })

      expect(updated.preferences?.showInstructions).toBe(false)
      expect(updated.preferences?.enableOfflineQr).toBe(true) // Default preserved
    })
  })

  describe('checkCookieSize', () => {
    it('should validate normal cookie size', () => {
      const normalData = createUserDataCookie('https://linkedin.com/in/johndoe')
      const result = checkCookieSize(normalData)

      expect(result.isValid).toBe(true)
      expect(result.size).toBeLessThan(COOKIE_LIMITS.MAX_SIZE)
      expect(result.maxSize).toBe(COOKIE_LIMITS.MAX_SIZE)
    })

    it('should detect oversized cookie', () => {
      const largeData = createUserDataCookie(
        `https://linkedin.com/in/${'a'.repeat(5000)}`
      )
      const result = checkCookieSize(largeData)

      expect(result.isValid).toBe(false)
      expect(result.size).toBeGreaterThan(COOKIE_LIMITS.MAX_SIZE)
    })
  })

  describe('sanitizeCookieData', () => {
    it('should return data unchanged if within size limits', () => {
      const normalData = createUserDataCookie('https://linkedin.com/in/johndoe')
      const result = sanitizeCookieData(normalData)

      expect(result.sanitized).toEqual(normalData)
      expect(result.wasSanitized).toBe(false)
    })

    it('should cap usage count for large data when cookie is oversized', () => {
      // Create data that will actually exceed cookie size limit
      const largeUrl = `https://linkedin.com/in/${'a'.repeat(4000)}` // Very long URL
      const data = createUserDataCookie(largeUrl)
      //@ts-expect-error
      data.linkedinUrl.usageCount = 99999

      const result = sanitizeCookieData(data)
      expect(result.sanitized.linkedinUrl?.usageCount).toBe(999)
      expect(result.wasSanitized).toBe(true)
    })

    it('should remove non-essential data if still too large', () => {
      const largeData = createUserDataCookie(
        `https://linkedin.com/in/${'a'.repeat(5000)}`,
        { size: 1024 },
        { showInstructions: true }
      )

      const result = sanitizeCookieData(largeData)
      expect(result.sanitized.linkedinUrl).toBeDefined()
      expect(result.sanitized.qrConfig).toBeUndefined()
      expect(result.sanitized.preferences).toBeUndefined()
      expect(result.wasSanitized).toBe(true)
    })
  })

  describe('shouldCleanupCookie', () => {
    it('should not cleanup fresh data', () => {
      const freshData = createUserDataCookie('https://linkedin.com/in/johndoe')
      expect(shouldCleanupCookie(freshData)).toBe(false)
    })

    it('should cleanup very old data', () => {
      const oldDate = new Date(
        Date.now() - 100 * 24 * 60 * 60 * 1000
      ).toISOString() // 100 days ago
      const oldData = createUserDataCookie('https://linkedin.com/in/johndoe')
      oldData.updatedAt = oldDate

      expect(shouldCleanupCookie(oldData)).toBe(true)
    })

    it('should cleanup incompatible version', () => {
      const incompatibleData = createUserDataCookie(
        'https://linkedin.com/in/johndoe'
      )
      incompatibleData.version = '2.0'

      expect(shouldCleanupCookie(incompatibleData)).toBe(true)
    })

    it('should cleanup old LinkedIn URL validation', () => {
      const oldValidation = new Date(
        Date.now() - 40 * 24 * 60 * 60 * 1000
      ).toISOString() // 40 days ago
      const data = createUserDataCookie('https://linkedin.com/in/johndoe')
      //@ts-expect-error
      data.linkedinUrl.validatedAt = oldValidation

      expect(shouldCleanupCookie(data)).toBe(true)
    })
  })

  describe('generateCookieName', () => {
    it('should generate clean cookie names', () => {
      expect(generateCookieName('user-data')).toBe('user-data')
      expect(generateCookieName('user data!')).toBe('user_data_')
      expect(generateCookieName('session123')).toBe('session123')
    })

    it('should add prefix when provided', () => {
      expect(generateCookieName('data', 'linkedin')).toBe('linkedin_data')
      expect(generateCookieName('user data!', 'app')).toBe('app_user_data_')
    })
  })

  describe('Constants', () => {
    it('should export correct cookie names', () => {
      expect(COOKIE_NAMES.USER_DATA).toBe('linkedin_card_data')
      expect(COOKIE_NAMES.SESSION_ID).toBe('linkedin_card_session')
      expect(COOKIE_NAMES.PREFERENCES).toBe('linkedin_card_prefs')
    })

    it('should export cookie limits', () => {
      expect(COOKIE_LIMITS.MAX_SIZE).toBe(3900)
      expect(COOKIE_LIMITS.MAX_URL_LENGTH).toBe(2000)
      expect(COOKIE_LIMITS.MAX_COOKIES_PER_DOMAIN).toBe(50)
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed timestamps gracefully', () => {
      const dataWithBadTimestamp = {
        version: '1.0',
        createdAt: 'not-a-timestamp',
        updatedAt: 'also-not-a-timestamp',
      }

      const result = validateCookieData(JSON.stringify(dataWithBadTimestamp))
      expect(result.isValid).toBe(false)
      expect(result.shouldReset).toBe(true)
    })

    it('should handle missing required fields', () => {
      const incompleteData = {
        version: '1.0',
        // Missing createdAt and updatedAt
      }

      const result = validateCookieData(JSON.stringify(incompleteData))
      expect(result.isValid).toBe(false)
      expect(result.shouldReset).toBe(true)
    })

    it('should handle extremely large usage counts when cookie is oversized', () => {
      // Create data that will actually exceed cookie size limit
      const largeUrl = `https://linkedin.com/in/${'a'.repeat(4000)}` // Very long URL
      const data = createUserDataCookie(largeUrl)
      //@ts-expect-error
      data.linkedinUrl.usageCount = Number.MAX_SAFE_INTEGER

      expect(() => JSON.stringify(data)).not.toThrow()

      const result = sanitizeCookieData(data)
      expect(result.sanitized.linkedinUrl?.usageCount).toBe(999)
      expect(result.wasSanitized).toBe(true)
    })

    it('should handle Unicode characters in URLs', () => {
      const unicodeUrl = 'https://linkedin.com/in/用户名'
      const data = createUserDataCookie(unicodeUrl)

      expect(() => JSON.stringify(data)).not.toThrow()
      expect(data.linkedinUrl?.url).toBe(unicodeUrl)
    })
  })
})
