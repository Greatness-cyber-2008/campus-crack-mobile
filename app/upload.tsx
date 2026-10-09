import { API_BASE_URL } from '@/constants/api';
import { colors } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { getAuthHeader } from '@/lib/getAuthHeader';
import { supabase } from '@/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const DISCIPLINES = ['general', 'computing', 'medical', 'commercial', 'science', 'arts', 'law', 'engineering'];

interface CourseOption { id: string; title: string; course_code: string | null; }

export default function UploadScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { courseId: preselectedCourseId } = useLocalSearchParams<{ courseId?: string }>();

  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [discipline, setDiscipline] = useState('general');
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(preselectedCourseId || '');
  const [status, setStatus] = useState<'idle' | 'picking' | 'uploading' | 'extracting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title, course_code')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setCourses(data || []);
    })();
  }, [user]);

  const preselectedCourse = courses.find((c) => c.id === preselectedCourseId);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    setFile(result.assets[0]);
  }

  async function handleUpload() {
    if (!file || !user) return;
    setErrorMsg(null);
    setStatus('uploading');

    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      // Read the picked file and upload its raw bytes to Supabase Storage
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(path, arrayBuffer, { contentType: file.mimeType || 'application/octet-stream' });
      if (uploadError) throw new Error(uploadError.message);

      const { data: material, error: insertError } = await supabase
        .from('materials')
        .insert({
          user_id: user.id,
          course_id: selectedCourseId || null,
          title: title || file.name,
          course_code: courseCode || null,
          discipline,
          storage_path: path,
        })
        .select()
        .single();
      if (insertError || !material) throw new Error(insertError?.message || 'Could not save material');

      setMaterialId(material.id);
      setStatus('extracting');

      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ materialId: material.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');

      setStatus('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
      setStatus('error');
    }
  }

  if (status === 'done') {
    const backCourseId = selectedCourseId || preselectedCourseId;
    return (
      <View style={styles.centered}>
        <Text style={styles.doneTitle}>Material ready ✅</Text>
        <Text style={styles.doneSub}>Now choose what you want to do with it.</Text>

        <Pressable style={styles.primaryButton} onPress={() => router.push({ pathname: '/generate', params: { materialId } })}>
          <Text style={styles.primaryButtonText}>Set up practice questions →</Text>
        </Pressable>
        <Pressable
          style={styles.outlineButton}
          onPress={() => router.push({ pathname: '/flashcards/generate', params: { materialId } })}
        >
          <Text style={styles.outlineButtonText}>🗂️ Generate flashcards</Text>
        </Pressable>
        <Pressable
          style={styles.outlineButton}
          onPress={() => router.push({ pathname: '/planner/generate', params: { materialId } })}
        >
          <Text style={styles.outlineButtonText}>📅 Build a study plan</Text>
        </Pressable>
        {backCourseId ? (
          <Pressable style={styles.secondaryButton} onPress={() => router.push({ pathname: '/courses/[courseId]' as any, params: { courseId: backCourseId } })}>
            <Text style={styles.secondaryButtonText}>← Back to course</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/home')}>
            <Text style={styles.secondaryButtonText}>Back to home</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={styles.title}>Upload your material</Text>
      <Text style={styles.subtitle}>PDF or plain text notes work best.</Text>

      <Pressable style={styles.filePicker} onPress={pickFile}>
        <Text style={styles.filePickerText}>
          {file ? file.name : 'Tap to choose a file (PDF or .txt)'}
        </Text>
      </Pressable>

      {preselectedCourse ? (
        <View style={styles.courseNotice}>
          <Text style={styles.courseNoticeText}>
            Uploading to course: <Text style={{ color: colors.gold, fontWeight: '700' }}>{preselectedCourse.title}</Text>
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.label}>Add to a course (optional)</Text>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.disciplineChip, !selectedCourseId && styles.disciplineChipActive]}
              onPress={() => setSelectedCourseId('')}
            >
              <Text style={[styles.disciplineChipText, !selectedCourseId && styles.disciplineChipTextActive]}>No course</Text>
            </Pressable>
            {courses.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.disciplineChip, selectedCourseId === c.id && styles.disciplineChipActive]}
                onPress={() => setSelectedCourseId(c.id)}
              >
                <Text style={[styles.disciplineChipText, selectedCourseId === c.id && styles.disciplineChipTextActive]} numberOfLines={1}>
                  {c.title}{c.course_code ? ` (${c.course_code})` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. CYB 201 - Network Security Week 5"
        placeholderTextColor={colors.slate}
      />

      <Text style={styles.label}>Course code</Text>
      <TextInput
        style={styles.input}
        value={courseCode}
        onChangeText={setCourseCode}
        placeholder="CYB 201"
        placeholderTextColor={colors.slate}
      />

      <Text style={styles.label}>Discipline</Text>
      <View style={styles.disciplineRow}>
        {DISCIPLINES.map((d) => (
          <Pressable
            key={d}
            style={[styles.disciplineChip, discipline === d && styles.disciplineChipActive]}
            onPress={() => setDiscipline(d)}
          >
            <Text style={[styles.disciplineChipText, discipline === d && styles.disciplineChipTextActive]}>{d}</Text>
          </Pressable>
        ))}
      </View>

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      <Pressable
        style={[styles.primaryButton, (!file || status === 'uploading' || status === 'extracting') && { opacity: 0.6 }]}
        onPress={handleUpload}
        disabled={!file || status === 'uploading' || status === 'extracting'}
      >
        {status === 'uploading' || status === 'extracting' ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Text style={styles.primaryButtonText}>
            {status === 'error' ? 'Try again' : 'Upload material'}
          </Text>
        )}
      </Pressable>
      {status === 'extracting' && (
        <Text style={styles.hint}>Scanned documents can take up to a minute — hang tight.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { color: colors.paper, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: colors.slate, fontSize: 13, marginBottom: 20 },
  filePicker: {
    borderWidth: 1.5, borderColor: 'rgba(232,184,74,0.4)', borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', marginBottom: 22,
  },
  filePickerText: { color: colors.gold, fontSize: 14, textAlign: 'center' },
  label: { color: colors.slate, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: colors.inkLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.paper,
    marginBottom: 18, fontSize: 15,
  },
  disciplineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  courseNotice: { backgroundColor: 'rgba(232,184,74,0.08)', borderWidth: 1, borderColor: 'rgba(232,184,74,0.25)', borderRadius: 12, padding: 12, marginBottom: 18 },
  courseNoticeText: { color: colors.paper, fontSize: 12.5 },
  disciplineChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  disciplineChipActive: { backgroundColor: 'rgba(232,184,74,0.15)', borderColor: colors.gold },
  disciplineChipText: { color: colors.slate, fontSize: 12.5, textTransform: 'capitalize' },
  disciplineChipTextActive: { color: colors.gold },
  error: { color: colors.stamp, fontSize: 13, marginBottom: 14 },
  primaryButton: { backgroundColor: colors.gold, paddingVertical: 15, borderRadius: 999, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  outlineButton: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginBottom: 12, paddingHorizontal: 20 },
  outlineButtonText: { color: colors.paper, fontWeight: '600', fontSize: 14 },
  secondaryButton: { paddingVertical: 10, alignItems: 'center' },
  secondaryButtonText: { color: colors.slate, fontSize: 13 },
  doneTitle: { color: colors.paper, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  doneSub: { color: colors.slate, fontSize: 13, marginBottom: 28, textAlign: 'center' },
  hint: { color: colors.slate, fontSize: 11.5, textAlign: 'center', marginTop: -4 },
});