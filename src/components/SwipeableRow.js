import React from 'react';
import { Platform, View } from 'react-native';

let Swipeable;
try {
  if (Platform.OS !== 'web') {
    // Dynamic require to avoid bundler trying to resolve this on web if standard import is used
    // Using try-catch block to be extra safe against crashes
    Swipeable = require('react-native-gesture-handler/Swipeable').default;
  }
} catch (e) {
  console.warn("Swipeable import failed", e);
}

const SwipeableRow = ({ children, renderRightActions, renderLeftActions }) => {
  // If we are on web, OR if the Swipeable module failed to load, just render children
  if (Platform.OS === 'web' || !Swipeable) {
    return <View>{children}</View>;
  }
  
  return (
    <Swipeable 
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
    >
      {children}
    </Swipeable>
  );
};

export default SwipeableRow;
