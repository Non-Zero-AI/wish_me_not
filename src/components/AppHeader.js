import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const AppHeader = ({ title, showBack, rightAction, subTitle }) => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
      <View style={styles.brandingRow}>
         <View style={styles.logoContainer}>
            <Ionicons name="gift" size={20} color={theme.colors.primary} />
            <Text style={[styles.appName, { color: theme.colors.primary }]}>Wish Me Not</Text>
         </View>
      </View>
      
      <View style={styles.titleRow}>
        <View style={styles.leftContainer}>
            {showBack && (
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            )}
            <View>
                <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                {subTitle && <Text style={[styles.subTitle, { color: theme.colors.textSecondary }]}>{subTitle}</Text>}
            </View>
        </View>
        {rightAction && <View style={styles.rightContainer}>{rightAction}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 10, // Status bar spacing fix if not using SafeAreaView header (which we are usually inside SafeAreaView)
        paddingBottom: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    brandingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    appName: {
        fontSize: 16,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 32,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    backButton: {
        padding: 4,
        marginRight: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    subTitle: {
        fontSize: 12,
        marginTop: 2,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default AppHeader;
