import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface PlanWeek { id: string; week_number: number; topic: string; description: string | null; study_tip: string | null; }
interface PlanInfo { id: string; title: string; start_date: string; total_weeks: number; material_id: string | null; }

function getCurrentWeekNumber(startDate: string): number {
  const diffMs = Date.now() - new Date(startDate).getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export default function PlanDetailScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [weeks, setWeeks] = useState<PlanWeek[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !planId) return;
    (async () => {
      const { data: planData } = await supabase
        .from('study_plans')
        .select('id, title, start_date, total_weeks, material_id')
        .eq('id', planId)
        .single();
      const { data: weeksData } = await supabase
        .from('study_plan_weeks')
        .select('id, week_number, topic, description, study_tip')
        .eq('study_plan_id', planId)
        .order('week_number');
      setPlan(planData);
      setWeeks(weeksData || []);
      setLoading(false);
    })();
  }, [user, planId]);

  if (loading || !plan) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const currentWeek = getCurrentWeekNumber(plan.start_date);

  function askAboutWeek(week: PlanWeek) {
    const parts = [`Explain this week's topic in more depth: ${week.topic}.`];
    if (week.description) parts.push(week.description);
    if (week.study_tip) parts.push(`Study tip to build on: ${week.study_tip}`);
    router.push({ pathname: '/(tabs)/aiTutor' as any, params: { autoAsk: parts.join(' ') } });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <Text style={styles.title}>{plan.title}</Text>
      <Text style={styles.subtitle}>{plan.total_weeks} weeks · started {new Date(plan.start_date).toLocaleDateString()}</Text>

      {weeks.map((w) => {
        const isCurrent = w.week_number === currentWeek;
        const isPast = w.week_number < currentWeek;
        return (
          <View key={w.id} style={[styles.weekCard, isCurrent && styles.weekCardCurrent, isPast && { opacity: 0.6 }]}>
            <Text style={[styles.weekLabel, isCurrent && { color: colors.gold }]}>
              WEEK {w.week_number}{isCurrent ? ' · NOW' : ''}
            </Text>
            <Text style={styles.weekTopic}>{w.topic}</Text>
            {w.description && <Text style={styles.weekDesc}>{w.description}</Text>}
            {w.study_tip && (
              <View style={styles.tipBox}>
                <Text style={styles.tipText}>💡 {w.study_tip}</Text>
              </View>
            )}
            <View style={styles.actionsRow}>
              <Pressable style={styles.actionChip} onPress={() => askAboutWeek(w)}>
                <Text style={styles.actionChipText}>💬 Ask the tutor</Text>
              </Pressable>
              {plan.material_id && (
                <Pressable
                  style={styles.actionChip}
                  onPress={() => router.push({ pathname: '/generate', params: { materialId: plan.material_id } })}
                >
                  <Text style={styles.actionChipText}>📝 Practice this week</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.paper, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: colors.slate, fontSize: 12.5, marginBottom: 20 },
  weekCard: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 },
  weekCardCurrent: { borderColor: colors.gold, backgroundColor: 'rgba(232,184,74,0.06)' },
  weekLabel: { color: colors.slate, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  weekTopic: { color: colors.paper, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  weekDesc: { color: colors.slate, fontSize: 12.5, lineHeight: 18, marginBottom: 8 },
  tipBox: { backgroundColor: 'rgba(232,184,74,0.06)', borderWidth: 1, borderColor: 'rgba(232,184,74,0.2)', borderRadius: 10, padding: 10, marginBottom: 10 },
  tipText: { color: colors.gold, fontSize: 12.5, lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionChip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  actionChipText: { color: colors.paper, fontSize: 11.5 },
});