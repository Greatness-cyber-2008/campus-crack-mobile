import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface Flashcard { id: string; front: string; back: string; topic: string | null; }
interface ProgressRow { flashcard_id: string; next_review_date: string; interval_days: number; review_count?: number; }
interface FlashcardSetInfo { id: string; title: string; }

type Rating = 'again' | 'hard' | 'good' | 'easy';

function nextInterval(currentInterval: number, rating: Rating): number {
  switch (rating) {
    case 'again': return 1;
    case 'hard': return Math.max(1, Math.round(currentInterval * 1.2));
    case 'good': return Math.max(1, Math.round(currentInterval * 2));
    case 'easy': return Math.max(1, Math.round(currentInterval * 2.5));
  }
}

export default function FlashcardReviewScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const { user } = useUser();
  const router = useRouter();

  const [set, setSet] = useState<FlashcardSetInfo | null>(null);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressRow>>({});
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    if (!user || !setId) return;
    (async () => {
      const { data: setData } = await supabase.from('flashcard_sets').select('id, title').eq('id', setId).single();
      const { data: cardsData } = await supabase
        .from('flashcards')
        .select('id, front, back, topic')
        .eq('flashcard_set_id', setId)
        .order('order_index');

      const { data: progressData } = await supabase
        .from('flashcard_progress')
        .select('flashcard_id, next_review_date, interval_days, review_count')
        .eq('user_id', user.id)
        .in('flashcard_id', (cardsData || []).map((c) => c.id));

      const pMap: Record<string, ProgressRow> = {};
      (progressData || []).forEach((p) => (pMap[p.flashcard_id] = p as ProgressRow));

      const today = new Date().toISOString().slice(0, 10);
      const due = (cardsData || []).filter((c) => {
        const progress = pMap[c.id];
        return !progress || progress.next_review_date <= today;
      });

      setSet(setData);
      setDueCards(due);
      setProgressMap(pMap);
      setLoading(false);
    })();
  }, [user, setId]);

  async function handleRate(rating: Rating) {
    if (!user) return;
    const card = dueCards[current];
    const existingProgress = progressMap[card.id];
    const currentInterval = existingProgress?.interval_days || 1;
    const newInterval = nextInterval(currentInterval, rating);

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    await supabase.from('flashcard_progress').upsert(
      {
        user_id: user.id,
        flashcard_id: card.id,
        next_review_date: nextReviewDate.toISOString().slice(0, 10),
        interval_days: newInterval,
        last_rating: rating,
        last_reviewed_at: new Date().toISOString(),
        review_count: (existingProgress?.review_count || 0) + 1,
      },
      { onConflict: 'user_id,flashcard_id' }
    );

    setReviewedCount((c) => c + 1);
    setRevealed(false);
    setCurrent((c) => c + 1);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const isDone = current >= dueCards.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>🗂️ {set?.title}</Text>
        {!isDone && dueCards.length > 0 && (
          <Text style={styles.headerSub}>Card {current + 1} of {dueCards.length} due today</Text>
        )}
      </View>

      <View style={styles.body}>
        {dueCards.length === 0 ? (
          <View style={styles.centeredContent}>
            <Text style={styles.doneTitle}>🎉 Nothing due right now</Text>
            <Text style={styles.doneSub}>All caught up on this set — come back tomorrow.</Text>
            <Pressable onPress={() => router.push('/flashcards')}>
              <Text style={styles.backLink}>← Back to my flashcard sets</Text>
            </Pressable>
          </View>
        ) : isDone ? (
          <View style={styles.centeredContent}>
            <Text style={styles.doneTitle}>✅ Done for now</Text>
            <Text style={styles.doneSub}>
              Reviewed {reviewedCount} card{reviewedCount === 1 ? '' : 's'}. Come back tomorrow for more.
            </Text>
            <Pressable onPress={() => router.push('/flashcards')}>
              <Text style={styles.backLink}>← Back to my flashcard sets</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cardWrap}>
            <Pressable style={styles.card} onPress={() => setRevealed((v) => !v)}>
              <Text style={styles.cardText}>{revealed ? dueCards[current].back : dueCards[current].front}</Text>
            </Pressable>

            {!revealed ? (
              <Pressable style={styles.showButton} onPress={() => setRevealed(true)}>
                <Text style={styles.showButtonText}>Show answer</Text>
              </Pressable>
            ) : (
              <View style={styles.rateRow}>
                <Pressable style={[styles.rateButton, styles.rateAgain]} onPress={() => handleRate('again')}>
                  <Text style={styles.rateAgainText}>Again</Text>
                </Pressable>
                <Pressable style={styles.rateButton} onPress={() => handleRate('hard')}>
                  <Text style={styles.rateText}>Hard</Text>
                </Pressable>
                <Pressable style={styles.rateButton} onPress={() => handleRate('good')}>
                  <Text style={styles.rateText}>Good</Text>
                </Pressable>
                <Pressable style={[styles.rateButton, styles.rateEasy]} onPress={() => handleRate('easy')}>
                  <Text style={styles.rateEasyText}>Easy</Text>
                </Pressable>
              </View>
            )}
          </View>
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
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  centeredContent: { alignItems: 'center' },
  doneTitle: { color: colors.paper, fontSize: 17, marginBottom: 6 },
  doneSub: { color: colors.slate, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  backLink: { color: colors.gold, fontSize: 13 },
  cardWrap: { width: '100%' },
  card: {
    minHeight: 220, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    padding: 24, alignItems: 'center', justifyContent: 'center',
  },
  cardText: { color: colors.paper, fontSize: 17, lineHeight: 25, textAlign: 'center' },
  showButton: { backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginTop: 16 },
  showButtonText: { color: colors.paper, fontSize: 14 },
  rateRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  rateButton: { flex: 1, backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 13, borderRadius: 999, alignItems: 'center' },
  rateText: { color: colors.paper, fontSize: 13, fontWeight: '600' },
  rateAgain: { backgroundColor: 'rgba(194,59,34,0.15)', borderColor: 'rgba(194,59,34,0.4)' },
  rateAgainText: { color: colors.stamp, fontSize: 13, fontWeight: '600' },
  rateEasy: { backgroundColor: 'rgba(232,184,74,0.15)', borderColor: 'rgba(232,184,74,0.4)' },
  rateEasyText: { color: colors.gold, fontSize: 13, fontWeight: '600' },
});
