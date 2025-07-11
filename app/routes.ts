import { index, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('api/qr/generate', 'routes/api.qr.generate.tsx'),
] satisfies RouteConfig
