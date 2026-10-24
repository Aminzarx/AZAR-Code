import React, { useContext } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon, type IconName } from './Icon'

/**
 * v1.4.0 (Amin #4311 «بعضی بخش ها هم خیلی شبیه به همه»): each part of the
 * app has its own name, icon and accent colour, shown in the header of its
 * detail and create screens, so a property file never looks like an
 * applicant, a deal or a contract.
 */
export type SectionKey = 'property' | 'applicant' | 'matching' | 'deal' | 'contract' | 'reminder'

export const SECTIONS: Record<SectionKey, { label: string; icon: IconName; accent: string; tint: string }> = {
  property: { label: 'فایل ملک', icon: 'building', accent: '#2563EB', tint: '#EAF1FE' },
  applicant: { label: 'متقاضی', icon: 'people', accent: '#0F766E', tint: '#E6F4F2' },
  matching: { label: 'تطبیق', icon: 'matching', accent: '#7C3AED', tint: '#F1EBFE' },
  deal: { label: 'معامله', icon: 'deal', accent: '#B45309', tint: '#FDF1E3' },
  contract: { label: 'قرارداد', icon: 'contract', accent: '#BE123C', tint: '#FCE9ED' },
  reminder: { label: 'یادآوری', icon: 'bell', accent: '#4A6383', tint: '#EDF1F6' }
}

/** a small coloured chip: the section's icon and name */
export function SectionMark({ section }: { section: SectionKey }): React.JSX.Element {
  const theme = useTheme()
  const s = SECTIONS[section]
  return (
    <View style={[markStyles.chip, { backgroundColor: s.tint }]} accessibilityLabel={s.label}>
      <Icon name={s.icon} size="xs" color={s.accent} />
      <Text style={[theme.typography('labelSm'), { color: s.accent, fontWeight: '700' }]}>{s.label}</Text>
    </View>
  )
}

const ROUTE_LABEL: Record<string, string> = {
  Home: 'خانه',
  Files: 'فایل‌ها',
  PropertyList: 'فایل‌های ملکی',
  PropertyDetail: 'فایل ملک',
  CreateProperty: 'فایل تازه',
  ApplicantList: 'متقاضیان',
  ApplicantDetail: 'متقاضی',
  CreateApplicant: 'متقاضی تازه',
  Matching: 'تطبیق',
  DealList: 'معاملات',
  DealDetail: 'معامله',
  ContractList: 'قراردادها',
  ContractDetail: 'قرارداد',
  CreateContract: 'قرارداد تازه',
  ReminderList: 'یادآوری‌ها',
  ReminderDetail: 'یادآوری',
  CreateReminder: 'یادآوری تازه',
  Settings: 'تنظیمات'
}

/**
 * «where am I»: the path that led to this screen inside its tab, e.g.
 * «خانه ‹ معاملات ‹ معامله». Read from the stack itself, so it is always
 * the real way back (what the back button retraces).
 */
export function useWhereAmI(): string | null {
  const navigation = useContext(NavigationContext)
  const route = useContext(NavigationRouteContext)
  const state = navigation?.getState?.() as { routes?: { key: string; name: string }[] } | undefined
  if (!state?.routes || !route) {
    return null
  }
  const own = state.routes.findIndex((r) => r.key === route.key)
  const path = (own >= 0 ? state.routes.slice(0, own + 1) : state.routes)
    .map((r) => ROUTE_LABEL[r.name])
    .filter(Boolean)
  return path.length > 1 ? path.slice(-4).join(' ‹ ') : null
}

/** the «where am I» line under a header */
export function WhereAmILine({ theme }: { theme: Theme }): React.JSX.Element | null {
  const where = useWhereAmI()
  if (!where) {
    return null
  }
  return (
    <Text
      style={[theme.typography('labelSm'), { color: theme.colors.onSurfaceVariant, marginTop: 2 }]}
      numberOfLines={1}
    >
      {where}
    </Text>
  )
}

const markStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  }
})
