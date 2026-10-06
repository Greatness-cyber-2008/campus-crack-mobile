import { API_BASE_URL } from '@/constants/api';
import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { getAuthHeader } from '@/lib/getAuthHeader';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

export default function PlannerGenerateScreen() {
  useUser();
  const router = useRouter();
  const { materialId, courseId } = useLocalSearchParams<{ materialId?: string; courseId?: string }>();

  const [title, setTitle] = useState('');
  const [totalWeeks, setTotalWeeks] = useState('12');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!materialId && !courseId) return;
    setLoading(true);
    setError(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/generate-study-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          materialId: materialId || undefined,
          courseId: courseId || undefined,
          totalWeeks: parseInt(totalWeeks, 10) || 12,
          startDate,
          title,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.status === 402) {
        router.push('/pricing');
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Something went wrong building your study plan.');
        return;
      }

      router.replace({ pathname: '/planner/[planId]' as any, params: { planId: data.planId } });
    } catch {
      setLoading(false);
      setError('Network error — please try again');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={styles.title}>Build a study plan</Text>
      <Text style={styles.subtitle}>
        {courseId
          ? 'This plan will be built from every file uploaded to this course, combined.'
          : 'A week-by-week breakdown for the whole semester, built from this material.'}
      </Text>

      <Text style={styles.label}>Plan title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. CYB 201 Semester Plan"
        placeholderTextColor={colors.slate}
      />

      <Text style={styles.label}>Total weeks in semester</Text>
      <TextInput
        style={styles.input}
        value={totalWeeks}
        onChangeText={setTotalWeeks}
        keyboardType="number-pad"
        placeholderTextColor={colors.slate}
      />

      <Text style={styles.label}>Semester start date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={startDate}
        onChangeText={setStartDate}
        placeholder="2026-09-01"
        placeholderTextColor={colors.slate}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {!materialId && !courseId && (
        <Text style={styles.warning}>No material or course selected — go back and upload your course outline first.</Text>
      )}

      <Pressable
        style={[styles.button, (loading || (!materialId && !courseId)) && { opacity: 0.6 }]}
        onPress={handleGenerate}
        disabled={loading || (!materialId && !courseId)}
      >
        {loading ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.buttonText}>Build study plan</Text>}
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
