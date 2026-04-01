'use client'
import { GoogleOAuthProvider } from '@react-oauth/google'

export function Providers({ children, googleClientId }: { children: React.ReactNode; googleClientId?: string }) {
  if (googleClientId) {
    return <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>
  }
  return <>{children}</>
}
