/**
 * Server-side LinkedIn URL validation and normalization functions
 *
 * This module provides server-only functions for LinkedIn URL processing,
 * including validation, normalization, and security analysis.
 */

import {
  detectSuspiciousUrlIndicators,
  isSuspiciousUrl,
  type LinkedinNormalizedUrl,
  normalizeLinkedinUrlWithAnalysis,
  validateLinkedinUrl,
} from './linkedin.common'

/**
 * Server-side LinkedIn URL validation with detailed error reporting
 */
export function validateLinkedinUrlServer(url: string) {
  const result = validateLinkedinUrl(url)

  if (!result.success) {
    const firstError = result.error.issues[0]
    return {
      success: false as const,
      error: {
        message: firstError?.message || 'Invalid LinkedIn URL',
        code: firstError?.code || 'invalid_url',
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
 * Server-side LinkedIn URL normalization with comprehensive analysis
 */
export function normalizeLinkedinUrlServer(input: string) {
  const result = normalizeLinkedinUrlWithAnalysis(input)

  if (!result.success) {
    const firstError = result.error.issues[0]
    return {
      success: false as const,
      error: {
        message: firstError?.message || 'Failed to normalize LinkedIn URL',
        code: firstError?.code || 'normalization_failed',
        path: firstError?.path || [],
        input: input.substring(0, 100), // Truncate for safety
      },
    }
  }

  return {
    success: true as const,
    data: result.data,
    isSuspicious: result.isSuspicious,
  }
}

/**
 * Server-side security validation for LinkedIn URLs
 */
export function validateLinkedinUrlSecurity(url: string) {
  try {
    const suspiciousIndicators = detectSuspiciousUrlIndicators(url)
    const isSuspicious = isSuspiciousUrl(url)

    // Calculate risk score based on indicators
    let riskScore = 0
    if (suspiciousIndicators.hasTrackingParams) riskScore += 20
    if (suspiciousIndicators.hasUnusualParameters) riskScore += 30
    if (suspiciousIndicators.hasShortUsername) riskScore += 25
    if (suspiciousIndicators.hasUnusualFormat) riskScore += 35

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high'
    if (riskScore >= 50) {
      riskLevel = 'high'
    } else if (riskScore >= 25) {
      riskLevel = 'medium'
    } else {
      riskLevel = 'low'
    }

    return {
      success: true as const,
      data: {
        isSuspicious,
        riskScore,
        riskLevel,
        indicators: suspiciousIndicators,
        recommendations: getSecurityRecommendations(suspiciousIndicators),
      },
    }
  } catch (error) {
    return {
      success: false as const,
      error: {
        message: 'Failed to analyze URL security',
        code: 'security_analysis_failed',
        originalError: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Generate security recommendations based on suspicious indicators
 */
function getSecurityRecommendations(
  indicators: ReturnType<typeof detectSuspiciousUrlIndicators>
) {
  const recommendations: string[] = []

  if (indicators.hasTrackingParams) {
    recommendations.push('Remove tracking parameters for privacy')
  }

  if (indicators.hasUnusualParameters) {
    recommendations.push('Review unusual query parameters')
  }

  if (indicators.hasShortUsername) {
    recommendations.push(
      'Verify username - very short usernames may be suspicious'
    )
  }

  if (indicators.hasUnusualFormat) {
    recommendations.push('Verify URL format - unusual patterns detected')
  }

  if (recommendations.length === 0) {
    recommendations.push('URL appears to be clean and safe')
  }

  return recommendations
}

/**
 * Batch process multiple LinkedIn URLs for server-side validation
 */
export function batchNormalizeLinkedinUrls(inputs: string[]) {
  const results = inputs.map((input, index) => {
    const result = normalizeLinkedinUrlServer(input)
    return {
      index,
      input: input.substring(0, 100), // Truncate for safety
      ...result,
    }
  })

  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)
  const suspicious = successful.filter(
    (r) => 'isSuspicious' in r && r.isSuspicious
  )

  return {
    results,
    summary: {
      total: inputs.length,
      successful: successful.length,
      failed: failed.length,
      suspicious: suspicious.length,
    },
  }
}

/**
 * Extract LinkedIn username from a normalized URL (server-side)
 */
export function extractLinkedinUsername(
  url: LinkedinNormalizedUrl
): string | null {
  try {
    const urlObj = new URL(url)

    // Ensure it's a LinkedIn profile URL
    if (!['linkedin.com', 'www.linkedin.com'].includes(urlObj.hostname)) {
      return null
    }

    if (!urlObj.pathname.startsWith('/in/')) {
      return null
    }

    const username = urlObj.pathname.replace('/in/', '').split('/')[0]
    return username || null
  } catch {
    return null
  }
}

/**
 * Server-side rate limiting helper for URL processing
 */
export function createLinkedinUrlProcessor(
  options: { maxRequestsPerMinute?: number; maxBatchSize?: number } = {}
) {
  const { maxRequestsPerMinute = 100, maxBatchSize = 50 } = options

  const requestCounts = new Map<string, { count: number; resetTime: number }>()

  return {
    /**
     * Check if a client (identified by IP or user ID) can make a request
     */
    canMakeRequest(clientId: string): boolean {
      const now = Date.now()
      const minuteMs = 60 * 1000

      const clientData = requestCounts.get(clientId)

      if (!clientData || now > clientData.resetTime) {
        // First request or time window expired
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
     * Process a single URL with rate limiting
     */
    processUrl(clientId: string, input: string) {
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

      return normalizeLinkedinUrlServer(input)
    },

    /**
     * Process multiple URLs with rate limiting and batch size limits
     */
    processBatch(clientId: string, inputs: string[]) {
      if (inputs.length > maxBatchSize) {
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

      return {
        success: true as const,
        data: batchNormalizeLinkedinUrls(inputs),
      }
    },
  }
}
