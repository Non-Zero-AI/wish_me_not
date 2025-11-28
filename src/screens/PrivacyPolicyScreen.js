import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import AppHeader from '../components/AppHeader';

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Privacy Policy" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
          Last updated: November 28, 2025
          {'\n\n'}
          1. Introduction{'\n'}
          Welcome to Wish Me Not. We respect your privacy and are committed to protecting your personal data.
          {'\n\n'}
          2. Data We Collect{'\n'}
          We collect information you provide directly to us, such as your name and wishlist items.
          {'\n\n'}
          3. How We Use Your Data{'\n'}
          We use your data to provide and improve our services, specifically to help you share your wishlist with friends.
          {'\n\n'}
          4. Sharing Your Data{'\n'}
          We do not sell your personal data. We only share it as described in this policy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
});
