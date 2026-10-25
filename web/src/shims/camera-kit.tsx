// EYVAN web: no in-app camera scanner in the browser; the screen keeps its code field for typing the code.
import React from 'react'
import { Text, View } from 'react-native'

export function Camera(props: { style?: object }) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', padding: 16 }, props.style]}>
      <Text style={{ textAlign: 'center' }}>روی وب، کد را در خانهٔ بالا بنویسید.</Text>
    </View>
  )
}
export const CameraType = { Back: 'back', Front: 'front' }
export default { Camera, CameraType }
