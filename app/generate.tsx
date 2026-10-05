import { API_BASE_URL } from '@/constants/api';
import { colors } from '@/constants/theme';
import { useUser, } from '@/hooks/useUser';
import { getAuthHeader } from '@/lib/getAuthHeader';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const FREE_MAX_QUESTIONS = 10;

export default function GenerateScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { materialId } = useLocalSearchParams<{ materialId: string }>();

  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [examMode, setExamMode] = useState<'cbt' | 'written'>('cbt');
  const [difficulty, setDifficulty] = useState('mixed');
  const [questionCount, setQuestionCount] = useState('10');
  const [title, setTitle] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
      setIsPremium(!!data?.is_premium);
    })();
  }, [user]);

  async function handleGenerate() {
    if (!materialId) return;
    setLoading(true);
    setError(null);

    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        materialId,
        discipline: 'general',
        examMode,
        difficulty,
        questionCount: parseInt(questionCount, 10) || 10,
        timeLimitMinutes: parseInt(timeLimitMinutes, 10) || 30,
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
      setError(data.error || 'Something went wrong generating your questions.');
      return;
    }

    router.push({
      pathname: examMode === 'cbt' ? '/practice/cbt/[setId]' : '/practice/written/[setId]' as any,
      params: { setId: data.questionSetId },
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={styles.title}>Set up your practice</Text>
      <Text style={styles.subtitle}>Choose the format that matches how your course examines you.</Text>

      {isPremium === false && (
        <View style={styles.freeNotice}>
          <Text style={styles.freeNoticeText}>Free plan — CBT mode, up to {FREE_MAX_QUESTIONS} questions.</Text>
        </View>
      )}

      <Text style={styles.label}>Exam mode</Text>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeCard, examMode === 'cbt' && styles.modeCardActive]}
          onPress={() => setExamMode('cbt')}
        >
          <Text style={styles.modeCardTitle}>CBT</Text>
          <Text style={styles.modeCardSub}>Timed multiple choice</Text>
        </Pressable>
        <Pressable
          style={[styles.modeCard, examMode === 'written' && styles.modeCardActive, isPremium === false && { opacity: 0.5 }]}
          onPress={() => {
            if (isPremium === false) {
              router.push('/pricing');
              return;
            }
            setExamMode('written');
          }}
        >
          <Text style={styles.modeCardTitle}>Written</Text>
          <Text style={styles.modeCardSub}>Theory with model answers</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Set title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. CYB 201 Midterm Prep"
        placeholderTextColor={colors.slate}
      />

      <Text style={styles.label}>Number of questions</Text>
      <TextInput
        style={styles.input}
        value={questionCount}
        onChangeText={setQuestionCount}
        keyboardType="number-pad"
        placeholderTextColor={colors.slate}
      />

     {examMode === 'cbt' && (
  <>
    <Text style={styles.label}>Time limit (minutes)</Text>
    <TextInput
      style={styles.input}
      value={timeLimitMinutes}
      onChangeText={setTimeLimitMinutes}
      keyboardType="number-pad"
      placeholderTextColor={colors.slate}
    />
  </>
)}


    {examMode === 'written' && (
  <>
    <Text style={styles.label}>Time limit (minutes)</Text>
    <TextInput
      style={styles.input}
      value={timeLimitMinutes}
      onChangeText={setTimeLimitMinutes}
      keyboardType="number-pad"
      placeholderTextColor={colors.slate}
    />
  </>
)}

      <Text style={styles.label}>Difficulty</Text>
      <View style={styles.disciplineRow}>
        {['mixed', 'easy', 'medium', 'hard'].map((d) => (
          <Pressable key={d} style={[styles.chip, difficulty === d && styles.chipActive]} onPress={() => setDifficulty(d)}>
            <Text style={[styles.chipText, difficulty === d && styles.chipTextActive]}>{d}</Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleGenerate} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.buttonText}>Generate practice set</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  title: { color: colors.paper, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: colors.slate, fontSize: 13, marginBottom: 20 },
  freeNotice: { backgroundColor: 'rgba(232,184,74,0.08)', borderWidth: 1, borderColor: 'rgba(232,184,74,0.25)', borderRadius: 12, padding: 12, marginBottom: 18 },
  freeNoticeText: { color: colors.gold, fontSize: 12.5 },
  label: { color: colors.slate, fontSize: 13, marginBottom: 8, marginTop: 4 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  modeCard: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14 },
  modeCardActive: { borderColor: colors.gold, backgroundColor: 'rgba(232,184,74,0.08)' },
  modeCardTitle: { color: colors.paper, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  modeCardSub: { color: colors.slate, fontSize: 11.5 },
  input: { backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.paper, marginBottom: 6, fontSize: 15 },
  disciplineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, marginBottom: 22 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  chipActive: { backgroundColor: 'rgba(232,184,74,0.15)', borderColor: colors.gold },
  chipText: { color: colors.slate, fontSize: 12.5, textTransform: 'capitalize' },
  chipTextActive: { color: colors.gold },
  error: { color: colors.stamp, fontSize: 13, marginBottom: 14 },
  button: { backgroundColor: colors.gold, paddingVertical: 15, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
});