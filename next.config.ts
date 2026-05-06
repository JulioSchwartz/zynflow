import withPWA from '@ducanh2912/next-pwa'

const withPWAConfig = withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
})

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/landing.html',
      },
    ]
  },
}

export default withPWAConfig(nextConfig)