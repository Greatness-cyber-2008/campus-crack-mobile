import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const DISCIPLINES = ['general', 'computing', 'medical', 'commercial', 'science', 'arts', 'law', 'engineering'];

export default function CreateCourseScreen() {
  const { user } = useUser();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [discipline, setDiscipline] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!user || !title.trim()) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('courses')
      .insert({ user_id: user.id, title: title.trim(), course_code: courseCode || null, discipline })
      .select()
      .single();

    setLoading(false);
    if (error || !data) {
      setError(error?.message || 'Could not create course');
      return;
    }

    router.replace({ pathname: '/courses/[courseId]' as any, params: { courseId: data.id } });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={styles.title}>Create a course</Text>
      <Text style={styles.subtitle}>
        Upload multiple files into this course and build one study plan from all of them.
      </Text>

      <Text style={styles.label}>Course name</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Network Security"
        placeholderTextColor={colors.slate}
      />

      <Text style={styles.label}>Course code</Text>
      <TextInput
        style={styles.input}
        value={courseCode}
        onChangeText={setCourseCode}
        placeholder="CYB 201"
        placeholderTextColor={colors.slate}
      />

      <Text style={styles.label}>Discipline</Text>
      <View style={styles.chipRow}>
        {DISCIPLINES.map((d) => (
          <Pressable key={d} style={[styles.chip, discipline === d && styles.chipActive]} onPress={() => setDiscipline(d)}>
            <Text style={[styles.chipText, discipline === d && styles.chipTextActive]}>{d}</Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, (!title.trim() || loading) && { opacity: 0.6 }]} onPress={handleCreate} disabled={!title.trim() || loading}>
        {loading ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.buttonText}>Create course</Text>}
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  chipActive: { backgroundColor: 'rgba(232,184,74,0.15)', borderColor: colors.gold },
  chipText: { color: colors.slate, fontSize: 12.5, textTransform: 'capitalize' },
  chipTextActive: { color: colors.gold },
  error: { color: colors.stamp, fontSize: 13, marginBottom: 14 },
  button: { backgroundColor: colors.gold, paddingVertical: 15, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
});
