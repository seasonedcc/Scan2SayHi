import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  batchGenerateQrCodes,
  createQrCodeProcessor,
  generateCachedQrCode,
  generateOptimizedQrCode,
  generateQrCodeServer,
  qrCache,
  validateQrGenerationRequestServer,
} from './qr.server'

// Mock the qrcode library
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(),
  },
}))

import QRCode from 'qrcode'

const mockToDataURL = vi.mocked(QRCode.toDataURL) as any

describe('QR Server Functions', () => {
  beforeEach(() => {
    // Reset mocks and clear cache before each test
    vi.clearAllMocks()
    qrCache.clear()

    // Default mock implementation
    mockToDataURL.mockResolvedValue(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    )
  })

  describe('generateQrCodeServer', () => {
    it('should generate QR code with default configuration', async () => {
      const content = 'https://linkedin.com/in/johndoe'
      const result = await generateQrCodeServer(content)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe(content)
        expect(result.data.config.size).toBe(256)
        expect(result.data.config.errorCorrectionLevel).toBe('M')
        expect(result.data.dataUrl).toMatch(/^data:image\/png;base64,/)
        expect(result.data.size).toEqual({ width: 256, height: 256 })
        expect(result.data.format).toBe('png')
        expect(result.data.generatedAt).toBeInstanceOf(Date)
      }

      expect(mockToDataURL).toHaveBeenCalledWith(content, {
        errorCorrectionLevel: 'M',
        margin: 4,
        width: 256,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
    })

    it('should generate QR code with custom configuration', async () => {
      const content = 'https://linkedin.com/in/johndoe'
      const customConfig = {
        size: 512,
        errorCorrectionLevel: 'H' as const,
        margin: 2,
        colors: {
          dark: '#FF0000',
          light: '#00FF00',
        },
      }

      const result = await generateQrCodeServer(content, customConfig)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.config.size).toBe(512)
        expect(result.data.config.errorCorrectionLevel).toBe('H')
        expect(result.data.config.margin).toBe(2)
        expect(result.data.config.colors.dark).toBe('#FF0000')
        expect(result.data.config.colors.light).toBe('#00FF00')
        expect(result.data.size).toEqual({ width: 512, height: 512 })
      }

      expect(mockToDataURL).toHaveBeenCalledWith(content, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 512,
        color: {
          dark: '#FF0000',
          light: '#00FF00',
        },
      })
    })

    it('should reject invalid content', async () => {
      const invalidContents = ['', 'ab', 'a'.repeat(3000)]

      for (const content of invalidContents) {
        const result = await generateQrCodeServer(content)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('invalid_content')
          expect(result.error.message).toBeTruthy()
        }
      }
    })

    it('should reject invalid configuration', async () => {
      const content = 'https://linkedin.com/in/johndoe'
      const invalidConfigs = [
        { size: -1 },
        { size: 2000 },
        { errorCorrectionLevel: 'invalid' as any },
        { margin: -1 },
        { colors: { dark: 'red', light: '#FFFFFF' } },
      ]

      for (const config of invalidConfigs) {
        const result = await generateQrCodeServer(content, config)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('invalid_config')
        }
      }
    })

    it('should handle QR code generation errors', async () => {
      const content = 'https://linkedin.com/in/johndoe'
      mockToDataURL.mockRejectedValueOnce(new Error('QR generation failed'))

      const result = await generateQrCodeServer(content)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('generation_failed')
        expect(result.error.message).toBe('QR generation failed')
      }
    })

    it('should handle non-Error exceptions', async () => {
      const content = 'https://linkedin.com/in/johndoe'
      mockToDataURL.mockRejectedValueOnce('String error')

      const result = await generateQrCodeServer(content)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('generation_failed')
        expect(result.error.message).toBe('Failed to generate QR code')
      }
    })
  })

  describe('generateOptimizedQrCode', () => {
    it('should generate optimized QR code with recommendations', async () => {
      const content = 'https://linkedin.com/in/johndoe'
      const result = await generateOptimizedQrCode(content)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeDefined()
        expect(result.analysis).toBeDefined()
        expect(result.analysis.isValid).toBe(true)
        expect(result.analysis.recommendedErrorLevel).toBeTruthy()
      }
    })

    it('should apply optimization recommendations', async () => {
      // Long URL should get lower error correction
      const longUrl = `https://linkedin.com/in/johndoe?${'param=value&'.repeat(50)}`
      const result = await generateOptimizedQrCode(longUrl)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.config.errorCorrectionLevel).toBe('L')
        expect(result.analysis.warnings.length).toBeGreaterThan(0)
      }
    })

    it('should handle invalid content in optimization', async () => {
      const invalidContent = ''
      const result = await generateOptimizedQrCode(invalidContent)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('content_analysis_failed')
      }
    })

    it('should handle optimization errors gracefully', async () => {
      const content = 'https://linkedin.com/in/johndoe'
      mockToDataURL.mockRejectedValueOnce(new Error('Generation failed'))

      const result = await generateOptimizedQrCode(content)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('generation_failed')
      }
    })
  })

  describe('batchGenerateQrCodes', () => {
    it('should process multiple QR code requests', async () => {
      const requests = [
        { content: 'https://linkedin.com/in/user1' },
        { content: 'https://linkedin.com/in/user2' },
        { content: 'https://linkedin.com/in/user3', config: { size: 512 } },
      ]

      const result = await batchGenerateQrCodes(requests)

      expect(result.results).toHaveLength(3)
      expect(result.summary.total).toBe(3)
      expect(result.summary.successful).toBe(3)
      expect(result.summary.failed).toBe(0)

      // Check individual results
      for (const [index, resultItem] of result.results.entries()) {
        expect(resultItem.index).toBe(index)
        expect(resultItem.success).toBe(true)
        expect(resultItem.content).toBeTruthy()
        if (resultItem.success) {
          expect(resultItem.data).toBeDefined()
        }
      }
    })

    it('should handle mixed success and failure results', async () => {
      const requests = [
        { content: 'https://linkedin.com/in/user1' }, // Valid
        { content: '' }, // Invalid
        { content: 'https://linkedin.com/in/user3' }, // Valid
        { content: 'ab' }, // Invalid
      ]

      const result = await batchGenerateQrCodes(requests)

      expect(result.results).toHaveLength(4)
      expect(result.summary.total).toBe(4)
      expect(result.summary.successful).toBe(2)
      expect(result.summary.failed).toBe(2)

      // Check that success/failure is correctly tracked
      expect(result.results[0]?.success).toBe(true)
      expect(result.results[1]?.success).toBe(false)
      expect(result.results[2]?.success).toBe(true)
      expect(result.results[3]?.success).toBe(false)
    })

    it('should truncate long content for safety', async () => {
      const longContent = `https://example.com/${'a'.repeat(200)}`
      const requests = [{ content: longContent }]

      const result = await batchGenerateQrCodes(requests)

      expect(result.results[0]?.content).toHaveLength(100)
      expect(result.results[0]?.content).toBe(longContent.substring(0, 100))
    })

    it('should handle empty batch', async () => {
      const result = await batchGenerateQrCodes([])

      expect(result.results).toHaveLength(0)
      expect(result.summary.total).toBe(0)
      expect(result.summary.successful).toBe(0)
      expect(result.summary.failed).toBe(0)
    })
  })

  describe('generateCachedQrCode', () => {
    it('should generate and cache QR code', async () => {
      const content = 'https://linkedin.com/in/johndoe'
      const result = await generateCachedQrCode(content)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.fromCache).toBe(false)
        expect(result.data).toBeDefined()
      }
    })

    it('should return cached QR code on subsequent requests', async () => {
      const content = 'https://linkedin.com/in/johndoe'

      // First request
      const result1 = await generateCachedQrCode(content)
      expect(result1.success).toBe(true)
      if (result1.success) {
        expect(result1.fromCache).toBe(false)
      }

      // Second request should come from cache
      const result2 = await generateCachedQrCode(content)
      expect(result2.success).toBe(true)
      if (result2.success) {
        expect(result2.fromCache).toBe(true)
        expect(result2.data.content).toBe(content)
      }

      // Should only call toDataURL once
      expect(mockToDataURL).toHaveBeenCalledTimes(1)
    })

    it('should cache with different keys for different configs', async () => {
      const content = 'https://linkedin.com/in/johndoe'

      const result1 = await generateCachedQrCode(content, { size: 256 })
      const result2 = await generateCachedQrCode(content, { size: 512 })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      if (result1.success && result2.success) {
        expect(result1.fromCache).toBe(false)
        expect(result2.fromCache).toBe(false) // Different config, so not cached
        expect(result1.data.config.size).toBe(256)
        expect(result2.data.config.size).toBe(512)
      }

      expect(mockToDataURL).toHaveBeenCalledTimes(2)
    })

    it('should handle caching errors gracefully', async () => {
      const content = 'https://linkedin.com/in/johndoe'
      mockToDataURL.mockRejectedValueOnce(new Error('Generation failed'))

      const result = await generateCachedQrCode(content)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('generation_failed')
      }
    })
  })

  describe('validateQrGenerationRequestServer', () => {
    it('should validate correct generation requests', async () => {
      const validRequests = [
        {
          content: 'https://linkedin.com/in/johndoe',
          config: { size: 256 },
        },
        {
          content: 'https://example.com',
        },
      ]

      for (const request of validRequests) {
        const result = validateQrGenerationRequestServer(request)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.content).toBe(request.content)
        }
      }
    })

    it('should reject invalid generation requests', async () => {
      const invalidRequests = [
        { content: '' }, // Empty content
        { content: 'ab' }, // Too short
        { config: { size: 256 } }, // Missing content
        { content: 'https://example.com', config: { size: -1 } }, // Invalid config
      ]

      for (const request of invalidRequests) {
        const result = validateQrGenerationRequestServer(request)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.message).toBeTruthy()
          expect(result.error.code).toBeTruthy()
        }
      }
    })
  })

  describe('createQrCodeProcessor', () => {
    let processor: ReturnType<typeof createQrCodeProcessor>

    beforeEach(() => {
      processor = createQrCodeProcessor({
        maxRequestsPerMinute: 5,
        maxBatchSize: 3,
        cacheTtl: 1000,
      })
    })

    it('should allow requests within rate limits', () => {
      const clientId = 'test-client'

      // Should allow first few requests
      for (let i = 0; i < 5; i++) {
        expect(processor.canMakeRequest(clientId)).toBe(true)
      }

      // Should block after rate limit
      expect(processor.canMakeRequest(clientId)).toBe(false)
    })

    it('should generate QR code with rate limiting', async () => {
      const clientId = 'test-client'
      const content = 'https://linkedin.com/in/johndoe'

      const result = await processor.generateQrCode(clientId, content)
      expect(result.success).toBe(true)
    })

    it('should reject requests after rate limit exceeded', async () => {
      const clientId = 'test-client'

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await processor.generateQrCode(
          clientId,
          `https://linkedin.com/in/user${i}`
        )
      }

      // Next request should be rate limited
      const result = await processor.generateQrCode(
        clientId,
        'https://linkedin.com/in/blocked'
      )
      expect(result.success).toBe(false)
      if (!result.success && 'retryAfter' in result.error) {
        expect(result.error.code).toBe('rate_limit_exceeded')
        expect(result.error.retryAfter).toBe(60)
      }
    })

    it('should reject oversized batches', async () => {
      const clientId = 'test-client'
      const largeBatch = [
        { content: 'https://linkedin.com/in/user1' },
        { content: 'https://linkedin.com/in/user2' },
        { content: 'https://linkedin.com/in/user3' },
        { content: 'https://linkedin.com/in/user4' }, // Exceeds maxBatchSize of 3
      ]

      const result = await processor.generateBatch(clientId, largeBatch)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('batch_size_exceeded')
        expect(result.error.maxBatchSize).toBe(3)
      }
    })

    it('should process valid batches', async () => {
      const clientId = 'test-client'
      const batch = [
        { content: 'https://linkedin.com/in/user1' },
        { content: 'https://linkedin.com/in/user2' },
        { content: 'https://linkedin.com/in/user3' },
      ]

      const result = await processor.generateBatch(clientId, batch)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.summary.total).toBe(3)
      }
    })

    it('should reset rate limits after time window', () => {
      const clientId = 'test-client'

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        processor.canMakeRequest(clientId)
      }

      // Mock time advancement
      const originalNow = Date.now
      vi.spyOn(Date, 'now').mockReturnValue(originalNow() + 61 * 1000) // 61 seconds later

      // Should allow requests again
      expect(processor.canMakeRequest(clientId)).toBe(true)

      // Restore original Date.now
      vi.restoreAllMocks()
    })

    it('should handle different client IDs independently', () => {
      // Client 1 exhausts their limit
      for (let i = 0; i < 5; i++) {
        processor.canMakeRequest('client1')
      }
      expect(processor.canMakeRequest('client1')).toBe(false)

      // Client 2 should still have their full limit
      expect(processor.canMakeRequest('client2')).toBe(true)
    })

    it('should provide cache statistics', () => {
      const stats = processor.getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('maxSize')
      expect(stats).toHaveProperty('entries')
      expect(Array.isArray(stats.entries)).toBe(true)
    })

    it('should clear cache when requested', async () => {
      const clientId = 'test-client'
      const content = 'https://linkedin.com/in/johndoe'

      // Generate a QR code to populate cache
      await processor.generateQrCode(clientId, content)

      // Clear cache
      processor.clearCache()

      // Cache should be empty
      const stats = processor.getCacheStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long URLs', async () => {
      const longUrl = `https://linkedin.com/in/user?${'param=value&'.repeat(100)}`
      const result = await generateQrCodeServer(longUrl)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe(longUrl)
      }
    })

    it('should handle special characters in URLs', async () => {
      const specialUrls = [
        'https://linkedin.com/in/user-name_123',
        'https://example.com/path%20with%20encoded%20spaces',
        'https://example.com/path?param=value&other=123',
      ]

      for (const url of specialUrls) {
        const result = await generateQrCodeServer(url)
        expect(result.success).toBe(true)
      }
    })

    it('should handle concurrent cache operations', async () => {
      const content = 'https://linkedin.com/in/johndoe'

      // Make first request to populate cache
      const firstResult = await generateCachedQrCode(content)
      expect(firstResult.success).toBe(true)
      if (firstResult.success) {
        expect(firstResult.fromCache).toBe(false)
      }

      // Make multiple subsequent requests that should hit cache
      const promises = Array.from({ length: 5 }, () =>
        generateCachedQrCode(content)
      )

      const results = await Promise.all(promises)

      // All should succeed and come from cache
      for (const result of results) {
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.fromCache).toBe(true)
        }
      }

      // Should only call toDataURL once despite multiple requests
      expect(mockToDataURL).toHaveBeenCalledTimes(1)
    })

    it('should handle malformed configuration objects', async () => {
      const content = 'https://linkedin.com/in/johndoe'
      const malformedConfigs = [
        { size: 'large' as any }, // Wrong type
        { errorCorrectionLevel: 123 as any }, // Wrong type
        { colors: 'red' as any }, // Wrong type
        { margin: 'auto' as any }, // Wrong type
      ]

      for (const config of malformedConfigs) {
        const result = await generateQrCodeServer(content, config)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('invalid_config')
        }
      }
    })
  })
})
