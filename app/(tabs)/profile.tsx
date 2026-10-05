import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface Profile {
  full_name: string | null;
  is_premium: boolean;
  premium_expires_at: string | null;
  current_streak: number;
  longest_streak: number;
}

export default function ProfileScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;
      (async () => {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, is_premium, premium_expires_at, current_streak, longest_streak')
          .eq('id', user.id)
          .single();
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [user])
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (loading || !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const daysLeft = profile.premium_expires_at
    ? Math.max(0, Math.ceil((new Date(profile.premium_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitial}>{(profile.full_name || user?.email || '?')[0]?.toUpperCase()}</Text>
      </View>
      <Text style={styles.name}>{profile.full_name || 'CampusCrack Student'}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>🔥 {profile.current_streak}</Text>
          <Text style={styles.statLabel}>Current streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.longest_streak}</Text>
          <Text style={styles.statLabel}>Longest streak</Text>
        </View>
      </View>

      <View style={[styles.planCard, profile.is_premium && styles.planCardActive]}>
        {profile.is_premium ? (
          <>
            <Text style={styles.planTitle}>✓ Full access active</Text>
            {profile.premium_expires_at && (
              <Text style={styles.planSub}>
                {daysLeft !== null && daysLeft <= 14
                  ? `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — renew soon`
                  : `Active until ${new Date(profile.premium_expires_at).toLocaleDateString()}`}
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.planTitle}>Free plan</Text>
            <Text style={styles.planSub}>Unlock unlimited generations, written mode, and more.</Text>
            <Pressable style={styles.upgradeButton} onPress={() => router.push('/pricing')}>
              <Text style={styles.upgradeButtonText}>Unlock full access — ₦3,500</Text>
            </Pressable>
          </>
        )}
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 999, backgroundColor: colors.inkLight,
    borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 14,
  },
  avatarInitial: { color: colors.gold, fontSize: 26, fontWeight: '800' },
  name: { color: colors.paper, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  email: { color: colors.slate, fontSize: 13, textAlign: 'center', marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, alignItems: 'center' },
  statValue: { color: colors.paper, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: colors.slate, fontSize: 11.5 },
  planCard: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 18, marginBottom: 24 },
  planCardActive: { borderColor: colors.gold, backgroundColor: 'rgba(232,184,74,0.06)' },
  planTitle: { color: colors.paper, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  planSub: { color: colors.slate, fontSize: 12.5, marginBottom: 4 },
  upgradeButton: { backgroundColor: colors.gold, paddingVertical: 13, borderRadius: 999, alignItems: 'center', marginTop: 12 },
  upgradeButtonText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  logoutButton: { borderWidth: 1, borderColor: 'rgba(194,59,34,0.4)', paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginBottom: 30 },
  logoutButtonText: { color: colors.stamp, fontWeight: '600', fontSize: 14 },
});