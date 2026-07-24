import { useEffect, useState } from 'react'
import { createDraftSession } from './session.js'

export function useDraftSession(options = {}) {
  const [session] = useState(() => createDraftSession(options))

  useEffect(() => () => {
    session.destroy()
  }, [session])

  return session
}
