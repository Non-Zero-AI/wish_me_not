import React from 'react';
import Swipeable from 'react-native-gesture-handler/Swipeable';

const SwipeableRow = ({ children, renderRightActions }) => {
  return (
    <Swipeable renderRightActions={renderRightActions}>
      {children}
    </Swipeable>
  );
};

export default SwipeableRow;
