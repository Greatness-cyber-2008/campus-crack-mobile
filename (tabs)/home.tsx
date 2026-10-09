import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';

interface WeekInfo {
  planTitle: string;
  weekNumber: number;
  topic: string;
}

function getCurrentWeekNumber(startDate: string): number {
  const diffMs = Date.now() - new Date(startDate).getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export default function HomeScreen() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [streak, setStreak] = useState(0);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [question, setQuestion] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, current_streak')
        .eq('id', user.id)
        .single();
      setFullName(profile?.full_name?.split(' ')[0] || 'there');
      setStreak(profile?.current_streak || 0);

      const { data: plans } = await supabase
        .from('study_plans')
        .select('id, title, start_date, total_weeks')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      for (const plan of plans || []) {
        const weekNum = getCurrentWeekNumber(plan.start_date);
        if (weekNum >= 1 && weekNum <= plan.total_weeks) {
          const { data: week } = await supabase
            .from('study_plan_weeks')
            .select('topic')
            .eq('study_plan_id', plan.id)
            .eq('week_number', weekNum)
            .single();
          if (week) setWeekInfo({ planTitle: plan.title, weekNumber: weekNum, topic: week.topic });
          break;
        }
      }
    })();
  }, [user]);

  function askTutor() {
    if (!question.trim()) return;
    router.push({ pathname: '/aiTutor', params: { autoAsk: question.trim() } });
    setQuestion('');
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      {/* Greeting */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Hey, {fullName} 👋</Text>
          <Text style={styles.subGreeting}>Ready to crack today?</Text>
        </View>
      </View>

      {/* Streak card */}
      {streak > 0 && (
        <View style={styles.streakCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>🔥 {streak} Day Streak</Text>
            <Text style={styles.streakSub}>Keep it up! Consistency is your superpower.</Text>
          </View>
        </View>
      )}

      {/* AI Tutor quick-ask */}
      <Text style={styles.sectionTitle}>AI Study Tutor</Text>
      <Text style={styles.sectionSub}>Ask anything. Get clarity instantly.</Text>
      <View style={styles.askRow}>
        <TextInput
          style={styles.askInput}
          placeholder="Ask a question…"
          placeholderTextColor={colors.slate}
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={askTutor}
        />
        <Pressable style={styles.askButton} onPress={askTutor}>
          <Ionicons name="arrow-forward" size={20} color={colors.ink} />
        </Pressable>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <QuickAction icon="cloud-upload" label="Upload Notes" onPress={() => router.push('/upload')} />
        <QuickAction icon="document-text" label="Practice" onPress={() => router.push('/library')} />
        <QuickAction icon="albums" label="Flashcards" onPress={() => router.push('/flashcards')} />
        <QuickAction icon="school" label="My Courses" onPress={() => router.push('/courses')} />
        <QuickAction icon="calendar" label="Planner" onPress={() => router.push('/planner')} />
      </View>

      {/* This week's focus */}
      <View style={styles.weekHeaderRow}>
        <Text style={styles.sectionTitle}>Your Study Plan</Text>
        <Pressable onPress={() => router.push('/planner')}>
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      {weekInfo ? (
        <View style={styles.weekCard}>
          <Text style={styles.weekLabel}>WEEK {weekInfo.weekNumber} · {weekInfo.planTitle}</Text>
          <Text style={styles.weekTopic}>{weekInfo.topic}</Text>
        </View>
      ) : (
        <Pressable style={styles.weekCardEmpty} onPress={() => router.push('/planner')}>
          <Text style={styles.weekEmptyText}>No active study plan yet — build one from your course notes.</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function QuickAction({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={20} color={colors.gold} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  headerRow: { marginBottom: 20 },
  greeting: { color: colors.paper, fontSize: 24, fontWeight: '800' },
  subGreeting: { color: colors.slate, fontSize: 14, marginTop: 2 },
  streakCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(232,184,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232,184,74,0.25)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  streakTitle: { color: colors.gold, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  streakSub: { color: colors.slate, fontSize: 12.5 },
  sectionTitle: { color: colors.paper, fontSize: 17, fontWeight: '700' },
  sectionSub: { color: colors.slate, fontSize: 12.5, marginTop: 2, marginBottom: 12 },
  askRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  askInput: {
    flex: 1,
    backgroundColor: colors.inkLight,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.paper,
    marginRight: 10,
  },
  askButton: {
    width: 44, height: 44, borderRadius: 999,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
  },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 28 },
  quickAction: { alignItems: 'center', width: '21%' },
  quickActionIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  quickActionLabel: { color: colors.slate, fontSize: 11, textAlign: 'center' },
  weekHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { color: colors.gold, fontSize: 13 },
  weekCard: {
    backgroundColor: 'rgba(232,184,74,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(232,184,74,0.2)',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  weekLabel: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  weekTopic: { color: colors.paper, fontSize: 15 },
  weekCardEmpty: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed',
    borderRadius: 16, padding: 20, marginTop: 12, alignItems: 'center',
  },
  weekEmptyText: { color: colors.slate, fontSize: 13, textAlign: 'center' },
});