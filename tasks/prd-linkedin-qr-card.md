# PRD: LinkedIn QR Card PWA (Version 0)

## Introduction/Overview

The LinkedIn QR Card PWA is a mobile-first Progressive Web App that generates QR codes for LinkedIn profiles, enabling professionals to quickly share their LinkedIn information at in-person networking events. Users enter their LinkedIn profile URL once, and the app displays a professional business card-style interface with a QR code that others can scan to instantly access their LinkedIn profile.

This document covers Version 0 implementation, which focuses on manual URL entry with cookie-based persistence, establishing the core user experience before adding LinkedIn OAuth integration in Version 1.

## Goals

1. **Primary Goal**: Enable seamless LinkedIn profile sharing at networking events through QR codes that are more reliable than verbal URL sharing
2. **User Experience**: Create a professional, clean mobile interface that loads instantly for returning users
3. **Accessibility**: Provide basic screen reader support and full keyboard navigation
4. **Performance**: Ensure QR codes display even without internet connectivity after initial setup
5. **Validation**: Prevent user errors through comprehensive LinkedIn URL validation with clear warnings

## User Stories

### Core User Stories

**As a networking professional, I want to:**
- Enter my LinkedIn profile URL once and have it remembered so I don't need to re-enter it at future events
- Display a professional QR code on my phone screen so others can easily scan and connect with me on LinkedIn
- Edit my LinkedIn URL when needed so I can update my profile information
- See clear warnings if my URL looks suspicious so I can fix potential scanning issues
- Use the app even when there's poor connectivity at events so the QR code still displays

**As someone scanning QR codes, I want to:**
- Scan a QR code and be taken directly to the person's LinkedIn profile so I can connect immediately
- Trust that the QR code is legitimate and safe to scan

### Edge Case User Stories

**As a user with accessibility needs, I want to:**
- Navigate the entire app using only keyboard inputs so I can use it with assistive technology
- Have screen readers properly announce all interface elements so I understand what's available
- Use the app in both light and dark modes so it's comfortable in different lighting conditions

## Functional Requirements

### URL Input and Validation
1. The system must accept LinkedIn profile URLs in multiple formats: `linkedin.com/in/username`, `www.linkedin.com/in/username`, `https://linkedin.com/in/username`
2. The system must accept LinkedIn handles (e.g., `username`) and automatically prepend `https://linkedin.com/in/`
3. The system must validate URLs in real-time using Zod 4 schemas and show inline error messages for invalid formats
4. The system must display warning banners for suspicious URLs (tracking parameters, very short usernames, unusual formatting) based on Zod validation rules
5. The system must allow users to proceed with warned URLs after acknowledging the warning
6. The system must normalize URLs to a consistent format before storage and QR generation using Zod transforms

### QR Code Generation and Display
7. The system must generate QR codes at 256x256px resolution with medium error correction
8. The system must display QR codes in a professional card layout with proper spacing and typography
9. The system must show a brief pulse animation when QR codes are first generated
10. The system must include the text "Point camera here to connect on LinkedIn" below the QR code
11. The system must maintain QR code functionality even when offline (after initial generation)

### Data Persistence
12. The system must save valid LinkedIn URLs in browser cookies with appropriate expiration
13. The system must immediately display the QR card for returning users with saved URLs
14. The system must provide an "Edit" button to modify saved URLs
15. The system must clear saved data when users manually delete their URL

### User Interface
16. The system must display an empty state with "Add your LinkedIn profile" CTA for new users
17. The system must use a business card aspect ratio (3:4) for the main card display
18. The system must implement the specified color palette (blue primary, slate backgrounds)
19. The system must use Inter font family with appropriate fallbacks
20. The system must be responsive and work optimally on mobile devices

### Error Handling
21. The system must display clear error messages when QR code generation fails
22. The system must show connection status indicators when offline
23. The system must provide retry options for failed operations
24. The system must gracefully handle disabled cookies with informative messages

### Accessibility
25. The system must support full keyboard navigation with visible focus indicators
26. The system must provide appropriate ARIA labels and descriptions for all interactive elements
27. The system must ensure color contrast ratios meet accessibility standards
28. The system must provide alternative text descriptions for QR codes
29. The system must support both light and dark color modes

## Non-Goals (Out of Scope)

- LinkedIn OAuth integration (reserved for Version 1)
- Profile picture display or automatic name retrieval
- Custom QR code styling or branding options
- URL analytics or click tracking
- Multiple profile support
- Social sharing features beyond QR codes
- Company or group LinkedIn page support
- QR code export or download functionality
- Push notifications or background sync
- Advanced PWA features like offline-first architecture

## Design Considerations

### Visual Design
- Follow Resend/Lovable design aesthetic with clean, modern styling
- Use Tailwind CSS utility classes for consistent spacing and typography
- Implement subtle animations (200-300ms duration) for state transitions
- Maintain generous whitespace and professional appearance suitable for business contexts

### Mobile-First Approach
- Design primarily for portrait orientation on mobile devices
- Ensure touch targets are minimum 44px for accessibility
- Use safe area padding for devices with notches or home indicators
- Center card design works well on larger screens without modification

### Component Architecture
- Build reusable UI primitives (Button, Input, Card, Label)
- Separate business logic into server-side modules (*.server.ts) and shared schemas (*.common.ts)
- Use client-side hooks for UI state management and API interactions
- Business logic is decoupled from UI components - no direct coupling between business/ and ui/
- Implement proper error boundaries for graceful failure handling

## Technical Considerations

### Technology Stack
- React Router v7 with TypeScript for type safety
- Tailwind CSS for styling with custom design system
- react-qr-code library for QR code generation
- Cookie-based persistence for profile URL storage
- Zod 4 for schema validation and type safety
- Vitest and React Testing Library for testing

### Browser Support
- Latest versions of Chrome, Safari, and Firefox
- Focus on modern mobile browsers (iOS 15+, Android 10+)
- Progressive enhancement for older browsers

### Security Requirements
- HTTPS-only deployment with proper SSL certificates
- Content Security Policy headers to prevent XSS attacks
- Input sanitization for all URL inputs
- Secure cookie configuration with appropriate flags

### Performance
- QR code generation should complete within 500ms on modern devices
- Initial page load should be under 2 seconds on 3G connections
- Returning users should see QR codes immediately (under 100ms)

## Success Metrics

### Primary Success Criteria
- **Real-world validation**: Successfully use the app at networking events where people can easily scan QR codes and reach LinkedIn profiles
- **User experience**: Returning users see their QR code within 100ms of opening the app
- **Reliability**: QR codes scan successfully on typical smartphone camera apps

### Secondary Success Criteria
- **Error reduction**: Users encounter fewer than 5% validation errors with properly formatted LinkedIn URLs
- **Accessibility**: App passes basic screen reader testing and keyboard navigation
- **Performance**: App loads and displays QR codes even in poor connectivity environments

## Open Questions

1. **Cookie expiration**: Should LinkedIn URLs persist indefinitely or expire after a certain period (e.g., 90 days)?
2. **URL validation strictness**: Should we reject URLs with tracking parameters entirely or just warn users?
3. **QR code size optimization**: Is 256x256px optimal for all devices, or should we implement responsive sizing?
4. **Error recovery**: How many retry attempts should we allow for failed QR code generation?
5. **Analytics**: Do we need basic usage analytics (page views, QR generations) for Version 0?

## Implementation Notes

### File Structure
```
app/
├── business/
│   ├── profile.server.ts      # Server-side profile logic
│   └── profile.common.ts      # Shared profile schemas (Zod)
│   ├── linkedin.server.ts     # Server-side URL validation
│   └── linkedin.common.ts     # LinkedIn URL schemas (Zod)
│   ├── qr.server.ts          # Server-side QR generation
│   └── qr.common.ts          # QR schemas (Zod)
│   ├── cookies.server.ts     # Server-side cookie utilities
│   └── cookies.common.ts     # Cookie schemas (Zod)
├── ui/
│   ├── hooks/
│   │   ├── use-profile-url.ts     # Client cookie management
│   │   ├── use-qr-code.ts         # Client QR generation
│   │   └── use-connection.ts      # Network status
│   ├── components/
│   │   ├── profile-card.tsx       # Main card display
│   │   ├── qr-code.tsx           # QR display
│   │   ├── url-input.tsx         # URL input form
│   │   ├── url-warning.tsx       # Warning display
│   │   ├── edit-button.tsx       # Edit functionality
│   │   └── connection-status.tsx # Network indicator
│   └── primitives/
│       ├── button.tsx            # Base button
│       ├── input.tsx             # Base input
│       ├── card.tsx              # Base card
│       └── label.tsx             # Base label
└── routes/
    ├── _index.tsx                # Home page
    └── edit.tsx                  # Edit URL page
```

### Testing Priority
1. Zod validation schemas and URL validation logic (unit tests)
2. Cookie persistence functionality (integration tests)
3. QR code generation with various inputs (unit tests)
4. Accessibility compliance (automated and manual testing)
5. Mobile device compatibility (manual testing)
