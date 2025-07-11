import { describe, expect, it } from 'vitest'
import {
  analyzeQrContent,
  DEFAULT_QR_CONFIG,
  ERROR_CORRECTION_INFO,
  generateQrCacheKey,
  QR_SIZE_PRESETS,
  validateQrConfig,
  validateQrContent,
  validateQrGenerationRequest,
} from './qr.common'

describe('QR Common Functions', () => {
  describe('validateQrContent', () => {
    it('should accept valid LinkedIn URLs', () => {
      const validUrls = [
        'https://linkedin.com/in/johndoe',
        'https://www.linkedin.com/in/jane-smith',
        'https://linkedin.com/in/user123',
        'https://linkedin.com/in/very-long-username-with-many-characters',
      ]

      for (const url of validUrls) {
        const result = validateQrContent(url)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(url)
        }
      }
    })

    it('should accept other valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org/path',
        'https://subdomain.example.com/page?param=value',
        'https://example.com/very/long/path/with/many/segments',
      ]

      for (const url of validUrls) {
        const result = validateQrContent(url)
        expect(result.success).toBe(true)
      }
    })

    it('should accept meaningful text content', () => {
      const validTexts = [
        'Some meaningful text content',
        'Contact: john@example.com',
        'Phone: +1-555-0123',
        'Address: 123 Main St, City, State',
      ]

      for (const text of validTexts) {
        const result = validateQrContent(text)
        expect(result.success).toBe(true)
      }
    })

    it('should reject empty or very short content', () => {
      const invalidContents = ['', ' ', 'ab']

      for (const content of invalidContents) {
        const result = validateQrContent(content)
        expect(result.success).toBe(false)
      }
    })

    it('should reject content that exceeds maximum length', () => {
      const tooLongContent = 'a'.repeat(3000)
      const result = validateQrContent(tooLongContent)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('maximum length')
      }
    })

    it('should handle edge cases at length boundaries', () => {
      // At maximum length (2953 characters)
      const maxLengthContent = 'a'.repeat(2953)
      const maxResult = validateQrContent(maxLengthContent)
      expect(maxResult.success).toBe(true)

      // Just over maximum length
      const overMaxContent = 'a'.repeat(2954)
      const overResult = validateQrContent(overMaxContent)
      expect(overResult.success).toBe(false)
    })
  })

  describe('validateQrConfig', () => {
    it('should accept default configuration', () => {
      const result = validateQrConfig(DEFAULT_QR_CONFIG)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(DEFAULT_QR_CONFIG)
      }
    })

    it('should accept valid custom configurations', () => {
      const validConfigs = [
        { size: 128, errorCorrectionLevel: 'L' as const },
        { size: 512, errorCorrectionLevel: 'H' as const, margin: 0 },
        { colors: { dark: '#FF0000', light: '#00FF00' } },
        { size: 256, margin: 10, includeMargin: false },
      ]

      for (const config of validConfigs) {
        const result = validateQrConfig(config)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid sizes', () => {
      const invalidSizes = [32, 63, 1025, 2000, -1, 0]

      for (const size of invalidSizes) {
        const result = validateQrConfig({ size })
        expect(result.success).toBe(false)
      }
    })

    it('should reject invalid error correction levels', () => {
      const invalidLevels = ['X', 'low', 'high', 1, null]

      for (const level of invalidLevels) {
        const result = validateQrConfig({ errorCorrectionLevel: level as any })
        expect(result.success).toBe(false)
      }
    })

    it('should reject invalid colors', () => {
      const invalidColors = [
        { dark: 'red', light: '#FFFFFF' }, // Not hex
        { dark: '#FF00FF', light: 'blue' }, // Not hex
        { dark: '#FF0', light: '#FFFFFF' }, // Wrong hex length
        { dark: '#GGGGGG', light: '#FFFFFF' }, // Invalid hex characters
      ]

      for (const colors of invalidColors) {
        const result = validateQrConfig({ colors })
        expect(result.success).toBe(false)
      }
    })

    it('should reject invalid margins', () => {
      const invalidMargins = [-1, 11, 100, -5]

      for (const margin of invalidMargins) {
        const result = validateQrConfig({ margin })
        expect(result.success).toBe(false)
      }
    })

    it('should apply default values for missing properties', () => {
      const partialConfig = { size: 128 }
      const result = validateQrConfig(partialConfig)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.size).toBe(128)
        expect(result.data.errorCorrectionLevel).toBe('M')
        expect(result.data.margin).toBe(4)
        expect(result.data.colors).toEqual({
          dark: '#000000',
          light: '#FFFFFF',
        })
        expect(result.data.includeMargin).toBe(true)
      }
    })
  })

  describe('validateQrGenerationRequest', () => {
    it('should accept valid generation requests', () => {
      const validRequests = [
        {
          content: 'https://linkedin.com/in/johndoe',
          config: { size: 256 },
        },
        {
          content: 'https://example.com',
          config: DEFAULT_QR_CONFIG,
        },
        {
          content: 'Some text content',
        }, // Config is optional
      ]

      for (const request of validRequests) {
        const result = validateQrGenerationRequest(request)
        expect(result.success).toBe(true)
      }
    })

    it('should reject requests with invalid content', () => {
      const invalidRequests = [
        { content: '', config: {} },
        { content: 'ab', config: {} },
        { config: {} }, // Missing content
      ]

      for (const request of invalidRequests) {
        const result = validateQrGenerationRequest(request)
        expect(result.success).toBe(false)
      }
    })

    it('should reject requests with invalid config', () => {
      const invalidRequests = [
        {
          content: 'https://example.com',
          config: { size: -1 },
        },
        {
          content: 'https://example.com',
          config: { errorCorrectionLevel: 'invalid' },
        },
      ]

      for (const request of invalidRequests) {
        const result = validateQrGenerationRequest(request)
        expect(result.success).toBe(false)
      }
    })
  })

  describe('analyzeQrContent', () => {
    it('should analyze clean LinkedIn URLs correctly', () => {
      const cleanUrl = 'https://linkedin.com/in/johndoe'
      const analysis = analyzeQrContent(cleanUrl)

      expect(analysis.isValid).toBe(true)
      expect(analysis.errors).toHaveLength(0)
      expect(analysis.warnings).toHaveLength(0)
      expect(analysis.recommendedErrorLevel).toBe('H') // High for clean, short LinkedIn URLs
      expect(analysis.estimatedSize).toBeDefined()
    })

    it('should detect tracking parameters in URLs', () => {
      const urlWithTracking =
        'https://linkedin.com/in/johndoe?utm_source=email&utm_campaign=test'
      const analysis = analyzeQrContent(urlWithTracking)

      expect(analysis.isValid).toBe(true)
      expect(analysis.warnings.some((w) => w.includes('tracking'))).toBe(true)
    })

    it('should warn about long URLs', () => {
      const longUrl = `https://linkedin.com/in/johndoe?${'param=value&'.repeat(50)}`
      const analysis = analyzeQrContent(longUrl)

      expect(analysis.isValid).toBe(true)
      expect(analysis.warnings.some((w) => w.includes('Long URLs'))).toBe(true)
      expect(analysis.recommendedErrorLevel).toBe('L') // Lower error correction for dense codes
    })

    it('should warn about very long content', () => {
      const veryLongContent = `https://example.com/${'a'.repeat(500)}`
      const analysis = analyzeQrContent(veryLongContent)

      expect(analysis.isValid).toBe(true)
      expect(
        analysis.warnings.some((w) => w.includes('Very long content'))
      ).toBe(true)
      expect(analysis.recommendedErrorLevel).toBe('L')
    })

    it('should estimate QR code size based on content length', () => {
      const testCases = [
        { content: 'short', expectedMinSize: 21 },
        { content: 'a'.repeat(50), expectedMinSize: 25 },
        { content: 'a'.repeat(100), expectedMinSize: 29 },
        { content: 'a'.repeat(200), expectedMinSize: 37 },
      ]

      for (const { content, expectedMinSize } of testCases) {
        const analysis = analyzeQrContent(content)
        expect(analysis.estimatedSize).toBeGreaterThanOrEqual(expectedMinSize)
      }
    })

    it('should handle invalid content gracefully', () => {
      const invalidContents = ['', 'ab', 'a'.repeat(3000)]

      for (const content of invalidContents) {
        const analysis = analyzeQrContent(content)
        expect(analysis.isValid).toBe(false)
        expect(analysis.errors.length).toBeGreaterThan(0)
      }
    })

    it('should provide appropriate error correction recommendations for LinkedIn URLs', () => {
      const testCases = [
        {
          url: 'https://linkedin.com/in/user', // Short (< 50 chars)
          expectedLevel: 'H',
        },
        {
          url: 'https://linkedin.com/in/user-with-medium-length-username', // Medium (< 100 chars)
          expectedLevel: 'Q',
        },
        {
          url: 'https://linkedin.com/in/user-with-very-long-username-and-parameters?ref=website&source=direct', // Long (> 100 chars)
          expectedLevel: 'Q', // Still medium-high for LinkedIn URLs under 200 chars
        },
      ]

      for (const { url, expectedLevel } of testCases) {
        const analysis = analyzeQrContent(url)
        expect(analysis.recommendedErrorLevel).toBe(expectedLevel)
      }
    })
  })

  describe('generateQrCacheKey', () => {
    it('should generate consistent cache keys for same input', () => {
      const content = 'https://linkedin.com/in/johndoe'
      const config = {
        size: 256,
        errorCorrectionLevel: 'M' as const,
        margin: 4,
        colors: { dark: '#000000', light: '#FFFFFF' },
        includeMargin: true,
      }

      const key1 = generateQrCacheKey(content, config)
      const key2 = generateQrCacheKey(content, config)

      expect(key1).toBe(key2)
      expect(key1).toMatch(/^qr_[a-z0-9]{16}$/)
    })

    it('should generate different cache keys for different content', () => {
      const config = DEFAULT_QR_CONFIG

      const key1 = generateQrCacheKey('https://linkedin.com/in/user1', config)
      const key2 = generateQrCacheKey('https://linkedin.com/in/user2', config)

      expect(key1).not.toBe(key2)
      expect(key1).toMatch(/^qr_[a-z0-9]{16}$/)
      expect(key2).toMatch(/^qr_[a-z0-9]{16}$/)
    })

    it('should generate different cache keys for different configs', () => {
      const content = 'https://linkedin.com/in/johndoe'

      const key1 = generateQrCacheKey(content, {
        ...DEFAULT_QR_CONFIG,
        size: 256,
      })
      const key2 = generateQrCacheKey(content, {
        ...DEFAULT_QR_CONFIG,
        size: 512,
      })

      expect(key1).not.toBe(key2)
      expect(key1).toMatch(/^qr_[a-z0-9]{16}$/)
      expect(key2).toMatch(/^qr_[a-z0-9]{16}$/)
    })

    it('should handle special characters in content', () => {
      const specialContents = [
        'https://example.com/path?param=value&other=123',
        'Text with spaces and symbols!@#$%',
        'Multi\nline\ncontent',
        'Unicode content: 🔗 📱',
      ]

      for (const content of specialContents) {
        const key = generateQrCacheKey(content, DEFAULT_QR_CONFIG)
        expect(key).toMatch(/^qr_[a-z0-9]{16}$/)
      }
    })
  })

  describe('Constants and Presets', () => {
    it('should export correct default configuration', () => {
      expect(DEFAULT_QR_CONFIG).toEqual({
        size: 256,
        errorCorrectionLevel: 'M',
        margin: 4,
        colors: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        includeMargin: true,
      })
    })

    it('should export correct size presets', () => {
      expect(QR_SIZE_PRESETS).toEqual({
        SMALL: 128,
        MEDIUM: 256,
        LARGE: 512,
        EXTRA_LARGE: 1024,
      })
    })

    it('should export error correction info', () => {
      expect(ERROR_CORRECTION_INFO.L.name).toBe('Low')
      expect(ERROR_CORRECTION_INFO.M.name).toBe('Medium')
      expect(ERROR_CORRECTION_INFO.Q.name).toBe('Quartile')
      expect(ERROR_CORRECTION_INFO.H.name).toBe('High')

      // Check that all levels have required properties
      for (const level of ['L', 'M', 'Q', 'H'] as const) {
        expect(ERROR_CORRECTION_INFO[level]).toHaveProperty('name')
        expect(ERROR_CORRECTION_INFO[level]).toHaveProperty('recovery')
        expect(ERROR_CORRECTION_INFO[level]).toHaveProperty('description')
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle URLs with unusual but valid characters', () => {
      const unusualUrls = [
        'https://example.com/path%20with%20encoded%20spaces',
        'https://example.com/path-with-hyphens_and_underscores',
        'https://subdomain-with-hyphens.example.com',
        'https://example.com:8080/path',
      ]

      for (const url of unusualUrls) {
        const result = validateQrContent(url)
        expect(result.success).toBe(true)
      }
    })

    it('should handle boundary cases for QR size estimation', () => {
      // Test content exactly at version boundaries
      const boundaryTests = [
        { length: 25, expectedMinSize: 21 }, // Version 1
        { length: 47, expectedMinSize: 25 }, // Version 2
        { length: 77, expectedMinSize: 29 }, // Version 3
        { length: 335, expectedMinSize: 53 }, // Version 9
      ]

      for (const { length, expectedMinSize } of boundaryTests) {
        const content = 'a'.repeat(length)
        const analysis = analyzeQrContent(content)
        expect(analysis.estimatedSize).toBeGreaterThanOrEqual(expectedMinSize)
      }
    })

    it('should handle empty and whitespace in config validation', () => {
      const edgeCaseConfigs = [
        {}, // Empty config
        { size: undefined }, // Undefined property
        { errorCorrectionLevel: null }, // Null property
      ]

      for (const config of edgeCaseConfigs) {
        const result = validateQrConfig(config as any)
        // Should either succeed with defaults or fail gracefully
        expect(typeof result.success).toBe('boolean')
      }
    })

    it('should handle very large numbers in size validation', () => {
      const largeSizes = [999999, Number.MAX_SAFE_INTEGER, Infinity]

      for (const size of largeSizes) {
        const result = validateQrConfig({ size })
        expect(result.success).toBe(false)
      }
    })

    it('should handle malformed color values', () => {
      const malformedColors = [
        { dark: '#', light: '#FFFFFF' }, // Too short
        { dark: '#FFFFFF', light: '#' }, // Too short
        { dark: 'ffffff', light: '#FFFFFF' }, // Missing #
        { dark: '#FFFFF', light: '#FFFFFF' }, // Wrong length
        { dark: '#FFFFFFF', light: '#FFFFFF' }, // Too long
      ]

      for (const colors of malformedColors) {
        const result = validateQrConfig({ colors })
        expect(result.success).toBe(false)
      }
    })
  })
})
