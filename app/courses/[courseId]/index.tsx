import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

interface CourseInfo {
  id: string;
  title: string;
  course_code: string | null;
  discipline: string | null;
}
interface MaterialRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user || !courseId) return;
      let cancelled = false;
      (async () => {
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, title, course_code, discipline')
          .eq('id', courseId)
          .single();

        const { data: materialsData } = await supabase
          .from('materials')
          .select('id, title, status, created_at')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false });

        if (!cancelled) {
          setCourse(courseData);
          setMaterials(materialsData || []);
          setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [user, courseId])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Course not found.</Text>
      </View>
    );
  }

  const readyCount = materials.filter((m) => m.status === 'ready').length;

  return (
    <View style={styles.container}>
      <FlatList
        data={materials}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.title}>{course.title}</Text>
            <Text style={styles.subtitle}>
              {course.course_code ? `${course.course_code} · ` : ''}{course.discipline}
            </Text>

            <View style={styles.actionsRow}>
              <Pressable
                style={styles.secondaryAction}
                onPress={() => router.push({ pathname: '/upload', params: { courseId: course.id } })}
              >
                <Text style={styles.secondaryActionText}>+ Add a file</Text>
              </Pressable>
              {readyCount > 0 && (
                <Pressable
                  style={styles.primaryAction}
                  onPress={() => router.push({ pathname: '/planner/generate', params: { courseId: course.id } })}
                >
                  <Text style={styles.primaryActionText}>
                    📅 Build plan from {readyCount} file{readyCount === 1 ? '' : 's'}
                  </Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.sectionTitle}>Files in this course</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No files uploaded to this course yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
            <Text
              style={[
                styles.rowBadge,
                item.status === 'ready' ? { color: colors.gold } : item.status === 'failed' ? { color: colors.stamp } : { color: colors.slate },
              ]}
            >
              {item.status === 'ready' ? 'Ready ✓' : item.status === 'failed' ? 'Failed' : 'Processing…'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.paper, fontSize: 22, fontWeight: '800', marginBottom: 2 },
  subtitle: { color: colors.slate, fontSize: 12.5, marginBottom: 16, textTransform: 'capitalize' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  secondaryAction: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999 },
  secondaryActionText: { color: colors.paper, fontSize: 13 },
  primaryAction: { backgroundColor: colors.gold, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999 },
  primaryActionText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  sectionTitle: { color: colors.paper, fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, marginBottom: 8 },
  rowTitle: { color: colors.paper, fontSize: 13.5, flex: 1, marginRight: 10 },
  rowBadge: { fontSize: 11.5, fontWeight: '600' },
  emptyText: { color: colors.slate, fontSize: 13 },
});
