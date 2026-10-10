import { API_BASE_URL } from '@/constants/api';
import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { getAuthHeader } from '@/lib/getAuthHeader';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

interface Question { id: string; order_index: number; prompt: string; }
interface QSet { id: string; title: string; }

export default function WrittenPracticeScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const { user } = useUser();
  const router = useRouter();

  const [qset, setQset] = useState<QSet | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user || !setId || initializedRef.current) return;
    initializedRef.current = true;
    (async () => {
      const { data: qsetData } = await supabase.from('question_sets').select('id, title').eq('id', setId).single();
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, order_index, prompt')
        .eq('question_set_id', setId)
        .order('order_index');
      const { data: attempt } = await supabase
        .from('attempts')
        .insert({ user_id: user.id, question_set_id: setId })
        .select()
        .single();

      setQset(qsetData);
      setQuestions(questionsData || []);
      setAttemptId(attempt?.id || null);
    })();
  }, [user?.id, setId]);

  async function handleSubmit() {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/grade-written`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          attemptId,
          answers: questions.map((q) => ({ questionId: q.id, response: responses[q.id] || '' })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not grade this attempt, please try again');
        setSubmitting(false);
        return;
      }

      router.replace({ pathname: '/results/[attemptId]' as any, params: { attemptId } });
    } catch {
      setError('Network error — please try again');
      setSubmitting(false);
    }
  }

  if (!qset || questions.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const q = questions[current];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{qset.title}</Text>
        <Text style={styles.headerSub}>Question {current + 1} of {questions.length}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.prompt}>{q.prompt}</Text>

        <TextInput
          style={styles.answerInput}
          value={responses[q.id] || ''}
          onChangeText={(t) => setResponses((prev) => ({ ...prev, [q.id]: t }))}
          multiline
          numberOfLines={7}
          placeholder="Write your answer as you would in the exam…"
          placeholderTextColor={colors.slate}
        />

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable disabled={current === 0} onPress={() => setCurrent((c) => c - 1)}>
          <Text style={[styles.navText, current === 0 && { opacity: 0.3 }]}>← Previous</Text>
        </Pressable>
        {current < questions.length - 1 ? (
          <Pressable style={styles.nextButton} onPress={() => setCurrent((c) => c + 1)}>
            <Text style={styles.nextButtonText}>Next →</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.submitButton, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.submitButtonText}>{submitting ? 'Grading your answers…' : 'Finish & see results'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  headerTitle: { color: colors.paper, fontWeight: '700', fontSize: 15 },
  headerSub: { color: colors.slate, fontSize: 12, marginTop: 2 },
  body: { flex: 1 },
  prompt: { color: colors.paper, fontSize: 16, lineHeight: 23, marginBottom: 16 },
  answerInput: { backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: colors.paper, minHeight: 140, textAlignVertical: 'top', marginBottom: 14, fontSize: 14 },
  error: { color: colors.stamp, fontSize: 13, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  navText: { color: colors.slate, fontSize: 14 },
  nextButton: { backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  nextButtonText: { color: colors.paper, fontSize: 14 },
  submitButton: { backgroundColor: colors.stamp, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999 },
  submitButtonText: { color: colors.paper, fontWeight: '700', fontSize: 13 },
});
