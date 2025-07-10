# LinkedIn QR Card PWA - Implementation Plan

## Project Overview

A mobile-first PWA that generates QR codes for LinkedIn profiles, allowing users to easily share their professional information at in-person networking events. Two-phase approach with progressive enhancement.

**Primary Use Case**: In-person networking events where professionals can quickly share their LinkedIn profiles by displaying a QR code on their phone screen for others to scan.

## Tech Stack

- **Frontend**: TypeScript + React Router (framework mode)
- **Styling**: Tailwind CSS
- **QR Generation**: qrcode.js
- **Data Persistence**: localStorage/cookies (v0), PostgreSQL (v1)
- **Testing**: Vitest + React Testing Library
- **Linting**: Biome
- **Database (v1)**: PostgreSQL + Kysely
- **Authentication (v1)**: LinkedIn OAuth 2.0
- **Deployment**: Digital Ocean App Platform

## Version 0: Manual URL Entry

### Features
- Manual LinkedIn profile URL/handle input (individual profiles only)
- Professional, playful mobile UI optimized for networking events
- Simple QR code generation (black/white, no customization)
- Profile URL persistence (cookies)
- PWA installability
- URL editing capability
- Test scan feature to verify QR code works
- URL validation with warnings for questionable URLs
- Accessibility compliance (WCAG 2.1 AA)
- Connection status awareness

### User Flow
1. User opens app (with onboarding tooltip for first-time users)
2. Enters LinkedIn profile URL or handle
3. App validates URL and shows warnings if questionable
4. User confirms or fixes URL
5. App stores valid URL in cookie
6. Displays professional card with QR code
7. User can test QR code functionality
8. Others scan QR → redirected to LinkedIn profile

### First-Time User Onboarding
1. Brief tooltip explaining the app purpose
2. Example of valid LinkedIn URL format
3. Instructions for QR code usage at networking events

### Core Components
```
app/
├── ui/
│   ├── ProfileCard.tsx       # Main card display
│   ├── QRCode.tsx           # QR code generation with test scan
│   ├── URLInput.tsx         # Profile URL input form with validation
│   ├── URLWarning.tsx       # Warning banner for questionable URLs
│   ├── EditButton.tsx       # Edit profile URL
│   ├── TestScanButton.tsx   # Test QR code functionality
│   ├── InstallPrompt.tsx    # PWA install prompt
│   ├── OnboardingTooltip.tsx # First-time user guidance
│   ├── ConnectionStatus.tsx # Network connectivity indicator
│   └── ErrorBoundary.tsx    # Error handling wrapper
├── business/
│   ├── hooks/
│   │   ├── useProfileURL.ts     # Cookie management
│   │   ├── useQRCode.ts         # QR code generation
│   │   ├── usePWA.ts           # PWA install detection
│   │   ├── useOnboarding.ts     # First-time user state
│   │   └── useConnection.ts     # Network status monitoring
│   ├── services/
│   │   ├── linkedin.ts          # URL validation/normalization
│   │   ├── cookies.ts           # Cookie helpers
│   │   ├── qr.ts               # QR code utilities
│   │   └── validation.ts        # URL validation with warnings
│   └── types/
│       ├── profile.ts           # Profile type definitions
│       └── validation.ts        # Validation result types
└── routes/
    ├── _index.tsx              # Home page
    ├── edit.tsx                # Edit profile URL page
    ├── test-scan.tsx           # Test QR scan functionality
    └── root.tsx                # Root layout with error boundary
```

### Design Elements (Playful + Professional)
- **Color Scheme**: LinkedIn blue (#0077B5) + modern gradients
- **Animations**: 
  - Gentle card entrance animation
  - QR code "pulse" when generated
  - Smooth micro-interactions on buttons
  - Floating particles background (subtle)
- **Typography**: Clean sans-serif with proper hierarchy
- **Interactive Elements**:
  - Button hover states with gentle transforms
  - Card tilt on device motion (subtle parallax)
  - Loading states with skeleton screens

## Version 1: LinkedIn OAuth Integration

### Additional Features
- LinkedIn OAuth sign-in
- Automatic name and profile picture
- Session management
- User profiles database storage
- Profile picture caching

### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  linkedin_id VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  profile_picture_url TEXT,
  linkedin_profile_url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Additional Components (v1)
```
app/
├── ui/
│   ├── LoginButton.tsx      # LinkedIn OAuth
│   ├── UserProfile.tsx     # Authenticated user card
│   └── LogoutButton.tsx    # Sign out
├── business/
│   ├── services/
│   │   ├── auth.ts             # OAuth flow
│   │   ├── linkedin-api.ts     # LinkedIn API
│   │   └── database.ts         # DB operations
│   └── types/
│       └── user.ts             # User type definitions
└── routes/
    ├── auth/
    │   ├── login.tsx           # Login page
    │   └── callback.tsx        # OAuth callback
    └── dashboard.tsx           # Authenticated user dashboard
```

## Implementation Phases

### Phase 1: Core Setup
1. Initialize React Router project with TypeScript
2. Setup Tailwind CSS and Biome
3. Configure PWA manifest and service worker
4. Setup Vitest testing environment

### Phase 2: V0 Implementation
1. Create URL input and validation system
2. Implement QR code generation
3. Build professional card UI with animations
4. Add cookie-based URL persistence
5. Implement URL editing functionality
6. Add PWA install prompt

### Phase 3: V0 Polish
1. Add loading states and error handling
2. Implement responsive design
3. Add accessibility features
4. Write unit tests
5. Performance optimization

### Phase 4: V1 Database Setup
1. Setup PostgreSQL on Digital Ocean
2. Configure Kysely ORM
3. Create database migrations
4. Setup connection pooling

### Phase 5: V1 Authentication
1. Setup LinkedIn OAuth application
2. Implement OAuth flow
3. Create session management
4. Add authenticated user experience

### Phase 6: V1 Integration
1. Connect authentication with existing UI
2. Profile picture caching and fallbacks
3. Enhanced error handling
4. Migration path from v0 to v1

## File Structure
```
linkedin-card/
├── app/
│   ├── business/
│   │   ├── hooks/
│   │   │   ├── use-profile-url.ts
│   │   │   ├── use-pwa.ts
│   │   │   └── use-qr-code.ts
│   │   ├── services/
│   │   │   ├── cookies.ts
│   │   │   ├── linkedin.ts
│   │   │   └── qr.ts
│   │   └── types/
│   │       └── profile.ts
│   ├── routes/
│   │   ├── _index.tsx
│   │   ├── edit.tsx
│   │   └── root.tsx
│   ├── styles/
│   │   └── globals.css
│   ├── ui/
│   │   ├── components/
│   │   │   ├── edit-button.tsx
│   │   │   ├── install-prompt.tsx
│   │   │   ├── profile-card.tsx
│   │   │   ├── qr-code.tsx
│   │   │   └── url-input.tsx
│   │   └── primitives/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── label.tsx
│   └── utils.ts
├── db/                      # Database migrations (v1)
│   ├── migrations/
│   └── types.ts
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── manifest.json
├── biome.json
├── package.json
├── plan.md
├── pnpm-lock.yaml
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## LinkedIn URL Handling & Validation

### Supported Formats (Individual Profiles Only)
- `linkedin.com/in/username`
- `linkedin.com/in/firstname-lastname-123456`
- `www.linkedin.com/in/username`
- `https://linkedin.com/in/username`
- Handle input: `username` (auto-prepends linkedin.com/in/)

### Validation Rules
- **Accept**: Standard individual profile URLs
- **Warn**: 
  - URLs with unusual parameters or tracking codes
  - Very short/generic usernames that might be fake
  - URLs that redirect through multiple domains
- **Reject**: 
  - Company pages (`/company/`)
  - Learning courses (`/learning/`)
  - Posts or articles
  - Non-LinkedIn domains

### URL Warning System
```typescript
type ValidationResult = {
  isValid: boolean;
  warning?: 'suspicious-url' | 'tracking-parameters' | 'short-username';
  normalizedUrl: string;
  message?: string;
}
```

### Visual Warning Display
- Large yellow warning banner above QR code
- Clear text: "⚠️ This URL looks unusual. Others may hesitate to scan it."
- Option to edit URL or proceed anyway
- Warning persists until URL is corrected

## QR Code Specifications

### Technical Configuration
- **Size**: 256x256px (optimal for phone screens at arm's length)
- **Error Correction**: Medium (M) - 15% recovery capability
- **Style**: Simple black squares on white background
- **Quiet Zone**: 4 modules border for reliable scanning
- **Content**: Direct LinkedIn profile URL (no shorteners)

### Test Scan Feature
- Button to open device camera for QR testing
- Immediate feedback if QR scan succeeds/fails
- Instructions: "Point your camera at the QR code to test"
- Success message: "✓ QR code works! Others can scan this."
- Failure guidance: "Try adjusting lighting or distance"

## PWA Configuration
- Manifest with proper icons and theme colors
- Service worker for offline capability
- Install prompt for better mobile experience
- Proper viewport and mobile optimization
- Offline indicator when QR generation unavailable

## Deployment Strategy
- Digital Ocean App Platform
- Automatic SSL certificates
- Built-in load balancing and scaling
- Managed PostgreSQL database (v1)
- Environment variable configuration
- Automated deployments from Git

## Testing Strategy

### Automated Testing
- Unit tests for URL validation logic
- Component testing for UI elements (React Testing Library)
- Hook testing for cookie persistence and QR generation
- Accessibility testing with axe-core
- Error boundary testing

### Manual Testing Matrix
**Mobile Devices (Modern Only)**:
- iPhone (Safari, Chrome) - iOS 15+
- Android (Chrome, Samsung Browser) - Android 10+

**Test Scenarios**:
1. **URL Input**: Valid URLs, invalid URLs, edge cases
2. **QR Generation**: Various URL lengths, special characters
3. **Test Scan**: QR code readability in different lighting
4. **Cookie Persistence**: Browser refresh, app reinstall
5. **Accessibility**: Screen reader, keyboard navigation, high contrast
6. **Network States**: Online, offline, slow connection
7. **PWA Install**: Install prompt, offline usage

### Accessibility Testing Checklist
- Screen reader compatibility (VoiceOver, TalkBack)
- Keyboard navigation (tab order, focus management)
- Color contrast ratios (4.5:1 minimum)
- Touch target sizes (44px minimum)
- Alternative text for QR codes
- Focus indicators
- ARIA labels and descriptions

## Error Handling & Edge Cases

### Network Connectivity
- **Offline**: Show clear indicator "Offline - QR codes may not work for others"
- **Slow Connection**: Display loading states with progress
- **Failed Requests**: Simple notification without retries

### Browser Support Issues
- **Cookies Disabled**: Warning message with instructions to enable
- **LocalStorage Full**: Fallback to session storage, then memory only
- **Camera Access Denied**: Disable test scan feature gracefully

### QR Code Generation Failures
- **Invalid URL**: Clear error message with format examples
- **Generation Error**: Fallback message: "Unable to create QR code"
- **Display Issues**: Alternative text representation of URL

### User Experience Errors
- **Long URLs**: Warn if QR becomes hard to scan
- **Special Characters**: Sanitize and warn about potential issues
- **Empty Input**: Helpful placeholder text and validation

## Security Considerations
- HTTPS only
- Secure cookie settings
- Input validation and sanitization for all URLs
- No external API calls (except LinkedIn redirect)
- Content Security Policy headers

## Updated File Structure (v0 Complete)
```
linkedin-card/
├── app/
│   ├── business/
│   │   ├── hooks/
│   │   │   ├── use-profile-url.ts
│   │   │   ├── use-pwa.ts
│   │   │   ├── use-qr-code.ts
│   │   │   ├── use-onboarding.ts
│   │   │   └── use-connection.ts
│   │   ├── services/
│   │   │   ├── cookies.ts
│   │   │   ├── linkedin.ts
│   │   │   ├── qr.ts
│   │   │   └── validation.ts
│   │   └── types/
│   │       ├── profile.ts
│   │       └── validation.ts
│   ├── routes/
│   │   ├── _index.tsx
│   │   ├── edit.tsx
│   │   ├── test-scan.tsx
│   │   └── root.tsx
│   ├── styles/
│   │   └── globals.css
│   ├── ui/
│   │   ├── components/
│   │   │   ├── connection-status.tsx
│   │   │   ├── edit-button.tsx
│   │   │   ├── error-boundary.tsx
│   │   │   ├── install-prompt.tsx
│   │   │   ├── onboarding-tooltip.tsx
│   │   │   ├── profile-card.tsx
│   │   │   ├── qr-code.tsx
│   │   │   ├── test-scan-button.tsx
│   │   │   ├── url-input.tsx
│   │   │   └── url-warning.tsx
│   │   └── primitives/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── label.tsx
│   └── utils.ts
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── manifest.json
├── tests/
│   ├── __mocks__/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── setup.ts
├── biome.json
├── package.json
├── plan.md
├── pnpm-lock.yaml
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## Implementation Priority Order (v0)

### Phase 1: Foundation (Critical Path)
1. Project setup with React Router + TypeScript + Tailwind
2. Basic error boundary and root layout
3. Core URL validation service
4. Cookie persistence service
5. Simple QR code generation

### Phase 2: Core Features
1. URL input component with validation
2. URL warning system
3. Profile card with QR display
4. Edit functionality
5. Connection status monitoring

### Phase 3: User Experience
1. Onboarding tooltip for first-time users
2. Test scan feature with camera access
3. PWA install prompt
4. Accessibility improvements
5. Error handling polish

### Phase 4: Testing & Polish
1. Unit tests for validation and utilities
2. Component tests with accessibility checks
3. Manual testing on target devices
4. Performance optimization
5. Final accessibility audit

This plan provides a clear roadmap from simple manual entry to a full-featured LinkedIn integration while maintaining a clean, professional, and playful user experience.
