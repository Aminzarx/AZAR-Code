// react-native-vector-icons ships Flow types, not TypeScript ones — this
// is a minimal ambient declaration covering exactly the props Icon.tsx
// (src/shared/components/Icon.tsx) actually uses.
declare module 'react-native-vector-icons/Ionicons' {
  import type { Component } from 'react'
  import type { TextStyle, StyleProp } from 'react-native'

  type IoniconsProps = {
    name: string
    size?: number
    color?: string
    style?: StyleProp<TextStyle>
  }

  export default class Ionicons extends Component<IoniconsProps> {}
}
