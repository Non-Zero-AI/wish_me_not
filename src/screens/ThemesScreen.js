import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/themes';
import AppHeader from '../components/AppHeader';
import { Ionicons } from '@expo/vector-icons';

const ThemePreview = ({ themeDef, isDarkPreview, isActive, onSelect }) => {
  const colors = isDarkPreview ? themeDef.colors.dark : themeDef.colors.light;

  return (
    <TouchableOpacity 
      style={[
        styles.previewCard, 
        isActive && styles.activeCard,
        { borderColor: isActive ? colors.primary : '#e0e0e0' }
      ]} 
      onPress={onSelect}
    >
      <View style={[styles.previewContainer, { backgroundColor: colors.background }]}>
        {/* Mini Header */}
        <View style={[styles.previewHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View style={[styles.previewTitleLine, { backgroundColor: colors.text }]} />
        </View>

        {/* Mini Content */}
        <View style={styles.previewContent}>
          <View style={[styles.previewTextLine, { backgroundColor: colors.textSecondary, width: '70%' }]} />
          <View style={[styles.previewTextLine, { backgroundColor: colors.textSecondary, width: '50%' }]} />
          
          {/* Mini Button */}
          <View style={[styles.previewButton, { backgroundColor: colors.primary }]}>
             <View style={[styles.previewButtonText, { backgroundColor: colors.textInverse }]} />
          </View>
        </View>

        {/* Selected Badge */}
        {isActive && (
          <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={12} color={colors.textInverse} />
          </View>
        )}
      </View>
      <Text style={styles.themeName}>{themeDef.name}</Text>
    </TouchableOpacity>
  );
};

const ThemesScreen = () => {
  const { theme, currentThemeId, setThemeId, isDark } = useTheme();
  const [previewMode, setPreviewMode] = useState(isDark ? 'dark' : 'light');
  const insets = useSafeAreaInsets();

  const togglePreviewMode = () => {
    setPreviewMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.colors.background,
        paddingTop: Platform.OS === 'web' ? 0 : insets.top,
        paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
      }
    ]}>
      <AppHeader title="Choose Theme" showBack={true} />
      
      <View style={[styles.controls, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.controlText, { color: theme.colors.text }]}>Preview Mode: {previewMode === 'dark' ? 'Dark' : 'Light'}</Text>
        <Switch
          value={previewMode === 'dark'}
          onValueChange={togglePreviewMode}
          trackColor={{ false: '#767577', true: theme.colors.primary }}
          thumbColor={previewMode === 'dark' ? theme.colors.secondary : '#f4f3f4'}
        />
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={[styles.grid, { paddingBottom: Platform.OS === 'web' ? 200 : 120 }]}
      >
        {themes.map(t => (
          <ThemePreview 
            key={t.id} 
            themeDef={t} 
            isDarkPreview={previewMode === 'dark'}
            isActive={currentThemeId === t.id}
            onSelect={() => setThemeId(t.id)}
          />
        ))}
        
        <View style={styles.affiliateContainer}>
            <Text style={[styles.affiliateText, { color: theme.colors.textSecondary }]}>
                Color themes brought to you by Coolors, click our{' '}
                <Text 
                    style={{ color: theme.colors.primary, textDecorationLine: 'underline', fontWeight: 'bold' }}
                    onPress={() => Linking.openURL('https://coolors.co/?ref=6929554bfd89e1000f3efb62')}
                >
                    Affiliate Link
                </Text>
                {' '}to support
            </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  controlText: {
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  previewCard: {
    width: '48%',
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#fff', // Fallback
    elevation: 2,
  },
  activeCard: {
    elevation: 5,
  },
  previewContainer: {
    height: 120,
    width: '100%',
    padding: 8,
    position: 'relative',
  },
  previewHeader: {
    height: 20,
    borderBottomWidth: 1,
    marginBottom: 10,
    justifyContent: 'center',
  },
  previewTitleLine: {
    height: 6,
    width: '40%',
    borderRadius: 3,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
  },
  previewTextLine: {
    height: 4,
    borderRadius: 2,
    marginBottom: 6,
  },
  previewButton: {
    height: 24,
    borderRadius: 6,
    marginTop: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '60%',
    alignSelf: 'center',
  },
  previewButtonText: {
    height: 4,
    width: '50%',
    borderRadius: 2,
  },
  themeName: {
    padding: 10,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
    color: '#333', // Should ideally match surface text but tough inside scrollview with diff backgrounds
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  affiliateContainer: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  affiliateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  }
});

export default ThemesScreen;
