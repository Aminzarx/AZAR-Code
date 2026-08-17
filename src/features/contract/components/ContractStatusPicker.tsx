import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SegmentedControl } from '@shared/components'
import { CONTRACT_STATUSES } from '@infrastructure/database/repositories/ContractRepository'
import { CONTRACT_STATUS_LABELS } from '../statusPresentation'
import type { ContractStatus } from '../types'

type Props = {
  status: ContractStatus
  onChange: (status: ContractStatus) => void
  disabled?: boolean
}

const OPTIONS = CONTRACT_STATUSES.map((status) => ({
  value: status,
  label: CONTRACT_STATUS_LABELS[status]
}))

/**
 * design-system.md §17.4 — contract status change goes through the same
 * `SegmentedControl` used for every other fixed, always-fits-one-row,
 * mutually-exclusive choice in the app, instead of a bespoke chip row.
 * `disabled` (mid-request) isn't part of `SegmentedControl`'s own API,
 * so it's applied here as a wrapping `pointerEvents`/opacity guard —
 * the same disabled treatment `Button` uses.
 */
export function ContractStatusPicker({ status, onChange, disabled }: Props): React.JSX.Element {
  return (
    <View style={disabled ? styles.disabled : undefined} pointerEvents={disabled ? 'none' : 'auto'}>
      <SegmentedControl options={OPTIONS} value={status} onChange={onChange} />
    </View>
  )
}

// Same disabled treatment as `Button` (design-system.md §7.1).
const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5
  }
})
