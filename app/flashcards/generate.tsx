import { API_BASE_URL } from '@/constants/api';
import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { getAuthHeader } from '@/lib/getAuthHeader';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

export default function FlashcardGenerateScreen() {
  useUser();
  const router = useRouter();
  const { materialId } = useLocalSearchParams<{ materialId?: string }>();

  const [title, setTitle] = useState('');
  const [cardCount, setCardCount] = useState('20');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!materialId) return;
    setLoading(true);
    setError(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/generate-flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ materialId, cardCount: parseInt(cardCount, 10) || 20, title }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.status === 402) {
        router.push('/pricing');
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Something went wrong generating your flashcards.');
        return;
      }

      router.replace({ pathname: '/flashcards/[setId]' as any, params: { setId: data.flashcardSetId } });
    } catch {
      setLoading(false);
      setError('Network error — please try again');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={styles.title}>Generate flashcards</Text>
      <Text style={styles.subtitle}>
        Short cards for daily review — great for the whole semester, not just exam week.
      </Text>

      <Text style={styles.label}>Set title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. CYB 201 Key Terms"
        placeholderTextColor={colors.slate}
      />

      <Text style={styles.label}>Number of cards</Text>
      <TextInput
        style={styles.input}
        value={cardCount}
        onChangeText={setCardCount}
        keyboardType="number-pad"
        placeholderTextColor={colors.slate}
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {!materialId && <Text style={styles.warning}>No material selected — go back and upload one first.</Text>}

      <Pressable
        style={[styles.button, (loading || !materialId) && { opacity: 0.6 }]}
        onPress={handleGenerate}
        disabled={loading || !materialId}
      >
        {loading ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.buttonText}>Generate flashcards</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  title: { color: colors.paper, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: colors.slate, fontSize: 13, marginBottom: 20 },
  label: { color: colors.slate, fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.paper, marginBottom: 16, fontSize: 15 },
  error: { color: colors.stamp, fontSize: 13, marginBottom: 14 },
  warning: { color: colors.stamp, fontSize: 13, textAlign: 'center', marginBottom: 14 },
  button: { backgroundColor: colors.gold, paddingVertical: 15, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
});
