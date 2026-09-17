import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { colors, spacing, typography } from '../theme/theme';
import PrimaryButton from '../components/PrimaryButton';
import RegionBackground from '../components/RegionBackground';
import { useApp } from '../state/AppContext';
import { Pressable } from 'react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export default function AuthScreen({ navigation }: Props) {
  const { dispatch } = useApp();
  const [mode, setMode] = useState<'landing' | 'signup' | 'signin'>('landing');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function completeAuth() {
    dispatch({ type: 'SIGN_IN' });
    navigation.replace('PatientSetup');
  }

  function skipToDemo() {
    dispatch({ type: 'RESET_DEMO', seeded: true });
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <RegionBackground opacity={0.9} />
      <View style={styles.content}>
        <Text style={styles.brand}>Niramaya</Text>
        <Text style={[typography.bodyMuted, styles.tagline]}>
          A gentle daily companion for memory, routine, and connection.
        </Text>

        {mode === 'landing' && (
          <View style={styles.formCard}>
            <PrimaryButton label="Get Started" onPress={() => setMode('signup')} />
            <PrimaryButton
              label="Continue with Google"
              variant="outline"
              onPress={completeAuth}
              style={styles.googleBtn}
            />
            <Pressable onPress={() => setMode('signin')} style={styles.linkRow}>
              <Text style={styles.link}>I already have an account</Text>
            </Pressable>
            <Pressable onPress={skipToDemo}>
              <Text style={styles.skip}>Skip to a populated demo patient →</Text>
            </Pressable>
          </View>
        )}

        {(mode === 'signup' || mode === 'signin') && (
          <View style={styles.formCard}>
            <Text style={typography.h2}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</Text>
            <TextInput
              placeholder="Username"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <PrimaryButton
              label={mode === 'signup' ? 'Create Account' : 'Sign In'}
              onPress={completeAuth}
              disabled={!username || !password}
            />
            <PrimaryButton label="Back" variant="outline" onPress={() => setMode('landing')} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.md },
  brand: { fontSize: 30, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: 0.5 },
  tagline: { textAlign: 'center', marginBottom: spacing.md },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
  },
  googleBtn: { marginTop: spacing.xs },
  linkRow: { alignItems: 'center', paddingTop: spacing.xs },
  link: { textAlign: 'center', color: colors.text, fontWeight: '700', fontSize: 16 },
  skip: { textAlign: 'center', color: colors.textMuted, fontWeight: '600', fontSize: 14, paddingTop: spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
