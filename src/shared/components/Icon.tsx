import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '../theme'

export type IconName =
  | 'chevron'
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

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type Props = {
  name: IconName
  /** design-tokens.json icon-size scale (16/18/24/32/48). Defaults to icon-md, the documented default. */
  size?: IconSize
  color?: string
  /** Directional glyphs (currently just `chevron`) flip in RTL; everything else is direction-agnostic. */
  accessibilityLabel?: string
}

/**
 * A small, hand-drawn (pure View/border composition, zero dependencies)
 * line-icon set — design-system.md §6. Every icon font/vector-icon
 * library investigated either needs native linking or only ships a web
 * font format (woff2) Android can't load, so this is the deliberate,
 * documented approach, not a stopgap: one stroke-weight formula and one
 * corner-rounding convention keep the whole set reading as one family.
 * Covers exactly the icons this app's screens use; extend the switch
 * below as real needs come up, not speculatively.
 */
export function Icon({ name, size = 'md', color, accessibilityLabel }: Props): React.JSX.Element {
  const theme = useTheme()
  const box = theme.iconSize[size]
  const tint = color ?? theme.colors.onSurface
  // Thinner than the old 1.5–2.7px range — a hairline stroke reads calmer/more refined, consistent with §0's "minimal luxury" direction.
  const stroke = Math.max(1.25, box / 14)

  return (
    <View
      style={[styles.box, { width: box, height: box }]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      {renderGlyph(name, box, stroke, tint, theme.isRTL)}
    </View>
  )
}

function renderGlyph(
  name: IconName,
  box: number,
  stroke: number,
  tint: string,
  isRTL: boolean
): React.JSX.Element {
  switch (name) {
    case 'chevron':
      return (
        <View
          style={[
            styles.chevron,
            {
              width: box * 0.4,
              height: box * 0.4,
              borderColor: tint,
              borderRightWidth: stroke,
              borderTopWidth: stroke,
              transform: [{ rotate: isRTL ? '-45deg' : '135deg' }]
            }
          ]}
        />
      )
    case 'plus':
      return (
        <>
          <View
            style={[
              styles.absoluteBar,
              { width: box * 0.6, height: stroke, backgroundColor: tint }
            ]}
          />
          <View
            style={[
              styles.absoluteBar,
              { width: stroke, height: box * 0.6, backgroundColor: tint }
            ]}
          />
        </>
      )
    case 'check':
      return (
        <View
          style={[
            styles.check,
            {
              width: box * 0.55,
              height: box * 0.3,
              borderColor: tint,
              borderBottomWidth: stroke,
              borderLeftWidth: stroke
            }
          ]}
        />
      )
    case 'close':
      return (
        <>
          <View
            style={[
              styles.absoluteBar,
              {
                width: box * 0.65,
                height: stroke,
                backgroundColor: tint,
                transform: [{ rotate: '45deg' }]
              }
            ]}
          />
          <View
            style={[
              styles.absoluteBar,
              {
                width: box * 0.65,
                height: stroke,
                backgroundColor: tint,
                transform: [{ rotate: '-45deg' }]
              }
            ]}
          />
        </>
      )
    case 'logout':
      return (
        <>
          <View
            style={{
              width: box * 0.4,
              height: box * 0.7,
              borderColor: tint,
              borderWidth: stroke,
              borderRightWidth: 0,
              borderTopLeftRadius: 3,
              borderBottomLeftRadius: 3
            }}
          />
          <View
            style={[
              styles.absoluteBar,
              {
                width: box * 0.4,
                height: stroke,
                backgroundColor: tint,
                left: box * 0.35
              }
            ]}
          />
          <View
            style={[
              styles.chevron,
              {
                position: 'absolute',
                left: box * 0.42,
                width: box * 0.22,
                height: box * 0.22,
                borderColor: tint,
                borderRightWidth: stroke,
                borderTopWidth: stroke,
                transform: [{ rotate: '45deg' }]
              }
            ]}
          />
        </>
      )
    case 'home':
      return (
        <>
          <View
            style={{
              width: box * 0.62,
              height: box * 0.62,
              borderColor: tint,
              borderWidth: stroke,
              transform: [{ rotate: '45deg' }],
              borderBottomWidth: 0,
              borderRightWidth: 0,
              marginBottom: box * 0.18
            }}
          />
          <View
            style={[
              styles.absoluteBar,
              {
                bottom: box * 0.15,
                width: box * 0.55,
                height: box * 0.35,
                backgroundColor: 'transparent',
                borderColor: tint,
                borderWidth: stroke,
                borderTopWidth: 0
              }
            ]}
          />
        </>
      )
    case 'files':
      return (
        <View
          style={{
            width: box * 0.75,
            height: box * 0.58,
            borderColor: tint,
            borderWidth: stroke,
            borderRadius: 3
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: -stroke,
              [isRTL ? 'right' : 'left']: box * 0.08,
              width: box * 0.3,
              height: box * 0.14,
              borderColor: tint,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2
            }}
          />
        </View>
      )
    case 'matching':
      return (
        <>
          <View
            style={[
              styles.absoluteBar,
              { top: box * 0.28, width: box * 0.55, height: stroke, backgroundColor: tint }
            ]}
          />
          <View
            style={[
              styles.chevron,
              {
                position: 'absolute',
                top: box * 0.16,
                right: box * 0.16,
                width: box * 0.18,
                height: box * 0.18,
                borderColor: tint,
                borderRightWidth: stroke,
                borderTopWidth: stroke,
                transform: [{ rotate: '45deg' }]
              }
            ]}
          />
          <View
            style={[
              styles.absoluteBar,
              { top: box * 0.6, width: box * 0.55, height: stroke, backgroundColor: tint }
            ]}
          />
          <View
            style={[
              styles.chevron,
              {
                position: 'absolute',
                top: box * 0.48,
                left: box * 0.16,
                width: box * 0.18,
                height: box * 0.18,
                borderColor: tint,
                borderLeftWidth: stroke,
                borderBottomWidth: stroke,
                transform: [{ rotate: '45deg' }]
              }
            ]}
          />
        </>
      )
    case 'contract':
      return (
        <View
          style={{
            width: box * 0.62,
            height: box * 0.78,
            borderColor: tint,
            borderWidth: stroke,
            borderRadius: 3,
            justifyContent: 'center',
            gap: box * 0.1
          }}
        >
          <View style={{ height: stroke, marginHorizontal: box * 0.1, backgroundColor: tint }} />
          <View style={{ height: stroke, marginHorizontal: box * 0.1, backgroundColor: tint }} />
          <View
            style={{
              height: stroke,
              marginHorizontal: box * 0.1,
              width: '40%',
              backgroundColor: tint
            }}
          />
        </View>
      )
    case 'settings':
      return (
        <View
          style={{
            width: box * 0.65,
            height: box * 0.65,
            borderRadius: box,
            borderWidth: stroke,
            borderColor: tint,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <View
            style={{
              width: box * 0.22,
              height: box * 0.22,
              borderRadius: box,
              backgroundColor: tint
            }}
          />
        </View>
      )
    case 'copy':
      return (
        <>
          <View
            style={{
              width: box * 0.5,
              height: box * 0.5,
              borderColor: tint,
              borderWidth: stroke,
              borderRadius: 3,
              position: 'absolute',
              top: box * 0.12,
              [isRTL ? 'left' : 'right']: box * 0.1
            }}
          />
          <View
            style={{
              width: box * 0.5,
              height: box * 0.5,
              borderColor: tint,
              borderWidth: stroke,
              borderRadius: 3,
              position: 'absolute',
              bottom: box * 0.12,
              [isRTL ? 'right' : 'left']: box * 0.1
            }}
          />
        </>
      )
    case 'alert':
      return (
        <View
          style={{
            width: box * 0.75,
            height: box * 0.75,
            borderRadius: box,
            borderWidth: stroke,
            borderColor: tint,
            alignItems: 'center',
            justifyContent: 'center',
            gap: box * 0.08
          }}
        >
          <View style={{ width: stroke, height: box * 0.28, backgroundColor: tint }} />
          <View
            style={{ width: stroke, height: stroke, borderRadius: stroke, backgroundColor: tint }}
          />
        </View>
      )
    case 'inbox':
      return (
        <View
          style={{
            width: box * 0.7,
            height: box * 0.55,
            borderColor: tint,
            borderWidth: stroke,
            borderRadius: 3,
            justifyContent: 'center'
          }}
        >
          <View style={{ height: stroke, backgroundColor: tint }} />
        </View>
      )
    case 'person':
      return (
        <>
          <View
            style={{
              width: box * 0.34,
              height: box * 0.34,
              borderRadius: box,
              backgroundColor: tint,
              marginBottom: box * 0.06
            }}
          />
          <View
            style={{
              width: box * 0.62,
              height: box * 0.34,
              backgroundColor: tint,
              borderTopLeftRadius: box * 0.34,
              borderTopRightRadius: box * 0.34
            }}
          />
        </>
      )
    case 'calendar':
      return (
        <View
          style={{
            width: box * 0.72,
            height: box * 0.64,
            borderColor: tint,
            borderWidth: stroke,
            borderRadius: 4,
            justifyContent: 'flex-start'
          }}
        >
          <View style={{ height: box * 0.16, backgroundColor: tint, borderRadius: 2 }} />
        </View>
      )
    case 'deal':
      // A flag on a pole — a pipeline/pursuit marker, deliberately
      // distinct from 'matching' (the crossed-chevron compare glyph):
      // 'matching' is the Matching tab's own icon, and reusing it for
      // Deals conflated two different concepts under one glyph.
      return (
        <>
          <View
            style={{
              width: Math.max(stroke, box * 0.07),
              height: box * 0.68,
              backgroundColor: tint,
              borderRadius: stroke,
              position: 'absolute',
              bottom: box * 0.12,
              [isRTL ? 'right' : 'left']: box * 0.22
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: box * 0.14,
              [isRTL ? 'right' : 'left']: box * 0.22 + Math.max(stroke, box * 0.07),
              width: box * 0.42,
              height: box * 0.3,
              backgroundColor: tint,
              borderTopRightRadius: isRTL ? 2 : box * 0.14,
              borderBottomRightRadius: isRTL ? 2 : box * 0.14,
              borderTopLeftRadius: isRTL ? box * 0.14 : 2,
              borderBottomLeftRadius: isRTL ? box * 0.14 : 2
            }}
          />
        </>
      )
    case 'chevronDouble':
      return (
        <>
          <View
            style={[
              styles.chevron,
              {
                width: box * 0.32,
                height: box * 0.32,
                borderColor: tint,
                borderRightWidth: stroke,
                borderTopWidth: stroke,
                marginBottom: -box * 0.1,
                transform: [{ rotate: isRTL ? '-45deg' : '135deg' }]
              }
            ]}
          />
          <View
            style={[
              styles.chevron,
              {
                width: box * 0.32,
                height: box * 0.32,
                borderColor: tint,
                borderRightWidth: stroke,
                borderTopWidth: stroke,
                transform: [{ rotate: isRTL ? '-45deg' : '135deg' }]
              }
            ]}
          />
        </>
      )
  }
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  absoluteBar: {
    position: 'absolute',
    borderRadius: 2
  },
  chevron: {
    borderRadius: 2
  },
  check: {
    transform: [{ rotate: '-45deg' }],
    borderRadius: 2
  }
})
