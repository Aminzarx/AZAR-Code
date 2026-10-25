import React from 'react'
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle
} from 'react-native'
import { rtlFontFamilyByWeight } from '../theme/tokens'

/**
 * Amin #5299: no text in the system font. babel.config.js points every `Text`/`TextInput` imported from
 * 'react-native' in src/ here; a text whose style names no font gets Vazirmatn in its weight. Texts styled through
 * theme.typography (Vazirmatn, IRANYekan for headings) keep their own font.
 */
function fontFor(weight: TextStyle['fontWeight']): string {
  const w = weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : Number(weight) || 400
  return rtlFontFamilyByWeight[w >= 600 ? '700' : w >= 500 ? '500' : '400']
}

function withFont(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) ?? {}
  return flat.fontFamily ? style : [style, { fontFamily: fontFor(flat.fontWeight) }]
}

export function Text({ style, ...props }: TextProps & { ref?: React.Ref<RNText> }): React.JSX.Element {
  return <RNText {...props} style={withFont(style)} />
}

function FontTextInput({ style, ...props }: TextInputProps & { ref?: React.Ref<RNTextInput> }): React.JSX.Element {
  return <RNTextInput {...props} style={withFont(style)} />
}

/** keeps TextInput.State (focused input) and the other statics */
export const TextInput = Object.assign(FontTextInput, { State: RNTextInput.State })
