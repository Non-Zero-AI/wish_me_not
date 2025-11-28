import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import AppHeader from '../components/AppHeader';

export default function UserAgreementScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="User Agreement" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
          Last updated: November 28, 2025
          {'\n\n'}
          1. Acceptance of Terms{'\n'}
          By accessing and using Wish Me Not, you accept and agree to be bound by the terms and provision of this agreement.
          {'\n\n'}
          2. Use of Service{'\n'}
          You agree to use this service only for lawful purposes and in a way that does not infringe the rights of others.
          {'\n\n'}
          3. Termination{'\n'}
          We reserve the right to terminate your access to the service without cause or notice.
          {'\n\n'}
          4. Disclaimer{'\n'}
          The service is provided "as is" without any warranties.
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
