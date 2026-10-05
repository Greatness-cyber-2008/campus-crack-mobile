import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

interface QuestionSet {
  id: string;
  title: string;
  exam_mode: 'cbt' | 'written';
  discipline: string;
  question_count: number;
  created_at: string;
}

export default function LibraryScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);

  // Refetch every time this tab comes into focus, so a set you just generated
  // shows up immediately when you navigate back here — not just on cold load.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        const { data } = await supabase
          .from('question_sets')
          .select('id, title, exam_mode, discipline, question_count, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (!cancelled) {
          setSets(data || []);
          setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [user])
  );

  function openSet(item: QuestionSet) {
    router.push({
      pathname: item.exam_mode === 'cbt' ? '/practice/cbt/[setId]' : '/practice/written/[setId]',
      params: { setId: item.id },
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My question sets</Text>

      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You haven't generated any question sets yet.</Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push('/upload')}>
              <Text style={styles.emptyButtonText}>Upload your first material</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openSet(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowSub}>
                {item.discipline} · {item.exam_mode.toUpperCase()} · {item.question_count} questions
              </Text>
            </View>
            <Text style={styles.rowArrow}>→</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.paper, fontSize: 22, fontWeight: '800', paddingHorizontal: 20, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  rowTitle: { color: colors.paper, fontSize: 14.5, fontWeight: '600', marginBottom: 4 },
  rowSub: { color: colors.slate, fontSize: 12, textTransform: 'capitalize' },
  rowArrow: { color: colors.gold, fontSize: 16, marginLeft: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.slate, fontSize: 13, marginBottom: 20, textAlign: 'center' },
  emptyButton: { backgroundColor: colors.gold, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999 },
  emptyButtonText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
});