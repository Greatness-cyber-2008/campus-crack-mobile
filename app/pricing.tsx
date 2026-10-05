import { API_BASE_URL } from '@/constants/api';
import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PricingScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
      setIsPremium(!!data?.is_premium);
    })();
  }, [user]);

  function handleUpgrade() {
    // Opens your website's pricing page in the device browser — same Paystack
    // checkout that already works there. A native in-app checkout is a separate,
    // bigger task for later.
    Linking.openURL(`${API_BASE_URL}/pricing`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={styles.title}>Simple, honest pricing</Text>
      <Text style={styles.subtitle}>One clean payment per semester. Never auto-charged.</Text>

      {isPremium && (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>✓ You already have full access unlocked</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Free</Text>
        <Text style={styles.cardPrice}>₦0</Text>
        {[
          '3 free question set generations',
          'CBT mode only, up to 10 questions',
          '15 chat messages a day',
          '1 study plan',
          'Free access to community-shared sets',
        ].map((f) => (
          <Text key={f} style={styles.feature}>• {f}</Text>
        ))}
      </View>

      <View style={[styles.card, styles.cardGold]}>
        <Text style={styles.cardTitle}>Full access</Text>
        <Text style={styles.cardPrice}>₦3,500<Text style={styles.cardPriceSub}> / semester</Text></Text>
        {[
          'Unlimited question set generations',
          'Written/theory mode with model answers',
          'Up to 50 questions per set',
          'Unlimited chat with your materials',
          'Unlimited study plans',
          'Never auto-charged',
        ].map((f) => (
          <Text key={f} style={styles.feature}>• {f}</Text>
        ))}

        {!isPremium && (
          <Pressable style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>Unlock full access — ₦3,500</Text>
          </Pressable>
        )}
      </View>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.backLink}>← Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  title: { color: colors.paper, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: colors.slate, fontSize: 13, marginBottom: 20 },
  activeBadge: { backgroundColor: 'rgba(232,184,74,0.1)', borderWidth: 1, borderColor: 'rgba(232,184,74,0.3)', borderRadius: 12, padding: 12, marginBottom: 18 },
  activeBadgeText: { color: colors.gold, fontSize: 13, textAlign: 'center' },
  card: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 18, marginBottom: 16 },
  cardGold: { borderColor: colors.gold, backgroundColor: 'rgba(232,184,74,0.05)' },
  cardTitle: { color: colors.paper, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardPrice: { color: colors.paper, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  cardPriceSub: { fontSize: 13, color: colors.slate, fontWeight: '400' },
  feature: { color: colors.slate, fontSize: 13, marginBottom: 6 },
  upgradeButton: { backgroundColor: colors.gold, paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginTop: 14 },
  upgradeButtonText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  backLink: { color: colors.slate, textAlign: 'center', marginTop: 8, marginBottom: 24 },
});