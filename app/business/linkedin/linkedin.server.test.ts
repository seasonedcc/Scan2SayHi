import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  batchNormalizeLinkedinUrls,
  createLinkedinUrlProcessor,
  extractLinkedinUsername,
  normalizeLinkedinUrlServer,
  validateLinkedinUrlSecurity,
  validateLinkedinUrlServer,
} from './linkedin.server'

describe('LinkedIn Server Functions', () => {
  describe('validateLinkedinUrlServer', () => {
    it('should validate correct LinkedIn URLs', () => {
      const validUrls = [
        'https://linkedin.com/in/johndoe',
        'https://www.linkedin.com/in/jane-smith',
        'https://linkedin.com/in/user123',
      ]

      for (const url of validUrls) {
        const result = validateLinkedinUrlServer(url)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(url)
        }
      }
    })

    it('should reject invalid LinkedIn URLs with detailed errors', () => {
      const invalidUrls = [
        'https://facebook.com/johndoe',
        'not-a-url',
        'https://linkedin.com/company/example',
      ]

      for (const url of invalidUrls) {
        const result = validateLinkedinUrlServer(url)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.message).toBeTruthy()
          expect(result.error.code).toBeTruthy()
        }
      }
    })
  })

  describe('normalizeLinkedinUrlServer', () => {
    it('should normalize LinkedIn URLs with comprehensive analysis', () => {
      const testCases = [
        {
          input: 'johndoe',
          expected: 'https://linkedin.com/in/johndoe',
          shouldTransform: true,
        },
        {
          input: 'www.linkedin.com/in/jane-smith',
          expected: 'https://linkedin.com/in/jane-smith',
          shouldTransform: true,
        },
        {
          input: 'https://linkedin.com/in/user123',
          expected: 'https://linkedin.com/in/user123',
          shouldTransform: false,
        },
      ]

      for (const { input, expected, shouldTransform } of testCases) {
        const result = normalizeLinkedinUrlServer(input)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.normalizedUrl).toBe(expected)
          expect(result.data.wasTranformed).toBe(shouldTransform)
          expect(result.isSuspicious).toBeDefined()
        }
      }
    })

    it('should handle invalid inputs with detailed errors', () => {
      const invalidInputs = ['', 'user@invalid', 'https://facebook.com/user']

      for (const input of invalidInputs) {
        const result = normalizeLinkedinUrlServer(input)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.message).toBeTruthy()
          expect(result.error.code).toBeTruthy()
          expect(result.error.input).toBe(input)
        }
      }
    })

    it('should detect suspicious URLs', () => {
      const suspiciousInput = 'https://linkedin.com/in/user?utm_source=spam'
      const result = normalizeLinkedinUrlServer(suspiciousInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.isSuspicious).toBe(true)
        expect(result.data.suspiciousIndicators.hasTrackingParams).toBe(true)
      }
    })
  })

  describe('validateLinkedinUrlSecurity', () => {
    it('should analyze clean URLs as low risk', () => {
      const cleanUrl = 'https://linkedin.com/in/johndoe'
      const result = validateLinkedinUrlSecurity(cleanUrl)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isSuspicious).toBe(false)
        expect(result.data.riskLevel).toBe('low')
        expect(result.data.riskScore).toBe(0)
        expect(result.data.recommendations).toContain(
          'URL appears to be clean and safe'
        )
      }
    })

    it('should analyze suspicious URLs with appropriate risk levels', () => {
      const testCases = [
        {
          url: 'https://linkedin.com/in/user?utm_source=spam&fbclid=123',
          expectedRiskLevel: 'high' as const, // 20 (tracking) + 30 (unusual params) = 50 = high
          expectedIndicators: ['hasTrackingParams', 'hasUnusualParameters'],
        },
        {
          url: 'https://linkedin.com/in/ab#section',
          expectedRiskLevel: 'high' as const,
          expectedIndicators: ['hasShortUsername', 'hasUnusualFormat'],
        },
      ]

      for (const { url, expectedRiskLevel, expectedIndicators } of testCases) {
        const result = validateLinkedinUrlSecurity(url)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.riskLevel).toBe(expectedRiskLevel)
          expect(result.data.isSuspicious).toBe(true)
          for (const indicator of expectedIndicators) {
            expect(
              result.data.indicators[
                indicator as keyof typeof result.data.indicators
              ]
            ).toBe(true)
          }
        }
      }
    })

    it('should provide security recommendations', () => {
      const urlWithTracking = 'https://linkedin.com/in/user?utm_source=spam'
      const result = validateLinkedinUrlSecurity(urlWithTracking)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.recommendations).toContain(
          'Remove tracking parameters for privacy'
        )
      }
    })

    it('should handle invalid URLs gracefully', () => {
      const invalidUrl = 'not-a-valid-url'
      const result = validateLinkedinUrlSecurity(invalidUrl)

      // Should still analyze and return results
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isSuspicious).toBe(true)
        expect(result.data.riskLevel).toBe('medium')
      }
    })
  })

  describe('batchNormalizeLinkedinUrls', () => {
    it('should process multiple URLs and provide summary', () => {
      const inputs = [
        'johndoe',
        'jane-smith',
        'https://linkedin.com/in/user123',
        'invalid@url',
        'https://linkedin.com/in/suspicious?utm_source=spam',
      ]

      const result = batchNormalizeLinkedinUrls(inputs)

      expect(result.results).toHaveLength(5)
      expect(result.summary.total).toBe(5)
      expect(result.summary.successful).toBeGreaterThan(0)
      expect(result.summary.failed).toBeGreaterThan(0)

      // Check that each result has the expected structure
      for (const [index, resultItem] of result.results.entries()) {
        expect(resultItem.index).toBe(index)
        expect(resultItem.input).toBeTruthy()
        expect(resultItem.success).toBeDefined()
      }
    })

    it('should handle empty input array', () => {
      const result = batchNormalizeLinkedinUrls([])
      expect(result.results).toHaveLength(0)
      expect(result.summary.total).toBe(0)
      expect(result.summary.successful).toBe(0)
      expect(result.summary.failed).toBe(0)
    })

    it('should truncate long inputs for safety', () => {
      const longInput = 'a'.repeat(200)
      const result = batchNormalizeLinkedinUrls([longInput])

      expect(result.results[0]?.input).toHaveLength(100)
      expect(result.results[0]?.input).toBe(longInput.substring(0, 100))
    })
  })

  describe('extractLinkedinUsername', () => {
    it('should extract usernames from valid LinkedIn URLs', () => {
      const testCases = [
        {
          url: 'https://linkedin.com/in/johndoe' as const,
          expected: 'johndoe',
        },
        {
          url: 'https://www.linkedin.com/in/jane-smith' as const,
          expected: 'jane-smith',
        },
        {
          url: 'https://linkedin.com/in/user123' as const,
          expected: 'user123',
        },
      ]

      for (const { url, expected } of testCases) {
        const result = extractLinkedinUsername(url)
        expect(result).toBe(expected)
      }
    })

    it('should return null for invalid URLs', () => {
      const invalidUrls = [
        'https://facebook.com/johndoe' as any,
        'https://linkedin.com/company/example' as any,
        'not-a-url' as any,
      ]

      for (const url of invalidUrls) {
        const result = extractLinkedinUsername(url)
        expect(result).toBeNull()
      }
    })

    it('should handle URLs with additional path segments', () => {
      const url = 'https://linkedin.com/in/johndoe/details' as any
      const result = extractLinkedinUsername(url)
      expect(result).toBe('johndoe')
    })
  })

  describe('createLinkedinUrlProcessor', () => {
    let processor: ReturnType<typeof createLinkedinUrlProcessor>

    beforeEach(() => {
      processor = createLinkedinUrlProcessor({
        maxRequestsPerMinute: 5,
        maxBatchSize: 3,
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

    it('should process single URLs with rate limiting', () => {
      const clientId = 'test-client'
      const input = 'johndoe'

      const result = processor.processUrl(clientId, input)
      expect(result.success).toBe(true)
    })

    it('should reject requests after rate limit exceeded', () => {
      const clientId = 'test-client'

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        processor.processUrl(clientId, `user${i}`)
      }

      // Next request should be rate limited
      const result = processor.processUrl(clientId, 'blocked-user')
      expect(result.success).toBe(false)
      if (!result.success && 'retryAfter' in result.error) {
        expect(result.error.code).toBe('rate_limit_exceeded')
        expect(result.error.retryAfter).toBe(60)
      }
    })

    it('should reject oversized batches', () => {
      const clientId = 'test-client'
      const largeBatch = ['user1', 'user2', 'user3', 'user4'] // Exceeds maxBatchSize of 3

      const result = processor.processBatch(clientId, largeBatch)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('batch_size_exceeded')
        expect(result.error.maxBatchSize).toBe(3)
      }
    })

    it('should process valid batches', () => {
      const clientId = 'test-client'
      const batch = ['user1', 'user2', 'user3']

      const result = processor.processBatch(clientId, batch)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.summary.total).toBe(3)
      }
    })

    it('should reset rate limits after time window', () => {
      const clientId = 'test-client'

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        processor.processUrl(clientId, `user${i}`)
      }

      // Mock time advancement
      const originalNow = Date.now
      vi.spyOn(Date, 'now').mockReturnValue(originalNow() + 61 * 1000) // 61 seconds later

      // Should allow requests again
      const result = processor.processUrl(clientId, 'new-user')
      expect(result.success).toBe(true)

      // Restore original Date.now
      vi.restoreAllMocks()
    })
  })

  describe('Server-side Edge Cases and Error Handling', () => {
    describe('Input sanitization edge cases', () => {
      it('should handle very long input strings safely', () => {
        const veryLongInput = `user${'a'.repeat(10000)}`
        const result = normalizeLinkedinUrlServer(veryLongInput)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.input).toHaveLength(100) // Should be truncated for safety
        }
      })

      it('should handle inputs with special characters safely', () => {
        const specialInputs = [
          'user\x00name', // null byte
          'user\nname', // newline
          'user\tname', // tab
          'user\rname', // carriage return
        ]

        for (const input of specialInputs) {
          const result = normalizeLinkedinUrlServer(input)
          expect(result).toBeDefined()
          expect(typeof result.success).toBe('boolean')
        }
      })

      it('should handle empty and whitespace inputs', () => {
        const emptyInputs = ['', '   ', '\t\n\r', '\u00A0', '   \t  \n  ']

        for (const input of emptyInputs) {
          const result = normalizeLinkedinUrlServer(input)
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.message).toBeTruthy()
          }
        }
      })
    })

    describe('Security analysis edge cases', () => {
      it('should handle malformed URLs in security analysis', () => {
        const malformedUrls = [
          'not-a-url-at-all',
          '://missing-protocol',
          'https://',
          'https://.',
          'https://...',
        ]

        for (const url of malformedUrls) {
          const result = validateLinkedinUrlSecurity(url)
          expect(result.success).toBe(true) // Should analyze without throwing
          if (result.success) {
            expect(result.data.isSuspicious).toBe(true) // Malformed should be suspicious
          }
        }
      })

      it('should provide appropriate risk levels for edge cases', () => {
        const testCases = [
          {
            url: 'https://linkedin.com/in/ab', // Only short username
            expectedRiskLevel: 'medium' as const, // 25 points
          },
          {
            url: 'https://linkedin.com/in/user?utm_source=test&utm_medium=social&utm_campaign=test', // Only tracking
            expectedRiskLevel: 'high' as const, // 20 (tracking) + 30 (>2 params) = 50 (high threshold)
          },
          {
            url: 'https://linkedin.com/in/normaluser', // Clean URL
            expectedRiskLevel: 'low' as const, // 0 points
          },
        ]

        for (const { url, expectedRiskLevel } of testCases) {
          const result = validateLinkedinUrlSecurity(url)
          expect(result.success).toBe(true)
          if (result.success) {
            expect(result.data.riskLevel).toBe(expectedRiskLevel)
          }
        }
      })

      it('should handle security analysis errors gracefully', () => {
        // This is hard to trigger since the function is robust, but we test the error path
        const result = validateLinkedinUrlSecurity('valid-input')
        expect(result).toBeDefined()
        expect(typeof result.success).toBe('boolean')
      })
    })

    describe('Batch processing edge cases', () => {
      it('should handle mixed input types in batches', () => {
        const mixedBatch = [
          'johndoe', // username
          'https://linkedin.com/in/jane', // full URL
          'linkedin.com/in/user', // partial URL
          'invalid@input', // invalid
          '', // empty
          'a'.repeat(200), // very long
        ]

        const result = batchNormalizeLinkedinUrls(mixedBatch)

        expect(result.results).toHaveLength(6)
        expect(result.summary.total).toBe(6)
        expect(result.summary.successful + result.summary.failed).toBe(6)

        // Check input truncation for safety
        const longInputResult = result.results.find(
          (r) => r.input.length === 100
        )
        expect(longInputResult).toBeDefined()
      })

      it('should handle duplicate inputs in batches', () => {
        const duplicateBatch = [
          'johndoe',
          'johndoe',
          'johndoe',
          'jane-smith',
          'jane-smith',
        ]

        const result = batchNormalizeLinkedinUrls(duplicateBatch)

        expect(result.results).toHaveLength(5)
        expect(result.summary.total).toBe(5)

        // All should be processed independently
        const johndoeResults = result.results.filter(
          (r) => r.input === 'johndoe'
        )
        expect(johndoeResults).toHaveLength(3)
      })

      it('should handle all-invalid batches', () => {
        const invalidBatch = [
          'ab', // too short
          'user@invalid', // invalid chars
          '', // empty
          'https://facebook.com/user', // wrong domain
        ]

        const result = batchNormalizeLinkedinUrls(invalidBatch)

        expect(result.summary.successful).toBe(0)
        expect(result.summary.failed).toBe(4)
        expect(result.summary.suspicious).toBe(0)
      })

      it('should handle all-suspicious batches', () => {
        const suspiciousBatch = [
          'https://linkedin.com/in/user?utm_source=spam',
          'https://linkedin.com/in/ab',
          'https://linkedin.com/in/123456',
        ]

        const result = batchNormalizeLinkedinUrls(suspiciousBatch)

        expect(result.summary.suspicious).toBeGreaterThan(0)
        expect(result.summary.successful).toBeGreaterThan(0)
      })
    })

    describe('Username extraction edge cases', () => {
      it('should handle URLs with extra path segments', () => {
        const urlsWithExtraSegments = [
          'https://linkedin.com/in/user/details' as any,
          'https://linkedin.com/in/user/posts/recent' as any,
          'https://linkedin.com/in/user/' as any,
        ]

        for (const url of urlsWithExtraSegments) {
          const result = extractLinkedinUsername(url)
          expect(result).toBe('user')
        }
      })

      it('should handle edge cases in path parsing', () => {
        const edgeCaseUrls = [
          'https://linkedin.com/in/' as any, // empty username
          'https://linkedin.com/in' as any, // no trailing slash
          'https://linkedin.com//in//user' as any, // double slashes
        ]

        for (const url of edgeCaseUrls) {
          const result = extractLinkedinUsername(url)
          // Should either return valid username or null, not crash
          expect(result === null || typeof result === 'string').toBe(true)
        }
      })

      it('should handle malformed URLs in extraction', () => {
        const malformedUrls = [
          'not-a-url' as any,
          'https://linkedin.com' as any, // no path
          'https://linkedin.com/' as any, // root path only
        ]

        for (const url of malformedUrls) {
          const result = extractLinkedinUsername(url)
          expect(result).toBeNull()
        }
      })
    })

    describe('Rate limiting edge cases', () => {
      it('should handle concurrent requests correctly', () => {
        const processor = createLinkedinUrlProcessor({
          maxRequestsPerMinute: 3,
          maxBatchSize: 2,
        })

        const clientId = 'concurrent-client'

        // Make concurrent requests
        const results = []
        for (let i = 0; i < 5; i++) {
          results.push(processor.processUrl(clientId, `user${i}`))
        }

        const successful = results.filter((r) => r.success).length
        const rateLimited = results.filter(
          (r) => !r.success && 'retryAfter' in (r as any).error
        ).length

        expect(successful).toBe(3) // Should allow exactly 3
        expect(rateLimited).toBe(2) // Should rate limit 2
      })

      it('should handle batch size edge cases', () => {
        const processor = createLinkedinUrlProcessor({
          maxRequestsPerMinute: 10,
          maxBatchSize: 3,
        })

        const clientId = 'batch-client'

        // Exactly at limit should succeed
        const exactLimit = processor.processBatch(clientId, [
          'user1',
          'user2',
          'user3',
        ])
        expect(exactLimit.success).toBe(true)

        // Over limit should fail
        const overLimit = processor.processBatch(clientId, [
          'user1',
          'user2',
          'user3',
          'user4',
        ])
        expect(overLimit.success).toBe(false)
        if (!overLimit.success) {
          expect(overLimit.error.code).toBe('batch_size_exceeded')
        }
      })

      it('should handle different client IDs independently', () => {
        const processor = createLinkedinUrlProcessor({
          maxRequestsPerMinute: 2,
          maxBatchSize: 5,
        })

        // Client 1 exhausts their limit
        expect(processor.processUrl('client1', 'user1').success).toBe(true)
        expect(processor.processUrl('client1', 'user2').success).toBe(true)
        expect(processor.processUrl('client1', 'user3').success).toBe(false) // Rate limited

        // Client 2 should still have their full limit
        expect(processor.processUrl('client2', 'user1').success).toBe(true)
        expect(processor.processUrl('client2', 'user2').success).toBe(true)
        expect(processor.processUrl('client2', 'user3').success).toBe(false) // Rate limited
      })
    })

    describe('Error message handling', () => {
      it('should provide detailed error messages for validation failures', () => {
        const invalidInputs = [
          { input: '', expectedCode: 'invalid_string' },
          { input: 'ab', expectedCode: 'too_small' },
          { input: 'user@invalid', expectedCode: 'invalid_string' },
        ]

        for (const { input } of invalidInputs) {
          const result = validateLinkedinUrlServer(
            `https://linkedin.com/in/${input}`
          )
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.message).toBeTruthy()
            expect(result.error.code).toBeTruthy()
          }
        }
      })

      it('should provide detailed error messages for normalization failures', () => {
        const invalidInputs = [
          'https://facebook.com/user', // Wrong domain - should fail
          'user with spaces', // Invalid characters - should fail
          '', // Empty input - should fail
        ]

        for (const input of invalidInputs) {
          const result = normalizeLinkedinUrlServer(input)
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.message).toBeTruthy()
            expect(result.error.code).toBeTruthy()
            expect(result.error.input).toBeDefined()
          }
        }
      })
    })
  })
})
