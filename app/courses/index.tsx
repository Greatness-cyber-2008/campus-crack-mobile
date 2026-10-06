import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

interface Course {
  id: string;
  title: string;
  course_code: string | null;
  discipline: string | null;
}

export default function CoursesListScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [materialCounts, setMaterialCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, title, course_code, discipline')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const rows = coursesData || [];
        const counts: Record<string, number> = {};
        await Promise.all(
          rows.map(async (c) => {
            const { count } = await supabase
              .from('materials')
              .select('id', { count: 'exact', head: true })
              .eq('course_id', c.id);
            counts[c.id] = count || 0;
          })
        );

        if (!cancelled) {
          setCourses(rows);
          setMaterialCounts(counts);
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>My courses</Text>
        <Pressable style={styles.newButton} onPress={() => router.push('/courses/create')}>
          <Text style={styles.newButtonText}>+ New</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Group files together and build one study plan from all of them.</Text>

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You haven't created a course yet.</Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push('/courses/create')}>
              <Text style={styles.emptyButtonText}>Create your first course</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push({ pathname: '/courses/[courseId]' as any, params: { courseId: item.id } })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowSub}>
                {item.course_code ? `${item.course_code} · ` : ''}{item.discipline}
              </Text>
            </View>
            <Text style={styles.rowBadge}>
              {materialCounts[item.id] || 0} file{materialCounts[item.id] === 1 ? '' : 's'}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  title: { color: colors.paper, fontSize: 22, fontWeight: '800' },
  newButton: { backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  newButtonText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  subtitle: { color: colors.slate, fontSize: 12.5, paddingHorizontal: 20, marginTop: 4, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, marginBottom: 10 },
  rowTitle: { color: colors.paper, fontSize: 14.5, fontWeight: '600', marginBottom: 4 },
  rowSub: { color: colors.slate, fontSize: 12, textTransform: 'capitalize' },
  rowBadge: { color: colors.slate, fontSize: 11.5, marginLeft: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.slate, fontSize: 13, marginBottom: 20, textAlign: 'center' },
  emptyButton: { backgroundColor: colors.gold, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999 },
  emptyButtonText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
});
