import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const stampAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(stampAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 40 }),
      Animated.timing(contentAnim, { toValue: 1, duration: 500, useNativeDriver: true, delay: 150 }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
     <Animated.Image
  source={require('../assets/logo.png')}
  style={[
    styles.logoMark,
    {
      opacity: stampAnim,
      transform: [{ scale: stampAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
    },
  ]}
  resizeMode="contain"
/>
  <Text style={styles.tagline}> ASK. Learn. Crack It.</Text>

      <Animated.View
        style={{
          opacity: contentAnim,
          transform: [
            { translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          ],
        }}
      >
        <Text style={styles.title}>CAMPUSCRACK</Text>
        <Text style={styles.tagline}>Upload your notes. Walk in knowing you'll crack it.</Text>

        <Pressable style={styles.primaryButton} onPress={() => router.push('/signup')}>
          <Text style={styles.primaryButtonText}>Get Started — It's Free</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/login')}>
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stamp: {
    width: 160,
    height: 160,
    borderRadius: 999,
    borderWidth: 5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoMark: {
    width: 160, 
    height: 100, 
    marginBottom: 8,
},
brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8A2BE2',
    letterSpacing: -0.5,
},
  title: {
    color: '#8A2BE2',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  tagline: {
    fontWeight: '500',
    color: '#D1D5DB',
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonText: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  secondaryButton: { paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { color: colors.slate, fontSize: 14 },
});