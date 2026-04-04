'use client'

import { useState, useEffect } from 'react'

const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? new Date().toISOString()

export function DeployTimestamp() {
  const [formatted, setFormatted] = useState('')

  useEffect(() => {
    setFormatted(
      new Date(BUILD_TIME).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    )
  }, [])

  if (!formatted) {
    return null
  }

  return <>Deployed: {formatted}</>
}
