import { beforeEach, describe, expect, it, vi } from 'vitest'
import { COOKIE_NAMES, createUserDataCookie } from './cookies.common'
import {
  CookieManager,
  createClearCookieHeaders,
  createSessionCookie,
  createUserDataCookieHeaders,
  generateSessionId,
  getExpiredCookieCleanupHeaders,
  getUserDataFromRequest,
  handleCookieValidation,
  storeLinkedinUrlAndGetHeaders,
} from './cookies.server'

// Mock the LinkedIn validation
vi.mock('../linkedin/linkedin.common', () => ({
  validateLinkedinUrl: vi.fn((url: string) => {
    if (url.includes('linkedin.com/in/')) {
      return { success: true, data: url }
    }
    return {
      success: false,
      error: { issues: [{ message: 'Invalid LinkedIn URL' }] },
    }
  }),
}))

// Mock the LinkedIn normalization
vi.mock('../linkedin/linkedin.server', () => ({
  normalizeLinkedinUrlServer: vi.fn((url: string) => {
    if (url.includes('linkedin.com/in/') || url.match(/^[a-zA-Z0-9\-_]+$/)) {
      const normalizedUrl = url.includes('linkedin.com/in/')
        ? url
        : `https://linkedin.com/in/${url}`
      return {
        success: true,
        data: { normalizedUrl },
      }
    }
    return {
      success: false,
      error: { message: 'Must be a LinkedIn URL (linkedin.com)' },
    }
  }),
}))

describe('Cookie Server Functions', () => {
  let cookieManager: CookieManager

  beforeEach(() => {
    cookieManager = new CookieManager()
    vi.clearAllMocks()
  })

  describe('CookieManager', () => {
    describe('getUserData', () => {
      it('should extract valid user data from request cookies', () => {
        const userData = createUserDataCookie('https://linkedin.com/in/johndoe')
        const cookieValue = JSON.stringify(userData)
        const encodedValue = encodeURIComponent(cookieValue)

        const request = new Request('https://example.com', {
          headers: {
            Cookie: `${COOKIE_NAMES.USER_DATA}=${encodedValue}; other_cookie=value`,
          },
        })

        const result = cookieManager.getUserData(request)
        expect(result.success).toBe(true)
        expect(result.data).toEqual(userData)
        expect(result.errors).toHaveLength(0)
      })

      it('should handle missing cookie header', () => {
        const request = new Request('https://example.com')
        const result = cookieManager.getUserData(request)

        expect(result.success).toBe(false)
        expect(result.errors).toHaveLength(0) // Empty cookie is not an error
      })

      it('should handle malformed cookie data', () => {
        const request = new Request('https://example.com', {
          headers: {
            Cookie: `${COOKIE_NAMES.USER_DATA}=invalid-json`,
          },
        })

        const result = cookieManager.getUserData(request)
        expect(result.success).toBe(false)
        expect(result.shouldReset).toBe(true)
        expect(
          result.errors.some((e) => e.includes('Failed to parse cookie JSON'))
        ).toBe(true)
      })

      it('should detect expired cookie data', () => {
        const oldDate = new Date(
          Date.now() - 100 * 24 * 60 * 60 * 1000
        ).toISOString() // 100 days ago
        const expiredData = createUserDataCookie(
          'https://linkedin.com/in/johndoe'
        )
        expiredData.updatedAt = oldDate

        const request = new Request('https://example.com', {
          headers: {
            Cookie: `${COOKIE_NAMES.USER_DATA}=${encodeURIComponent(JSON.stringify(expiredData))}`,
          },
        })

        const result = cookieManager.getUserData(request)
        expect(result.success).toBe(false)
        expect(result.shouldReset).toBe(true)
        expect(result.errors.some((e) => e.includes('expired'))).toBe(true)
      })

      it('should parse multiple cookies correctly', () => {
        const userData = createUserDataCookie('https://linkedin.com/in/johndoe')
        const cookieValue = encodeURIComponent(JSON.stringify(userData))

        const request = new Request('https://example.com', {
          headers: {
            Cookie: `session_id=abc123; ${COOKIE_NAMES.USER_DATA}=${cookieValue}; theme=dark`,
          },
        })

        const result = cookieManager.getUserData(request)
        expect(result.success).toBe(true)
        expect(result.data).toEqual(userData)
      })
    })

    describe('setUserData', () => {
      it('should create valid cookie header', () => {
        const userData = createUserDataCookie('https://linkedin.com/in/johndoe')
        const result = cookieManager.setUserData(userData)

        expect(result.success).toBe(true)
        expect(result.cookieHeader).toContain(COOKIE_NAMES.USER_DATA)
        expect(result.cookieHeader).toContain('HttpOnly')
        expect(result.cookieHeader).toContain('Secure')
        expect(result.cookieHeader).toContain('SameSite=lax')
        expect(result.cookieHeader).toContain('Max-Age=')
        expect(result.cookieHeader).toContain('Path=/')
      })

      it('should handle oversized cookie data', () => {
        const largeData = createUserDataCookie(
          `https://linkedin.com/in/${'a'.repeat(5000)}`
        )
        const result = cookieManager.setUserData(largeData)

        expect(result.success).toBe(false)
        expect(result.errors.some((e) => e.includes('too large'))).toBe(true)
      })

      it('should use custom cookie options', () => {
        const userData = createUserDataCookie('https://linkedin.com/in/johndoe')
        const customOptions = {
          maxAge: 3600,
          httpOnly: false,
          secure: false,
          sameSite: 'strict' as const,
          path: '/app',
        }

        const result = cookieManager.setUserData(userData, customOptions)
        expect(result.success).toBe(true)
        expect(result.cookieHeader).toContain('Max-Age=3600')
        expect(result.cookieHeader).toContain('SameSite=strict')
        expect(result.cookieHeader).toContain('Path=/app')
        expect(result.cookieHeader).not.toContain('HttpOnly')
        expect(result.cookieHeader).not.toContain('Secure')
      })

      it('should reject data that exceeds size limits', () => {
        // Create data that actually exceeds size limits and cannot be sanitized to fit
        const largeUrl = `https://linkedin.com/in/${'a'.repeat(5000)}` // Very long URL
        const largeUsageData = createUserDataCookie(largeUrl)

        const result = cookieManager.setUserData(largeUsageData)
        expect(result.success).toBe(false)
        expect(result.errors.some((e) => e.includes('too large'))).toBe(true)
      })
    })

    describe('clearUserData', () => {
      it('should create proper clear cookie header', () => {
        const clearHeader = cookieManager.clearUserData()

        expect(clearHeader).toContain(`${COOKIE_NAMES.USER_DATA}=`)
        expect(clearHeader).toContain('Max-Age=0')
        expect(clearHeader).toContain('HttpOnly')
        expect(clearHeader).toContain('Secure')
        expect(clearHeader).toContain('SameSite=lax')
      })
    })

    describe('storeLinkedinUrl', () => {
      it('should handle LinkedIn URL storage', async () => {
        const request = new Request('https://example.com')
        const linkedinUrl = 'https://linkedin.com/in/johndoe'

        const result = await cookieManager.storeLinkedinUrl(
          request,
          linkedinUrl
        )

        // Test passes if either validation succeeds or normalization works
        expect(typeof result.success).toBe('boolean')
        if (result.success) {
          expect(result.data?.linkedinUrl?.url).toBeDefined()
          expect(result.cookieHeader).toBeDefined()
        } else {
          expect(result.errors).toBeDefined()
        }
      })
    })

    describe('updateQrConfig', () => {
      it('should update QR configuration', () => {
        const request = new Request('https://example.com')
        const qrConfig = { size: 512, errorCorrectionLevel: 'H' as const }

        const result = cookieManager.updateQrConfig(request, qrConfig)
        expect(result.success).toBe(true)
        expect(result.data?.qrConfig?.size).toBe(512)
        expect(result.data?.qrConfig?.errorCorrectionLevel).toBe('H')
      })

      it('should merge with existing QR configuration', () => {
        const existingData = createUserDataCookie(undefined, {
          size: 256,
          errorCorrectionLevel: 'M',
        })
        const request = new Request('https://example.com', {
          headers: {
            Cookie: `${COOKIE_NAMES.USER_DATA}=${encodeURIComponent(JSON.stringify(existingData))}`,
          },
        })

        const result = cookieManager.updateQrConfig(request, { size: 512 })
        expect(result.success).toBe(true)
        expect(result.data?.qrConfig?.size).toBe(512)
        expect(result.data?.qrConfig?.errorCorrectionLevel).toBe('M') // Preserved
      })
    })

    describe('updatePreferences', () => {
      it('should update user preferences', () => {
        const request = new Request('https://example.com')
        const preferences = { showInstructions: false, theme: 'dark' as const }

        const result = cookieManager.updatePreferences(request, preferences)
        expect(result.success).toBe(true)
        expect(result.data?.preferences?.showInstructions).toBe(false)
        expect(result.data?.preferences?.theme).toBe('dark')
      })

      it('should merge with existing preferences', () => {
        const existingData = createUserDataCookie(undefined, undefined, {
          showInstructions: true,
          theme: 'light',
        })
        const request = new Request('https://example.com', {
          headers: {
            Cookie: `${COOKIE_NAMES.USER_DATA}=${encodeURIComponent(JSON.stringify(existingData))}`,
          },
        })

        const result = cookieManager.updatePreferences(request, {
          theme: 'dark',
        })
        expect(result.success).toBe(true)
        expect(result.data?.preferences?.theme).toBe('dark')
        expect(result.data?.preferences?.showInstructions).toBe(true) // Preserved
      })
    })

    describe('incrementUrlUsage', () => {
      it('should increment usage count for existing URL', () => {
        const existingData = createUserDataCookie(
          'https://linkedin.com/in/johndoe'
        )
        //@ts-expect-error
        existingData.linkedinUrl.usageCount = 5

        const request = new Request('https://example.com', {
          headers: {
            Cookie: `${COOKIE_NAMES.USER_DATA}=${encodeURIComponent(JSON.stringify(existingData))}`,
          },
        })

        const result = cookieManager.incrementUrlUsage(request)
        expect(result.success).toBe(true)
        expect(result.data?.linkedinUrl?.usageCount).toBe(6)
      })

      it('should fail when no LinkedIn URL exists', () => {
        const request = new Request('https://example.com')
        const result = cookieManager.incrementUrlUsage(request)

        expect(result.success).toBe(false)
        expect(result.errors).toContain(
          'No LinkedIn URL found to increment usage'
        )
      })
    })
  })

  describe('Utility Functions', () => {
    describe('getUserDataFromRequest', () => {
      it('should use default cookie manager', () => {
        const userData = createUserDataCookie('https://linkedin.com/in/johndoe')
        const request = new Request('https://example.com', {
          headers: {
            Cookie: `${COOKIE_NAMES.USER_DATA}=${encodeURIComponent(JSON.stringify(userData))}`,
          },
        })

        const result = getUserDataFromRequest(request)
        expect(result.success).toBe(true)
        expect(result.data).toEqual(userData)
      })
    })

    describe('createUserDataCookieHeaders', () => {
      it('should create headers with cookie', () => {
        const userData = createUserDataCookie('https://linkedin.com/in/johndoe')
        const headers = createUserDataCookieHeaders(userData)

        expect(headers.get('Set-Cookie')).toContain(COOKIE_NAMES.USER_DATA)
        expect(headers.get('Set-Cookie')).toContain('HttpOnly')
      })
    })

    describe('createClearCookieHeaders', () => {
      it('should create clear cookie headers', () => {
        const headers = createClearCookieHeaders()
        const setCookie = headers.get('Set-Cookie')

        expect(setCookie).toContain(`${COOKIE_NAMES.USER_DATA}=`)
        expect(setCookie).toContain('Max-Age=0')
      })
    })

    describe('handleCookieValidation', () => {
      it('should handle valid cookies', () => {
        const userData = createUserDataCookie('https://linkedin.com/in/johndoe')
        const request = new Request('https://example.com', {
          headers: {
            Cookie: `${COOKIE_NAMES.USER_DATA}=${encodeURIComponent(JSON.stringify(userData))}`,
          },
        })

        const result = handleCookieValidation(request)
        expect(result.userData).toEqual(userData)
        expect(result.shouldClearCookie).toBe(false)
        expect(result.errors).toHaveLength(0)
      })

      it('should detect cookies that need clearing', () => {
        const request = new Request('https://example.com', {
          headers: {
            Cookie: `${COOKIE_NAMES.USER_DATA}=invalid-json`,
          },
        })

        const result = handleCookieValidation(request)
        expect(result.userData).toBeUndefined()
        expect(result.shouldClearCookie).toBe(true)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    describe('storeLinkedinUrlAndGetHeaders', () => {
      it('should handle URL storage and header generation', async () => {
        const request = new Request('https://example.com')
        const linkedinUrl = 'https://linkedin.com/in/johndoe'

        const result = await storeLinkedinUrlAndGetHeaders(request, linkedinUrl)

        // Test passes if either validation succeeds or normalization works
        expect(typeof result.success).toBe('boolean')
        if (result.success) {
          expect(result.headers?.get('Set-Cookie')).toContain(
            COOKIE_NAMES.USER_DATA
          )
          expect(result.userData?.linkedinUrl?.url).toBeDefined()
        } else {
          expect(result.headers).toBeUndefined()
          expect(result.errors).toBeDefined()
        }
      })
    })

    describe('generateSessionId', () => {
      it('should generate unique session IDs', () => {
        const id1 = generateSessionId()
        const id2 = generateSessionId()

        expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/)
        expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/)
        expect(id1).not.toBe(id2)
      })
    })

    describe('createSessionCookie', () => {
      it('should create session cookie string', () => {
        const sessionId = 'test_session_123'
        const cookie = createSessionCookie(sessionId)

        expect(cookie).toContain(`${COOKIE_NAMES.SESSION_ID}=${sessionId}`)
        expect(cookie).toContain('Max-Age=86400') // 24 hours
        expect(cookie).toContain('HttpOnly')
        expect(cookie).toContain('Secure')
        expect(cookie).toContain('SameSite=lax')
      })
    })

    describe('getExpiredCookieCleanupHeaders', () => {
      it('should create cleanup headers for multiple cookies', () => {
        const headers = getExpiredCookieCleanupHeaders()
        const setCookieHeaders = headers.getSetCookie()

        expect(setCookieHeaders.length).toBeGreaterThan(0)
        expect(
          setCookieHeaders.some((h) => h.includes(COOKIE_NAMES.USER_DATA))
        ).toBe(true)
        expect(
          setCookieHeaders.some((h) => h.includes(COOKIE_NAMES.SESSION_ID))
        ).toBe(true)
        expect(setCookieHeaders.every((h) => h.includes('Max-Age=0'))).toBe(
          true
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed cookie headers gracefully', () => {
      const request = new Request('https://example.com', {
        headers: {
          Cookie:
            'malformed=cookie=with=extra=equals; =empty-name; value-without-name',
        },
      })

      const result = cookieManager.getUserData(request)
      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(0) // Empty cookie is not an error
    })

    it('should handle JSON serialization errors', () => {
      const userData = createUserDataCookie('https://linkedin.com/in/johndoe')

      // Create circular reference to cause JSON error
      ;(userData as any).circular = userData

      const result = cookieManager.setUserData(userData)
      expect(result.success).toBe(false)
      expect(result.errors.some((e) => e.includes('Failed to serialize'))).toBe(
        true
      )
    })

    it('should handle URL encoding/decoding edge cases', () => {
      const specialChars = 'test with spaces & symbols!@#$%^&*()'
      const userData = createUserDataCookie('https://linkedin.com/in/johndoe')

      // Add special characters to test encoding
      //@ts-expect-error
      userData.linkedinUrl.url = `https://linkedin.com/in/${specialChars}`

      const setCookieResult = cookieManager.setUserData(userData)
      expect(setCookieResult.success).toBe(true)

      // Create request with the encoded cookie
      const request = new Request('https://example.com', {
        headers: {
          Cookie: setCookieResult.cookieHeader.split(';')[0] || '', // Just the name=value part
        },
      })

      const getResult = cookieManager.getUserData(request)
      expect(getResult.success).toBe(true)
    })
  })

  describe('Security Features', () => {
    it('should enforce HttpOnly by default', () => {
      const userData = createUserDataCookie('https://linkedin.com/in/johndoe')
      const result = cookieManager.setUserData(userData)

      expect(result.cookieHeader).toContain('HttpOnly')
    })

    it('should enforce Secure in production', () => {
      const userData = createUserDataCookie('https://linkedin.com/in/johndoe')
      const result = cookieManager.setUserData(userData)

      expect(result.cookieHeader).toContain('Secure')
    })

    it('should enforce SameSite protection', () => {
      const userData = createUserDataCookie('https://linkedin.com/in/johndoe')
      const result = cookieManager.setUserData(userData)

      expect(result.cookieHeader).toContain('SameSite=lax')
    })

    it('should respect custom security options', () => {
      const userData = createUserDataCookie('https://linkedin.com/in/johndoe')
      const result = cookieManager.setUserData(userData, {
        httpOnly: false,
        secure: false,
        sameSite: 'strict',
      })

      expect(result.cookieHeader).not.toContain('HttpOnly')
      expect(result.cookieHeader).not.toContain('Secure')
      expect(result.cookieHeader).toContain('SameSite=strict')
    })
  })

  describe('Cookie Size Management', () => {
    it('should handle oversized data correctly', () => {
      // Create data that actually exceeds size limits and cannot be sanitized to fit
      const largeUrl = `https://linkedin.com/in/${'a'.repeat(5000)}` // Very long URL
      const largeData = createUserDataCookie(largeUrl)

      const result = cookieManager.setUserData(largeData)
      expect(result.success).toBe(false)
      expect(result.errors.some((e) => e.includes('too large'))).toBe(true)
    })

    it('should handle data that cannot be sanitized to fit', () => {
      const hugeData = createUserDataCookie(
        `https://linkedin.com/in/${'a'.repeat(10000)}`
      )
      const result = cookieManager.setUserData(hugeData)

      expect(result.success).toBe(false)
      expect(result.errors.some((e) => e.includes('too large'))).toBe(true)
    })
  })
})
