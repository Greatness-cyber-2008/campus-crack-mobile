import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/home');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Start with 3 free question sets, no card needed.</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Adebayo Gboyega"
        placeholderTextColor={colors.slate}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@school.edu.ng"
        placeholderTextColor={colors.slate}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="At least 6 characters"
        placeholderTextColor={colors.slate}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleSignup} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.buttonText}>Create account</Text>}
      </Pressable>

      <Pressable onPress={() => router.push('/login')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, justifyContent: 'center', paddingHorizontal: 28 },
  title: { color: colors.paper, fontSize: 26, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: colors.slate, fontSize: 13, marginBottom: 24 },
  label: { color: colors.slate, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: colors.inkLight,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.paper,
    marginBottom: 18,
    fontSize: 15,
  },
  error: { color: colors.stamp, marginBottom: 14, fontSize: 13 },
  button: {
    backgroundColor: colors.gold,
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  link: { color: colors.gold, textAlign: 'center', fontSize: 13 },
});