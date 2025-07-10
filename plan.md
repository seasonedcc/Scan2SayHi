# LinkedIn QR Card PWA - Implementation Plan

## Project Overview

A mobile-first PWA that generates QR codes for LinkedIn profiles, allowing users to easily share their professional information at in-person networking events. Two-phase approach with progressive enhancement.

**Primary Use Case**: In-person networking events where professionals can quickly share their LinkedIn profiles by displaying a QR code on their phone screen for others to scan.

## Tech Stack

- **Frontend**: TypeScript + React Router (framework mode)
- **Styling**: Tailwind CSS + Inter font
- **QR Generation**: qrcode.js
- **Data Persistence**: cookies (v0), PostgreSQL (v1)
- **Testing**: Vitest + React Testing Library
- **Linting**: Biome
- **Database (v1)**: PostgreSQL + Kysely
- **Authentication (v1)**: LinkedIn OAuth 2.0
- **Deployment**: Digital Ocean App Platform

## Design System

### Color Palette
- **Primary**: `bg-blue-600` (#2563eb) - Main actions, LinkedIn-inspired
- **Secondary**: `bg-slate-100` (#f1f5f9) - Card backgrounds
- **Accent**: `bg-emerald-500` (#10b981) - Success states
- **Warning**: `bg-amber-500` (#f59e0b) - URL warnings  
- **Error**: `bg-red-500` (#ef4444) - Validation errors
- **Text**: `text-slate-900` / `text-slate-600` / `text-slate-400`
- **Borders**: `border-slate-200` / `border-slate-300`

### Typography
- **Font Family**: `font-inter` (Inter via CDN fallback to `font-sans`)
- **Headings**: `text-2xl font-semibold` for card title
- **Body**: `text-base font-normal` for main text
- **CTA**: `text-sm font-medium` for button text
- **Small**: `text-xs font-normal` for helper text

### Spacing System (Tailwind Scale)
- **Micro**: `space-y-2` (8px) - Between related elements
- **Small**: `space-y-4` (16px) - Between component sections  
- **Medium**: `space-y-6` (24px) - Between major sections
- **Large**: `space-y-8` (32px) - Card padding
- **Extra Large**: `space-y-12` (48px) - Page margins

### Interactive States
- **Buttons**:
  - Default: `bg-blue-600 text-white`
  - Hover: `hover:bg-blue-700 transform hover:scale-[1.02]`
  - Focus: `focus:ring-4 focus:ring-blue-200 focus:outline-none`
  - Active: `active:scale-[0.98]`
  - Disabled: `disabled:bg-slate-300 disabled:cursor-not-allowed`
  
- **Input Fields**:
  - Default: `border-slate-300 focus:border-blue-500`
  - Focus: `focus:ring-2 focus:ring-blue-200`
  - Error: `border-red-500 focus:border-red-500 focus:ring-red-200`
  - Success: `border-emerald-500 focus:border-emerald-500`

### Layout & Responsive
- **Container**: `max-w-md mx-auto` (448px max width, centered)
- **Safe Areas**: `px-4 pt-safe pb-safe` using `@tailwindcss/safe-area` plugin
- **Breakpoints**: Tailwind defaults (sm: 640px, md: 768px, lg: 1024px)
- **Desktop**: Same centered card design, just more breathing room

### Animations
- **Timing**: `duration-200` (200ms) for micro-interactions, `duration-300` (300ms) for transitions
- **Easing**: `ease-out` for entrances, `ease-in-out` for state changes
- **Card Entrance**: `animate-in fade-in-0 slide-in-from-bottom-4 duration-300`
- **QR Generation**: `animate-pulse` briefly when QR appears
- **Button Interactions**: `transition-all duration-200 ease-out`

## Version 0: Manual URL Entry

### Features
- Manual LinkedIn profile URL/handle input (individual profiles only)
- Modern, clean mobile UI following Resend/Lovable design aesthetic
- Simple QR code generation (black/white, no customization)
- Profile URL persistence (cookies)
- URL editing capability
- URL validation with warnings for questionable URLs
- Accessibility compliance (WCAG 2.1 AA)
- Connection status awareness
- Portrait-only orientation

### User Flow
1. User opens app
2. **New User**: Sees empty card with "Add your LinkedIn profile" CTA
3. **Returning User**: If cookie exists, immediately shows card with QR code
4. Enters LinkedIn profile URL or handle
5. App validates URL and shows warnings if questionable
6. User confirms or fixes URL
7. App stores valid URL in cookie
8. Displays professional card with QR code and "Point camera here to connect on LinkedIn" CTA
9. Others scan QR → redirected to LinkedIn profile

### Return User Experience
1. App loads → Check cookie for saved LinkedIn URL
2. If URL exists → Immediately display card with QR code
3. If no URL → Show empty state with URL input CTA

### Error Recovery
- **QR Generation Fails**: Clear input field, show error message: "Please try entering your URL again"
- **Invalid URL**: Show inline validation error, keep input focused
- **Network Issues**: Show connection status, allow retry

### Core Components
```
app/
├── ui/
│   ├── ProfileCard.tsx       # Main card display
│   ├── QRCode.tsx           # QR code generation and display
│   ├── URLInput.tsx         # Profile URL input form with validation
│   ├── URLWarning.tsx       # Warning banner for questionable URLs
│   ├── EditButton.tsx       # Edit profile URL
│   ├── ConnectionStatus.tsx # Network connectivity indicator
│   └── ErrorBoundary.tsx    # Error handling wrapper
├── business/
│   ├── hooks/
│   │   ├── useProfileURL.ts     # Cookie management
│   │   ├── useQRCode.ts         # QR code generation
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
    └── root.tsx                # Root layout with error boundary
```

### Card Design (Resend/Lovable Style)
- **Container**: `bg-white rounded-2xl shadow-lg border border-slate-200`
- **Aspect Ratio**: `aspect-[3/4]` (business card-like proportions)
- **Padding**: `p-8` (32px) for generous whitespace
- **Structure**:
  ```
  ┌─────────────────────┐
  │  [Future: Avatar]   │ 
  │  [Future: Name]     │
  │                     │
  │    ████████████     │ ← QR Code (centered)
  │    ████████████     │
  │    ████████████     │
  │                     │
  │ "Scan to connect"   │ ← CTA (bottom)
  └─────────────────────┘
  ```

### Content States
- **No URL**: Large CTA button "Add your LinkedIn profile"
- **URL Added**: QR code + bottom text "Point camera here to connect on LinkedIn"

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


## PWA Configuration (v0.5)
- Manifest with proper icons and theme colors
- Service worker for offline capability
- Install prompt for better mobile experience (moved to v0.5)
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
3. **Cookie Persistence**: Browser refresh, app reinstall
4. **Accessibility**: Screen reader, keyboard navigation, high contrast
5. **Network States**: Online, offline, slow connection
6. **Return User Flow**: Saved URL persistence and immediate QR display

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
│   │   │   ├── use-qr-code.ts
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
│   │   └── root.tsx
│   ├── styles/
│   │   └── globals.css
│   ├── ui/
│   │   ├── components/
│   │   │   ├── connection-status.tsx
│   │   │   ├── edit-button.tsx
│   │   │   ├── error-boundary.tsx
│   │   │   ├── profile-card.tsx
│   │   │   ├── qr-code.tsx
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
1. Return user flow with cookie persistence
2. Accessibility improvements
3. Error handling polish
4. Connection status monitoring

### Phase 4: Testing & Polish
1. Unit tests for validation and utilities
2. Component tests with accessibility checks
3. Manual testing on target devices
4. Performance optimization
5. Final accessibility audit

This plan provides a clear roadmap from simple manual entry to a full-featured LinkedIn integration while maintaining a clean, professional, and playful user experience.
