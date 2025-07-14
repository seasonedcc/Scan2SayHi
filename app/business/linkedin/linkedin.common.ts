import { z } from 'zod'

/**
 * LinkedIn profile URL validation and normalization schemas
 */

// Base LinkedIn username validation
const linkedinUsernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(100, 'Username must be less than 100 characters')
  .regex(
    /^[a-zA-Z0-9\-_]+$/,
    'Username can only contain letters, numbers, hyphens, and underscores'
  )

// Raw input schema - accepts various LinkedIn URL formats or just usernames
const linkedinRawInputSchema = z
  .string()
  .trim()
  .min(1, 'LinkedIn profile is required')
  .transform((input) => {
    // Remove trailing slashes
    return input.replace(/\/+$/, '')
  })

// Schema for accepting various LinkedIn URL formats
const linkedinFlexibleInputSchema = z
  .string()
  .trim()
  .min(1, 'LinkedIn profile is required')
  .transform((input) => {
    // Clean up input
    const cleaned = input.replace(/\/+$/, '').trim()

    // If it's just a username (no protocol or domain), return as-is for further processing
    if (!cleaned.includes('/') && !cleaned.includes('.')) {
      return cleaned
    }

    // Handle various LinkedIn URL formats (case-insensitive)
    // linkedin.com/in/username -> https://linkedin.com/in/username
    if (cleaned.match(/^linkedin\.com\/in\//i)) {
      return `https://${cleaned}`
    }

    // www.linkedin.com/in/username -> https://www.linkedin.com/in/username
    if (cleaned.match(/^www\.linkedin\.com\/in\//i)) {
      return `https://${cleaned}`
    }

    // http://linkedin.com/in/username -> https://linkedin.com/in/username
    if (cleaned.match(/^http:\/\/linkedin\.com\/in\//i)) {
      return cleaned.replace(/^http:/, 'https:')
    }

    // http://www.linkedin.com/in/username -> https://www.linkedin.com/in/username
    if (cleaned.match(/^http:\/\/www\.linkedin\.com\/in\//i)) {
      return cleaned.replace(/^http:/, 'https:')
    }

    // Already in correct https format or other format - return as-is
    return cleaned
  })

// Normalized LinkedIn URL schema
const linkedinNormalizedUrlSchema = z
  .string()
  .url('Must be a valid LinkedIn profile URL')
  .refine(
    (url) => {
      try {
        const urlObj = new URL(url)
        return urlObj.protocol === 'https:'
      } catch {
        return false
      }
    },
    {
      message: 'Must use HTTPS protocol',
    }
  )
  .refine(
    (url) => {
      try {
        const urlObj = new URL(url)
        return (
          urlObj.hostname === 'linkedin.com' ||
          urlObj.hostname === 'www.linkedin.com'
        )
      } catch {
        return false
      }
    },
    {
      message: 'Must be a LinkedIn URL (linkedin.com)',
    }
  )
  .refine(
    (url) => {
      try {
        const urlObj = new URL(url)
        return urlObj.pathname.startsWith('/in/')
      } catch {
        return false
      }
    },
    {
      message: 'Must be a LinkedIn profile URL (/in/username)',
    }
  )
  .refine(
    (url) => {
      try {
        const urlObj = new URL(url)
        const username = urlObj.pathname.replace('/in/', '').split('/')[0]
        return linkedinUsernameSchema.safeParse(username).success
      } catch {
        return false
      }
    },
    {
      message: 'LinkedIn username is invalid',
    }
  )

// Schema for detecting suspicious URLs
const suspiciousUrlIndicatorsSchema = z.object({
  hasTrackingParams: z.boolean(),
  hasUnusualParameters: z.boolean(),
  hasShortUsername: z.boolean(),
  hasUnusualFormat: z.boolean(),
})

// URL normalization function type
const urlNormalizationResultSchema = z.object({
  originalInput: z.string(),
  normalizedUrl: linkedinNormalizedUrlSchema,
  extractedUsername: linkedinUsernameSchema,
  wasTranformed: z.boolean(),
  suspiciousIndicators: suspiciousUrlIndicatorsSchema,
})

// Export schemas (only the ones that are used)
// Removed unused schemas: linkedinUsernameSchema, linkedinRawInputSchema, linkedinFlexibleInputSchema, linkedinNormalizedUrlSchema, suspiciousUrlIndicatorsSchema, urlNormalizationResultSchema

// Export types
export type LinkedinUsername = z.infer<typeof linkedinUsernameSchema>
export type LinkedinRawInput = z.infer<typeof linkedinRawInputSchema>
export type LinkedinFlexibleInput = z.infer<typeof linkedinFlexibleInputSchema>
export type LinkedinNormalizedUrl = z.infer<typeof linkedinNormalizedUrlSchema>
export type SuspiciousUrlIndicators = z.infer<
  typeof suspiciousUrlIndicatorsSchema
>
export type UrlNormalizationResult = z.infer<
  typeof urlNormalizationResultSchema
>

// Validation helper functions
export const validateLinkedinUsername = (username: string) => {
  return linkedinUsernameSchema.safeParse(username)
}

export const validateLinkedinUrl = (url: string) => {
  return linkedinNormalizedUrlSchema.safeParse(url)
}

export const validateRawInput = (input: string) => {
  return linkedinRawInputSchema.safeParse(input)
}

export const validateFlexibleInput = (input: string) => {
  return linkedinFlexibleInputSchema.safeParse(input)
}

// Automatic handle prepending function
export const normalizeLinkedinInput = (input: string) => {
  const flexibleResult = validateFlexibleInput(input)

  if (!flexibleResult.success) {
    return flexibleResult
  }

  const cleaned = flexibleResult.data

  // If it's just a username (no protocol or domain), prepend LinkedIn URL
  if (!cleaned.includes('/') && !cleaned.includes('.')) {
    // Validate that it's a valid username first
    const usernameResult = validateLinkedinUsername(cleaned)
    if (!usernameResult.success) {
      return usernameResult
    }

    // Prepend the LinkedIn base URL
    return {
      success: true as const,
      data: `${LINKEDIN_BASE_URL}${cleaned}`,
    }
  }

  // Already a URL format, return as-is
  return flexibleResult
}

// Suspicious URL detection function
export const detectSuspiciousUrlIndicators = (
  url: string
): SuspiciousUrlIndicators => {
  // Handle empty or obviously invalid URLs immediately
  if (!url || url.trim() === '' || !url.includes('://')) {
    return {
      hasTrackingParams: false,
      hasUnusualParameters: false,
      hasShortUsername: false,
      hasUnusualFormat: true,
    }
  }

  try {
    const urlObj = new URL(url)
    const searchParams = new URLSearchParams(urlObj.search)
    const username = urlObj.pathname.replace('/in/', '').split('/')[0] || ''

    // Check for tracking parameters
    const hasTrackingParams = TRACKING_PARAMETERS.some((param) =>
      searchParams.has(param)
    )

    // Check for unusual query parameters
    const paramCount = Array.from(searchParams.keys()).length
    const hasUnusualParameters =
      paramCount > SUSPICIOUS_PATTERNS.MAX_QUERY_PARAMS ||
      Array.from(searchParams.keys()).some((param) =>
        SUSPICIOUS_PATTERNS.SUSPICIOUS_PARAM_PATTERNS.some((pattern) =>
          pattern.test(param)
        )
      )

    // Check for short username
    const hasShortUsername =
      username.length <= SUSPICIOUS_PATTERNS.SHORT_USERNAME_THRESHOLD

    // Check for unusual format indicators
    const hasUnusualFormat =
      // URL has unusual subdirectories after username
      urlObj.pathname.split('/').length > 3 ||
      // URL has fragment (hash)
      urlObj.hash.length > 0 ||
      // URL has port number
      urlObj.port !== '' ||
      // Non-standard protocol schemes
      !['http:', 'https:'].includes(urlObj.protocol) ||
      // Username has suspicious patterns (all numbers, very short, etc.)
      /^\d+$/.test(username) || // all numbers
      username.includes('--') || // double hyphens
      username.includes('__') // double underscores

    return {
      hasTrackingParams,
      hasUnusualParameters,
      hasShortUsername,
      hasUnusualFormat,
    }
  } catch {
    // If URL parsing fails, consider it suspicious
    return {
      hasTrackingParams: false,
      hasUnusualParameters: false,
      hasShortUsername: false,
      hasUnusualFormat: true,
    }
  }
}

// Check if URL is considered suspicious
export const isSuspiciousUrl = (url: string): boolean => {
  const indicators = detectSuspiciousUrlIndicators(url)

  // URL is suspicious if it has any suspicious indicators
  return Object.values(indicators).some((indicator) => indicator)
}

// Clean URL by removing tracking parameters
export const cleanTrackingParameters = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const searchParams = new URLSearchParams(urlObj.search)

    // Remove tracking parameters
    for (const param of TRACKING_PARAMETERS) {
      searchParams.delete(param)
    }

    // Rebuild URL without tracking parameters
    urlObj.search = searchParams.toString()

    return urlObj.toString()
  } catch {
    // If URL parsing fails, return original
    return url
  }
}

// Complete URL normalization schema with transforms
const linkedinUrlNormalizationSchema = z
  .string()
  .trim()
  .min(1, 'LinkedIn profile is required')
  .refine(
    (input) => {
      // Validate that flexible input is acceptable
      const flexibleResult = validateFlexibleInput(input)
      return flexibleResult.success
    },
    {
      message: 'Invalid input format',
    }
  )
  .transform((input) => {
    // Step 1: Clean up and handle flexible input formats
    const flexibleResult = validateFlexibleInput(input)
    if (!flexibleResult.success) {
      // This shouldn't happen due to the refine above, but handle gracefully
      return input
    }

    let processed = flexibleResult.data

    // Step 2: If it's just a username, prepend LinkedIn URL
    if (!processed.includes('/') && !processed.includes('.')) {
      processed = `${LINKEDIN_BASE_URL}${processed}`
    }

    return processed
  })
  .refine(
    (processed) => {
      // Validate that if it was a username, it's valid
      if (!processed.includes('/') || !processed.includes('.')) {
        return false // Shouldn't happen at this point
      }

      // Extract and validate username if it's a LinkedIn URL
      if (processed.includes('/in/')) {
        try {
          const urlObj = new URL(processed)
          const username =
            urlObj.pathname.replace('/in/', '').split('/')[0] || ''
          return validateLinkedinUsername(username).success
        } catch {
          return false
        }
      }

      return true
    },
    {
      message: 'Invalid username format',
    }
  )
  .transform((url) => {
    // Step 3: Clean tracking parameters
    return cleanTrackingParameters(url)
  })
  .transform((url) => {
    // Step 4: Ensure canonical format (prefer non-www)
    try {
      const urlObj = new URL(url)
      if (urlObj.hostname === 'www.linkedin.com') {
        urlObj.hostname = 'linkedin.com'
      }
      return urlObj.toString()
    } catch {
      return url
    }
  })
  .refine(
    (url) => {
      // Step 5: Final validation - must be a valid LinkedIn profile URL
      return validateLinkedinUrl(url).success
    },
    {
      message: 'Must be a valid LinkedIn profile URL after normalization',
    }
  )

// Export the complete normalization function
export const normalizeLinkedinUrl = (input: string) => {
  return linkedinUrlNormalizationSchema.safeParse(input)
}

// Complete normalization with suspicious URL analysis
export const normalizeLinkedinUrlWithAnalysis = (input: string) => {
  // First, analyze suspicious indicators on the original input (before cleaning)
  const flexibleResult = validateFlexibleInput(input)
  let originalUrlForAnalysis = input

  if (flexibleResult.success) {
    // If it's just a username, create a temporary URL for analysis
    const processed = flexibleResult.data
    if (!processed.includes('/') && !processed.includes('.')) {
      const usernameValidation = validateLinkedinUsername(processed)
      if (usernameValidation.success) {
        originalUrlForAnalysis = `${LINKEDIN_BASE_URL}${processed}`
      }
    } else {
      originalUrlForAnalysis = processed
    }
  }

  // Analyze suspicious indicators on the original (or minimally processed) URL
  const originalSuspiciousIndicators = detectSuspiciousUrlIndicators(
    originalUrlForAnalysis
  )
  const originalIsSuspicious = isSuspiciousUrl(originalUrlForAnalysis)

  // Now perform the full normalization
  const normalizationResult = normalizeLinkedinUrl(input)

  if (!normalizationResult.success) {
    return {
      success: false as const,
      error: normalizationResult.error,
    }
  }

  const normalizedUrl = normalizationResult.data

  // Extract username for analysis
  let extractedUsername = ''
  try {
    const urlObj = new URL(normalizedUrl)
    extractedUsername = urlObj.pathname.replace('/in/', '').split('/')[0] || ''
  } catch {
    // URL should be valid at this point, but handle gracefully
    extractedUsername = 'unknown'
  }

  const result: UrlNormalizationResult = {
    originalInput: input,
    normalizedUrl,
    extractedUsername,
    wasTranformed: input !== normalizedUrl, // Compare original input, not trimmed
    suspiciousIndicators: originalSuspiciousIndicators, // Use original indicators
  }

  return {
    success: true as const,
    data: result,
    isSuspicious: originalIsSuspicious, // Use original suspicious status
  }
}

// URL normalization constants
export const LINKEDIN_BASE_URL = 'https://linkedin.com/in/'
// Removed unused export: LINKEDIN_WWW_BASE_URL

// Common tracking parameters to detect and remove
export const TRACKING_PARAMETERS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ref',
  'refId',
  'trackingId',
  'source',
  'src',
  'fbclid',
  'gclid',
] as const

// Suspicious URL patterns
export const SUSPICIOUS_PATTERNS = {
  // Very short usernames might be suspicious
  SHORT_USERNAME_THRESHOLD: 3,
  // URLs with many query parameters
  MAX_QUERY_PARAMS: 2,
  // Common suspicious query parameter patterns
  SUSPICIOUS_PARAM_PATTERNS: [/track/i, /ref/i, /source/i, /campaign/i],
} as const
