import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

interface StudyPlan {
  id: string;
  title: string;
  course_code: string | null;
  start_date: string;
  total_weeks: number;
}

function getCurrentWeekNumber(startDate: string): number {
  const diffMs = Date.now() - new Date(startDate).getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export default function PlannerListScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        const { data } = await supabase
          .from('study_plans')
          .select('id, title, course_code, start_date, total_weeks')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (!cancelled) {
          setPlans(data || []);
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
      <Text style={styles.title}>My study plans</Text>
      <Text style={styles.subtitle}>A week-by-week breakdown so you're never behind.</Text>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You haven't built a study plan yet.</Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push('/upload')}>
              <Text style={styles.emptyButtonText}>Upload a course outline</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const currentWeek = getCurrentWeekNumber(item.start_date);
          const isOver = currentWeek > item.total_weeks;
          const isUpcoming = currentWeek < 1;
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: '/planner/[planId] ' as any, params: { planId: item.id } })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowSub}>{item.course_code ? `${item.course_code} · ` : ''}{item.total_weeks} weeks</Text>
              </View>
              <Text style={styles.rowBadge}>{isOver ? 'Completed' : isUpcoming ? 'Not started' : `Week ${currentWeek}`}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.paper, fontSize: 22, fontWeight: '800', paddingHorizontal: 20 },
  subtitle: { color: colors.slate, fontSize: 12.5, paddingHorizontal: 20, marginTop: 4, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, marginBottom: 10 },
  rowTitle: { color: colors.paper, fontSize: 14.5, fontWeight: '600', marginBottom: 4 },
  rowSub: { color: colors.slate, fontSize: 12 },
  rowBadge: { color: colors.gold, fontSize: 11.5, fontWeight: '600', marginLeft: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.slate, fontSize: 13, marginBottom: 20, textAlign: 'center' },
  emptyButton: { backgroundColor: colors.gold, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999 },
  emptyButtonText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
});