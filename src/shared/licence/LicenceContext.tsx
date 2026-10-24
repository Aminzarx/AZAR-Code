import { createContext, useContext } from 'react'

/**
 * Amin #4906: what the licence allows right now. Shared components read it (the add button, the search box) so the
 * read-only mode after the licence ends needs no change in every list. Outside a provider (tests, the sign-in
 * screens) everything is open.
 */
export type Licence = {
  /** false after the licence ended: only viewing and reading the user's own files stays open */
  canEdit: boolean
  state: 'trial' | 'active' | 'free' | 'expired' | 'unknown'
  /** ISO end of the trial or the paid month; null when free or not known yet */
  endsAt: string | null
  /** the monthly renewal in toman from kss-pricing; null = not priced yet (cannot be bought) */
  monthlyToman: number | null
  trialDays: number | null
  /** asks the server again (online) */
  refresh: () => Promise<void>
}

export const OPEN_LICENCE: Licence = {
  canEdit: true,
  state: 'unknown',
  endsAt: null,
  monthlyToman: null,
  trialDays: null,
  refresh: () => Promise.resolve()
}

export const LicenceContext = createContext<Licence>(OPEN_LICENCE)

export function useLicence(): Licence {
  return useContext(LicenceContext)
}
