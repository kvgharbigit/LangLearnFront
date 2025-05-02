import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export const SafeView: React.FC<SafeViewProps> = ({ children, style }) => {
  const insets = useSafeAreaInsets();

  const top = typeof insets.top === 'number' ? insets.top : 0;
  const bottom = typeof insets.bottom === 'number' ? insets.bottom : 0;
  const left = typeof insets.left === 'number' ? insets.left : 0;
  const right = typeof insets.right === 'number' ? insets.right : 0;

  return (
    <View
      style={[
        {
          paddingTop: top,
          paddingBottom: bottom,
          paddingLeft: left,
          paddingRight: right,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default SafeView;