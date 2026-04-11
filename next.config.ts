import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'
import path from 'node:path'

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
})

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
}

export default withSerwist(nextConfig)
