import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useModal } from '../context/ModalContext';

const AppHeader = ({ title, showBack, rightAction, leftAction, subTitle }) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { setSideMenuVisible } = useModal();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
      
      {/* Left Section */}
      <View style={styles.leftContainer}>
        {showBack ? (
             <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                 <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
             </TouchableOpacity>
        ) : (
             <TouchableOpacity onPress={() => setSideMenuVisible(true)} style={styles.iconButton}>
                 <Ionicons name="menu" size={28} color={theme.colors.primary} />
             </TouchableOpacity>
        )}
      </View>

      {/* Center Section */}
      <View style={styles.centerContainer}>
          {showBack ? (
              <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>{title}</Text>
          ) : (
              <Image 
                  source={require('../../assets/Wish Me Not Logo.png')} 
                  style={styles.logo}
                  resizeMode="contain"
              />
          )}
      </View>

      {/* Right Section */}
      <View style={styles.rightContainer}>
          {rightAction}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 10, 
        paddingBottom: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        height: 70,
    },
    leftContainer: {
        width: 50,
        alignItems: 'flex-start',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightContainer: {
        width: 50,
        alignItems: 'flex-end',
    },
    iconButton: {
        padding: 4,
    },
    logo: {
        width: 160, 
        height: 50, 
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default AppHeader;
