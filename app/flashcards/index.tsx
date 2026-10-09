import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

interface FlashcardSet {
  id: string;
  title: string;
  discipline: string | null;
  card_count: number;
  created_at: string;
}

export default function FlashcardsListScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [dueCounts, setDueCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        const { data: setsData } = await supabase
          .from('flashcard_sets')
          .select('id, title, discipline, card_count, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const setRows = setsData || [];
        const today = new Date().toISOString().slice(0, 10);
        const counts: Record<string, number> = {};

        await Promise.all(
          setRows.map(async (s) => {
            const { data: cards } = await supabase.from('flashcards').select('id').eq('flashcard_set_id', s.id);
            const cardIds = (cards || []).map((c) => c.id);
            if (cardIds.length === 0) {
              counts[s.id] = 0;
              return;
            }
            const { data: progress } = await supabase
              .from('flashcard_progress')
              .select('flashcard_id, next_review_date')
              .eq('user_id', user.id)
              .in('flashcard_id', cardIds);

            const reviewedIds = new Set((progress || []).map((p) => p.flashcard_id));
            const dueFromProgress = (progress || []).filter((p) => p.next_review_date <= today).length;
            const neverReviewed = cardIds.filter((id) => !reviewedIds.has(id)).length;
            counts[s.id] = dueFromProgress + neverReviewed;
          })
        );

        if (!cancelled) {
          setSets(setRows);
          setDueCounts(counts);
          setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [user])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My flashcards</Text>
      <Text style={styles.subtitle}>A few minutes a day beats one big session before the exam.</Text>

      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You haven't generated any flashcard sets yet.</Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push('/upload')}>
              <Text style={styles.emptyButtonText}>Upload material to get started</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: '/flashcards/[setId]' as any, params: { setId: item.id } })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.discipline} · {item.card_count} cards</Text>
            </View>
            {(dueCounts[item.id] || 0) > 0 ? (
              <View style={styles.dueBadge}>
                <Text style={styles.dueBadgeText}>{dueCounts[item.id]} due</Text>
              </View>
            ) : (
              <Text style={styles.upToDate}>Up to date ✓</Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.paper, fontSize: 22, fontWeight: '800', paddingHorizontal: 20, marginBottom: 2 },
  subtitle: { color: colors.slate, fontSize: 12.5, paddingHorizontal: 20, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, marginBottom: 10 },
  rowTitle: { color: colors.paper, fontSize: 14.5, fontWeight: '600', marginBottom: 4 },
  rowSub: { color: colors.slate, fontSize: 12, textTransform: 'capitalize' },
  dueBadge: { backgroundColor: colors.gold, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginLeft: 10 },
  dueBadgeText: { color: colors.ink, fontWeight: '700', fontSize: 11.5 },
  upToDate: { color: colors.slate, fontSize: 11.5, marginLeft: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.slate, fontSize: 13, marginBottom: 20, textAlign: 'center' },
  emptyButton: { backgroundColor: colors.gold, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999 },
  emptyButtonText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
});
