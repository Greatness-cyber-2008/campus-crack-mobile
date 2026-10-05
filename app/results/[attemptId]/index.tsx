import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface AttemptDetail { id: string; score: number; marks_scored: number; total_marks: number; question_set_id: string; }
interface AnswerRow { id: string; question_id: string; selected_option: string | null; is_correct: boolean | null; self_rating: string | null; written_response: string | null; }
interface QuestionRow { id: string; prompt: string; options: { key: string; text: string }[] | null; correct_option: string | null; explanation: string | null; }

function verdict(score: number) {
  if (score >= 80) return { label: 'CRACKED', color: colors.gold };
  if (score >= 50) return { label: 'GETTING THERE', color: colors.gold };
  return { label: 'KEEP GRINDING', color: colors.slate };
}

export default function ResultsScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const { user } = useUser();
  const router = useRouter();

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [questions, setQuestions] = useState<Record<string, QuestionRow>>({});
  const [examMode, setExamMode] = useState<'cbt' | 'written'>('cbt');
  const [materialId, setMaterialId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !attemptId) return;
    (async () => {
      const { data: attemptData } = await supabase
        .from('attempts')
        .select('id, score, marks_scored, total_marks, question_set_id')
        .eq('id', attemptId)
        .single();
      if (!attemptData) return;

      const { data: setData } = await supabase
        .from('question_sets')
        .select('exam_mode, material_id')
        .eq('id', attemptData.question_set_id)
        .single();

      const { data: answerData } = await supabase
        .from('answers')
        .select('id, question_id, selected_option, is_correct, self_rating, written_response')
        .eq('attempt_id', attemptId);

      const { data: questionData } = await supabase
        .from('questions')
        .select('id, prompt, options, correct_option, explanation')
        .eq('question_set_id', attemptData.question_set_id);

      const qMap: Record<string, QuestionRow> = {};
      (questionData || []).forEach((q) => (qMap[q.id] = q));

      setAttempt(attemptData);
      setAnswers(answerData || []);
      setQuestions(qMap);
      setExamMode((setData?.exam_mode as any) || 'cbt');
      setMaterialId(setData?.material_id || null);
    })();
  }, [user, attemptId]);

  if (!attempt) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const v = verdict(attempt.score);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <View style={[styles.stamp, { borderColor: v.color }]}>
        <Text style={[styles.stampScore, { color: v.color }]}>{attempt.score}%</Text>
        <Text style={[styles.stampLabel, { color: v.color }]}>{v.label}</Text>
      </View>
      <Text style={styles.scoreSub}>You scored {attempt.marks_scored} / {attempt.total_marks} marks</Text>

      {answers.map((a, i) => {
        const q = questions[a.question_id];
        if (!q) return null;
        return (
          <View
            key={a.id}
            style={[
              styles.questionCard,
              examMode === 'cbt' && (a.is_correct ? styles.questionCardCorrect : styles.questionCardWrong),
            ]}
          >
            <Text style={styles.questionNum}>Question {i + 1}</Text>
            <Text style={styles.questionPrompt}>{q.prompt}</Text>

            {examMode === 'cbt' ? (
              <>
                <Text style={styles.answerLabel}>
                  Your answer:{' '}
                  <Text style={{ color: a.is_correct ? colors.gold : colors.stamp }}>
                    {a.selected_option ? q.options?.find((o) => o.key === a.selected_option)?.text : 'Not answered'}
                  </Text>
                </Text>
                {!a.is_correct && (
                  <Text style={styles.answerLabel}>
                    Correct answer: <Text style={{ color: colors.gold }}>{q.options?.find((o) => o.key === q.correct_option)?.text}</Text>
                  </Text>
                )}
                {q.explanation && <Text style={styles.explanation}>{q.explanation}</Text>}
              </>
            ) : (
              <>
                <Text style={styles.answerLabel}>Your response:</Text>
                <Text style={styles.explanation}>{a.written_response || '(no response)'}</Text>
                <Text style={styles.answerLabel}>
                  Self-rating: <Text style={{ color: colors.gold, textTransform: 'capitalize' }}>{a.self_rating?.replace('_', ' ')}</Text>
                </Text>
              </>
            )}
          </View>
        );
      })}

      <View style={styles.actionsRow}>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/home')}>
          <Text style={styles.secondaryButtonText}>Back to dashboard</Text>
        </Pressable>
        {materialId && (
          <Pressable style={styles.primaryButton} onPress={() => router.push({ pathname: '/generate', params: { materialId } })}>
            <Text style={styles.primaryButtonText}>Generate a fresh set</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  stamp: {
    width: 150, height: 150, borderRadius: 999, borderWidth: 5,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  stampScore: { fontSize: 30, fontWeight: '900' },
  stampLabel: { fontSize: 10, letterSpacing: 2, marginTop: 4 },
  scoreSub: { color: colors.slate, fontSize: 13, textAlign: 'center', marginBottom: 28 },
  questionCard: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, marginBottom: 12 },
  questionCardCorrect: { borderColor: 'rgba(232,184,74,0.3)', backgroundColor: 'rgba(232,184,74,0.04)' },
  questionCardWrong: { borderColor: 'rgba(194,59,34,0.35)', backgroundColor: 'rgba(194,59,34,0.05)' },
  questionNum: { color: colors.slate, fontSize: 12, marginBottom: 6 },
  questionPrompt: { color: colors.paper, fontSize: 14.5, lineHeight: 21, marginBottom: 10 },
  answerLabel: { color: colors.paper, fontSize: 13, marginBottom: 4 },
  explanation: { color: colors.slate, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 20 },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 13, borderRadius: 999, alignItems: 'center' },
  secondaryButtonText: { color: colors.paper, fontSize: 13 },
  primaryButton: { flex: 1, backgroundColor: colors.gold, paddingVertical: 13, borderRadius: 999, alignItems: 'center' },
  primaryButtonText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
});