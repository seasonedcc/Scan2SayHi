# Tasks: LinkedIn QR Card PWA (Version 0)

## Relevant Files

### Foundation & Configuration
- `package.json` - Project dependencies including Zod 4, react-qr-code, and testing libraries
- `biome.json` - Biome linter configuration with formatting and import organization rules
- `tsconfig.json` - TypeScript configuration with strict mode and Zod-friendly settings
- `vitest.config.ts` - Vitest test configuration with jsdom environment
- `tests/setup.ts` - Test environment setup with jest-dom matchers
- `tests/example.test.ts` - Basic test to verify test environment
- `app/app.css` - Tailwind CSS configuration with custom blue primary and slate color palette

### Directory Structure (Created)
- `app/business/linkedin/` - LinkedIn URL validation and normalization logic
- `app/business/qr/` - QR code generation logic
- `app/business/cookies/` - Cookie management utilities
- `app/business/profile/` - Profile data management
- `app/ui/hooks/` - Custom React hooks
- `app/ui/components/` - Reusable UI components
- `app/ui/primitives/` - Base UI primitives

### Business Logic Files
- `app/business/linkedin/linkedin.common.ts` - Zod schemas for LinkedIn URL validation and normalization
- `app/business/linkedin/linkedin.common.test.ts` - Comprehensive unit tests for LinkedIn URL validation

### Planned Files (To Be Created)
- `app/business/linkedin/linkedin.server.ts` - Server-side LinkedIn URL validation logic
- `app/business/profile/profile.common.ts` - Zod schemas for profile data structures
- `app/business/profile/profile.server.ts` - Server-side profile management logic
- `app/business/qr/qr.common.ts` - Zod schemas for QR code configuration
- `app/business/qr/qr.server.ts` - Server-side QR code generation logic
- `app/business/cookies/cookies.common.ts` - Zod schemas for cookie data structures
- `app/business/cookies/cookies.server.ts` - Server-side cookie management utilities
- `app/ui/hooks/use-profile-url.ts` - Client-side hook for profile URL management
- `app/ui/hooks/use-qr-code.ts` - Client-side hook for QR code generation
- `app/ui/hooks/use-connection.ts` - Client-side hook for network status
- `app/ui/primitives/button.tsx` - Base button component
- `app/ui/primitives/input.tsx` - Base input component with validation states
- `app/ui/primitives/card.tsx` - Base card component for layout
- `app/ui/primitives/label.tsx` - Base label component for form elements
- `app/ui/components/url-input.tsx` - URL input form with real-time validation
- `app/ui/components/url-warning.tsx` - Warning display for suspicious URLs
- `app/ui/components/qr-code.tsx` - QR code display component
- `app/ui/components/profile-card.tsx` - Main business card layout component
- `app/ui/components/edit-button.tsx` - Edit functionality component
- `app/ui/components/connection-status.tsx` - Network status indicator
- `app/routes/_index.tsx` - Home page route component
- `app/routes/edit.tsx` - Edit URL page route component

### Notes

- Unit tests should be placed alongside code files (e.g., `linkedin.common.test.ts` next to `linkedin.common.ts`)
- Use `npm run test` to run tests (based on package.json configuration)
- Business logic files (*.server.ts) contain server-side logic only
- Shared schemas (*.common.ts) use Zod 4 and can be imported by both client and server

## Tasks

- [x] 1.0 Set up project foundation and dependencies
  - [x] 1.1 Install Zod 4 and react-qr-code dependencies in package.json
  - [x] 1.2 Install and configure Biome linter for code formatting and linting
  - [x] 1.3 Configure TypeScript settings for proper Zod integration
  - [x] 1.4 Set up Tailwind CSS custom color palette (blue primary, slate backgrounds)
  - [x] 1.5 Configure Inter font family with appropriate fallbacks
  - [x] 1.6 Set up testing environment with Vitest and React Testing Library
  - [x] 1.7 Create basic directory structure (business/, ui/hooks, ui/components, ui/primitives)

- [ ] 2.0 Implement LinkedIn URL validation and normalization system
  - [x] 2.1 Create `app/business/linkedin/linkedin.common.ts` with Zod schemas for URL validation
  - [x] 2.2 Implement URL format acceptance (linkedin.com/in/username, www.linkedin.com/in/username, https://linkedin.com/in/username)
  - [x] 2.3 Add automatic handle prepending logic (username → https://linkedin.com/in/username)
  - [x] 2.4 Create validation rules for suspicious URLs (tracking parameters, short usernames, unusual formatting)
  - [x] 2.5 Implement URL normalization transforms using Zod
  - [ ] 2.6 Create `app/business/linkedin/linkedin.server.ts` with server-side validation functions
  - [ ] 2.7 Write comprehensive unit tests for all validation scenarios
  - [ ] 2.8 Test edge cases and malformed URL handling

- [ ] 3.0 Build QR code generation and display functionality
  - [ ] 3.1 Create `app/business/qr/qr.common.ts` with Zod schemas for QR configuration
  - [ ] 3.2 Implement `app/business/qr/qr.server.ts` with 256x256px QR generation at medium error correction
  - [ ] 3.3 Create `app/ui/hooks/use-qr-code.ts` for client-side QR code management
  - [ ] 3.4 Build `app/ui/components/qr-code.tsx` with professional card layout and pulse animation
  - [ ] 3.5 Add "Point camera here to connect on LinkedIn" text below QR code
  - [ ] 3.6 Implement offline QR code functionality (display cached QR after initial generation)
  - [ ] 3.7 Add error handling for QR generation failures with retry options
  - [ ] 3.8 Write unit tests for QR generation with various URL inputs

- [ ] 4.0 Create data persistence layer with cookie management
  - [ ] 4.1 Create `app/business/cookies/cookies.common.ts` with Zod schemas for cookie data
  - [ ] 4.2 Implement `app/business/cookies/cookies.server.ts` with secure cookie utilities
  - [ ] 4.3 Build `app/ui/hooks/use-profile-url.ts` for client-side URL persistence
  - [ ] 4.4 Configure appropriate cookie expiration and secure flags
  - [ ] 4.5 Implement URL clearing functionality when users delete their data
  - [ ] 4.6 Add graceful handling for disabled cookies with informative messages
  - [ ] 4.7 Create `app/business/profile/profile.common.ts` and `profile.server.ts` for profile data management
  - [ ] 4.8 Write integration tests for cookie persistence functionality

- [ ] 5.0 Develop user interface components and user experience flows
  - [ ] 5.1 Create UI primitives: `button.tsx`, `input.tsx`, `card.tsx`, `label.tsx` with accessibility features
  - [ ] 5.2 Build `app/ui/components/url-input.tsx` with real-time validation and inline error messages
  - [ ] 5.3 Implement `app/ui/components/url-warning.tsx` for suspicious URL warnings with acknowledgment
  - [ ] 5.4 Create `app/ui/components/profile-card.tsx` with business card aspect ratio (3:4)
  - [ ] 5.5 Build `app/ui/components/edit-button.tsx` for URL modification functionality
  - [ ] 5.6 Implement `app/ui/hooks/use-connection.ts` and `app/ui/components/connection-status.tsx` for offline indicators
  - [ ] 5.7 Create `app/routes/_index.tsx` with empty state "Add your LinkedIn profile" CTA for new users
  - [ ] 5.8 Build `app/routes/edit.tsx` for URL editing workflow
  - [ ] 5.9 Implement full keyboard navigation with visible focus indicators
  - [ ] 5.10 Add proper ARIA labels and descriptions for all interactive elements
  - [ ] 5.11 Ensure color contrast ratios meet accessibility standards
  - [ ] 5.12 Implement both light and dark color modes
  - [ ] 5.13 Add subtle animations (200-300ms duration) for state transitions
  - [ ] 5.14 Ensure mobile-first responsive design with minimum 44px touch targets
  - [ ] 5.15 Test accessibility compliance with screen readers and keyboard navigation