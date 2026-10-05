import { API_BASE_URL } from '@/constants/api';
import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { getAuthHeader } from '@/lib/getAuthHeader';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface Message { id: string; role: 'user' | 'assistant'; content: string; }

function cleanText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .trim();
}

export default function TutorScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { autoAsk } = useLocalSearchParams<{ autoAsk?: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoAskFired = useRef(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, role, content')
        .eq('user_id', user.id)
        .is('material_id', null)
        .order('created_at', { ascending: true });
      setMessages((data || []).map((m) => ({ ...m, content: cleanText(m.content) })));
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!loading && autoAsk && !autoAskFired.current) {
      autoAskFired.current = true;
      sendMessage(autoAsk);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, autoAsk]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: 'user', content: trimmed }]);

    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ materialId: 'general', message: trimmed }),
      });
      const data = await res.json();

      if (res.status === 402) {
        router.push('/pricing');
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Something went wrong, please try again');
        return;
      }

      setMessages((prev) => [...prev, { id: `local-reply-${Date.now()}`, role: 'assistant', content: cleanText(data.reply) }]);
    } catch {
      setError('Network error — please try again');
    } finally {
      setSending(false);
    }
  }

  function handleSend() {
    const text = input;
    setInput('');
    sendMessage(text);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Text style={styles.title}>🎓 Study Tutor</Text>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Ask me about any topic or course.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.role === 'user' ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
            <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
              <Text style={item.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>{item.content}</Text>
            </View>
          </View>
        )}
      />

      {sending && (
        <View style={styles.thinkingRow}>
          <ActivityIndicator size="small" color={colors.slate} />
          <Text style={styles.thinkingText}>Thinking…</Text>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask a question…"
          placeholderTextColor={colors.slate}
          onSubmitEditing={handleSend}
        />
        <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending || !input.trim()}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, paddingTop: 60 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.paper, fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 6 },
  emptyText: { color: colors.slate, fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
  bubbleRow: { flexDirection: 'row', marginBottom: 12 },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: colors.gold },
  bubbleAssistant: { backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  bubbleTextUser: { color: colors.ink, fontSize: 14 },
  bubbleTextAssistant: { color: colors.paper, fontSize: 14, lineHeight: 20 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8, gap: 8 },
  thinkingText: { color: colors.slate, fontSize: 12 },
  error: { color: colors.stamp, fontSize: 12, textAlign: 'center', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', gap: 10 },
  input: { flex: 1, backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11, color: colors.paper, fontSize: 14 },
  sendButton: { backgroundColor: colors.gold, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999 },
  sendButtonText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
});