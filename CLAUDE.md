# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with HMR at http://localhost:5173
- `npm run build` - Create production build
- `npm run start` - Start production server using built files
- `npm run typecheck` - Run TypeScript type checking (also generates React Router types)

### Package Management
This project uses `pnpm` as the package manager (based on pnpm-lock.yaml).

## Architecture

This is a React Router v7 application with the following architecture:

### Project Structure
- `app/` - Main application code
  - `root.tsx` - Root layout component with error boundary and global HTML structure
  - `routes.ts` - Route configuration defining app navigation
  - `routes/` - Route components (currently just `home.tsx`)
  - `welcome/` - Welcome page components and assets
  - `app.css` - Global styles

### Key Technologies
- **React Router v7** - Full-stack React framework with SSR
- **TypeScript** - Type safety with automatic type generation via `react-router typegen`
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool and development server
- **SSR Enabled** - Server-side rendering is enabled by default (`react-router.config.ts`)

### Build Output
- `build/client/` - Static assets for client-side
- `build/server/` - Server-side code

### Development Notes
- Routes are defined in `app/routes.ts` using React Router's file-based routing system
- TypeScript types are auto-generated for routes - run `npm run typecheck` to regenerate
- The app uses server-side rendering by default but can be configured for SPA mode
- Error boundaries are implemented in `root.tsx` for both development and production