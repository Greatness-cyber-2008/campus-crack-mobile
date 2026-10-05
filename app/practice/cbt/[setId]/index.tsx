import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface Option { key: string; text: string; }
interface Question { id: string; order_index: number; prompt: string; options: Option[]; }
interface QSet { id: string; title: string; time_limit_minutes: number | null; }

export default function CbtPracticeScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const { user } = useUser();
  const router = useRouter();

  const [qset, setQset] = useState<QSet | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!user || !setId) return;
    (async () => {
      const { data: qsetData } = await supabase
        .from('question_sets')
        .select('id, title, time_limit_minutes')
        .eq('id', setId)
        .single();
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, order_index, prompt, options')
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
      if (qsetData?.time_limit_minutes) setSecondsLeft(qsetData.time_limit_minutes * 60);
    })();
  }, [user, setId]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function selectOption(questionId: string, key: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: key }));
  }

  async function handleSubmit() {
    if (submittedRef.current || !attemptId) return;
    submittedRef.current = true;
    setSubmitting(true);

    const { data: fullQuestions } = await supabase
      .from('questions')
      .select('id, correct_option, marks')
      .eq('question_set_id', setId);

    let marksScored = 0;
    let totalMarks = 0;
    const answerRows = (fullQuestions || []).map((q) => {
      const selected = answers[q.id];
      const isCorrect = selected === q.correct_option;
      totalMarks += q.marks;
      if (isCorrect) marksScored += q.marks;
      return { attempt_id: attemptId, question_id: q.id, selected_option: selected || null, is_correct: isCorrect, marks_awarded: isCorrect ? q.marks : 0 };
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
  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{qset.title}</Text>
          <Text style={styles.headerSub}>Q{current + 1}/{questions.length}</Text>
        </View>
        {secondsLeft !== null && (
          <Text style={[styles.timer, secondsLeft < 60 && { color: colors.stamp }]}>
            {minutes}:{String(seconds).padStart(2, '0')}
          </Text>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.prompt}>{q.prompt}</Text>
        {q.options?.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.option, answers[q.id] === opt.key && styles.optionActive]}
            onPress={() => selectOption(q.id, opt.key)}
          >
            <Text style={styles.optionKey}>{opt.key}</Text>
            <Text style={styles.optionText}>{opt.text}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable disabled={current === 0} onPress={() => setCurrent((c) => c - 1)}>
          <Text style={[styles.navText, current === 0 && { opacity: 0.3 }]}>← Previous</Text>
        </Pressable>
        {current < questions.length - 1 ? (
          <Pressable style={styles.nextButton} onPress={() => setCurrent((c) => c + 1)}>
            <Text style={styles.nextButtonText}>Next →</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.submitButtonText}>{submitting ? 'Submitting…' : 'Submit exam'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  headerTitle: { color: colors.paper, fontWeight: '700', fontSize: 15 },
  headerSub: { color: colors.slate, fontSize: 12, marginTop: 2 },
  timer: { color: colors.gold, fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'] },
  body: { flex: 1, padding: 20 },
  prompt: { color: colors.paper, fontSize: 17, lineHeight: 24, marginBottom: 20 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, marginBottom: 10 },
  optionActive: { borderColor: colors.gold, backgroundColor: 'rgba(232,184,74,0.08)' },
  optionKey: { color: colors.gold, fontWeight: '700', marginRight: 12 },
  optionText: { color: colors.paper, fontSize: 14, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  navText: { color: colors.slate, fontSize: 14 },
  nextButton: { backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  nextButtonText: { color: colors.paper, fontSize: 14 },
  submitButton: { backgroundColor: colors.stamp, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  submitButtonText: { color: colors.paper, fontWeight: '700', fontSize: 14 },
});