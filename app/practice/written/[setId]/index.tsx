import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

interface Question { id: string; order_index: number; prompt: string; model_answer: string; marking_points: string[]; }
interface QSet { id: string; title: string; }

const RATING_MARKS: Record<string, number> = { nailed_it: 1, close: 0.5, missed: 0 };

export default function WrittenPracticeScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const { user } = useUser();
  const router = useRouter();

  const [qset, setQset] = useState<QSet | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !setId) return;
    (async () => {
      const { data: qsetData } = await supabase.from('question_sets').select('id, title').eq('id', setId).single();
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, order_index, prompt, model_answer, marking_points')
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
  }, [user, setId]);

  async function handleSubmit() {
    if (!attemptId) return;
    setSubmitting(true);

    let marksScored = 0;
    const totalMarks = questions.length;
    const answerRows = questions.map((q) => {
      const rating = ratings[q.id] || 'missed';
      const marks = RATING_MARKS[rating] ?? 0;
      marksScored += marks;
      return { attempt_id: attemptId, question_id: q.id, written_response: responses[q.id] || '', self_rating: rating, marks_awarded: marks };
    });

    await supabase.from('answers').insert(answerRows);
    const score = totalMarks > 0 ? Math.round((marksScored / totalMarks) * 100) : 0;

    await supabase.from('attempts').update({
      submitted_at: new Date().toISOString(), status: 'submitted', score, total_marks: totalMarks, marks_scored: marksScored,
    }).eq('id', attemptId);

    router.replace({ pathname: '/results/[attemptId]' as any, params: { attemptId } });
  }

  if (!qset || questions.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const q = questions[current];
  const isRevealed = revealed[q.id];
  const allRated = questions.every((qq) => ratings[qq.id]);

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
          editable={!isRevealed}
          multiline
          numberOfLines={7}
          placeholder="Write your answer as you would in the exam…"
          placeholderTextColor={colors.slate}
        />

        {!isRevealed ? (
          <Pressable style={styles.revealButton} onPress={() => setRevealed((prev) => ({ ...prev, [q.id]: true }))}>
            <Text style={styles.revealButtonText}>Reveal model answer & marking points</Text>
          </Pressable>
        ) : (
          <View style={styles.revealCard}>
            <Text style={styles.revealLabel}>MODEL ANSWER</Text>
            <Text style={styles.revealText}>{q.model_answer}</Text>
            <Text style={[styles.revealLabel, { marginTop: 14 }]}>MARKING POINTS</Text>
            {(q.marking_points || []).map((point, i) => (
              <Text key={i} style={styles.markingPoint}>• {point}</Text>
            ))}
            <Text style={styles.rateLabel}>Be honest — how did you do?</Text>
            <View style={styles.rateRow}>
              {[{ key: 'nailed_it', label: 'Nailed it' }, { key: 'close', label: 'Close' }, { key: 'missed', label: 'Missed it' }].map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[styles.rateChip, ratings[q.id] === opt.key && styles.rateChipActive]}
                  onPress={() => setRatings((prev) => ({ ...prev, [q.id]: opt.key }))}
                >
                  <Text style={[styles.rateChipText, ratings[q.id] === opt.key && styles.rateChipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
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
          <Pressable style={[styles.submitButton, !allRated && { opacity: 0.5 }]} onPress={handleSubmit} disabled={submitting || !allRated}>
            <Text style={styles.submitButtonText}>{submitting ? 'Submitting…' : 'Finish & see results'}</Text>
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
  revealButton: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: colors.inkLight, paddingVertical: 13, borderRadius: 999, alignItems: 'center' },
  revealButtonText: { color: colors.paper, fontSize: 13 },
  revealCard: { borderWidth: 1, borderColor: 'rgba(232,184,74,0.25)', backgroundColor: 'rgba(232,184,74,0.05)', borderRadius: 14, padding: 16 },
  revealLabel: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  revealText: { color: colors.paper, fontSize: 13.5, lineHeight: 20 },
  markingPoint: { color: colors.slate, fontSize: 13, lineHeight: 20 },
  rateLabel: { color: colors.slate, fontSize: 12, marginTop: 16, marginBottom: 8 },
  rateRow: { flexDirection: 'row', gap: 8 },
  rateChip: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingVertical: 10, alignItems: 'center' },
  rateChipActive: { borderColor: colors.gold, backgroundColor: 'rgba(232,184,74,0.15)' },
  rateChipText: { color: colors.slate, fontSize: 12 },
  rateChipTextActive: { color: colors.gold },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  navText: { color: colors.slate, fontSize: 14 },
  nextButton: { backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  nextButtonText: { color: colors.paper, fontSize: 14 },
  submitButton: { backgroundColor: colors.stamp, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999 },
  submitButtonText: { color: colors.paper, fontWeight: '700', fontSize: 13 },
});