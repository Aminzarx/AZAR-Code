import React from 'react'
import { View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTheme } from '../theme'

export type IconName =
  | 'chevron'
  | 'back'
  | 'plus'
  | 'check'
  | 'close'
  | 'logout'
  | 'home'
  | 'files'
  | 'matching'
  | 'contract'
  | 'settings'
  | 'copy'
  | 'alert'
  | 'inbox'
  | 'person'
  | 'calendar'
  | 'chevronDouble'
  | 'deal'
  | 'filter'
  | 'scan'
  | 'moreVertical'
  | 'download'
  | 'share'
  | 'upload'
  | 'phone'
  | 'search'
  | 'bell'
  | 'time'
  | 'trash'
  | 'building'
  | 'people'
  | 'sms'
  | 'cloud'
  | 'help'
  | 'mobile'
  | 'qr'
  | 'camera'
  | 'whatsapp'
  | 'telegram'
  | 'chat'
  | 'token'
  | 'edit'
  | 'lock'
  | 'ribbon'
  | 'cloud-offline'
  | 'moon'
  | 'image'
  | 'info'

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type Props = {
  name: IconName
  /** design-tokens.json icon-size scale (16/18/24/32/48). Defaults to icon-md, the documented default. */
  size?: IconSize
  color?: string
  /** Directional glyphs (chevron, back, chevronDouble) flip in RTL; everything else is direction-agnostic. */
  accessibilityLabel?: string
}

/**
 * design-system.md §6 — a hand-drawn (pure View/border composition)
 * glyph set previously lived here, but it kept shipping visibly wrong
 * shapes across several rounds of fixes. react-native-vector-icons'
 * Ionicons font is a mature, professionally drawn set that renders
 * identically regardless of how carefully any one glyph is hand-coded;
 * android/app/build.gradle links only the Ionicons.ttf it needs.
 */
export function Icon({ name, size = 'md', color, accessibilityLabel }: Props): React.JSX.Element {
  const theme = useTheme()
  const box = theme.iconSize[size]
  const tint = color ?? theme.colors.onSurface
  const glyphName = glyphFor(name, theme.isRTL)

  return (
    <View
      style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      <Ionicons name={glyphName} size={box} color={tint} />
    </View>
  )
}

function glyphFor(name: IconName, isRTL: boolean): string {
  switch (name) {
    case 'chevron':
      return isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'
    // The mirror of 'chevron' — that one is a disclosure/forward
    // indicator (points toward the reading-end, i.e. left in RTL); a
    // back-navigation control points the opposite way, toward where the
    // user came from (right in RTL).
    case 'back':
      return isRTL ? 'chevron-forward-outline' : 'chevron-back-outline'
    case 'chevronDouble':
      return isRTL ? 'play-skip-back-outline' : 'play-skip-forward-outline'
    case 'plus':
      return 'add'
    case 'check':
      return 'checkmark'
    case 'close':
      return 'close'
    case 'logout':
      return 'log-out-outline'
    case 'home':
      return 'home-outline'
    case 'files':
      return 'folder-outline'
    case 'matching':
      return 'swap-horizontal-outline'
    case 'contract':
      return 'document-text-outline'
    case 'settings':
      return 'settings-outline'
    case 'copy':
      return 'copy-outline'
    case 'alert':
      return 'alert-circle-outline'
    case 'inbox':
      return 'file-tray-outline'
    case 'person':
      return 'person-outline'
    case 'calendar':
      return 'calendar-outline'
    case 'deal':
      return 'briefcase-outline'
    case 'filter':
      return 'options-outline'
    case 'scan':
      return 'scan-outline'
    case 'moreVertical':
      return 'ellipsis-vertical'
    case 'download':
      return 'download-outline'
    case 'share':
      return 'share-outline'
    case 'upload':
      return 'cloud-upload-outline'
    case 'phone':
      return 'call-outline'
    case 'search':
      return 'search-outline'
    case 'bell':
      return 'notifications-outline'
    case 'time':
      return 'time-outline'
    case 'trash':
      return 'trash-outline'
    case 'building':
      return 'business-outline'
    case 'people':
      return 'people-outline'
    case 'sms':
      return 'chatbubble-ellipses-outline'
    case 'cloud':
      return 'cloud-outline'
    case 'help':
      return 'help-circle-outline'
    case 'mobile':
      return 'phone-portrait-outline'
    case 'qr':
      return 'qr-code-outline'
    case 'camera':
      return 'camera-outline'
    case 'whatsapp':
      return 'logo-whatsapp'
    case 'telegram':
      return 'paper-plane-outline'
    case 'chat':
      return 'chatbubbles-outline'
    case 'token':
      return 'server-outline'
    case 'edit':
      return 'create-outline'
    case 'lock':
      return 'lock-closed-outline'
    case 'ribbon':
      return 'ribbon-outline'
    case 'cloud-offline':
      return 'cloud-offline-outline'
    case 'moon':
      return 'moon-outline'
    case 'image':
      return 'images-outline'
    case 'info':
      return 'information-circle-outline'
  }
}
