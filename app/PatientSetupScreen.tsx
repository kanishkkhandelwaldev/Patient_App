import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import PrimaryButton from '../components/PrimaryButton';
import ProgressBar from '../components/ProgressBar';
import Avatar, { AVATAR_OPTIONS } from '../components/Avatar';
import PhotoPicker from '../components/PhotoPicker';
import TimePickerField from '../components/TimePickerField';
import { AvatarId, generateAccessCode, useApp } from '../state/AppContext';
import { Reminder } from '../data/mock';
import { REGIONS, LANGUAGES } from '../data/regions';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientSetup'>;

// Clean neutral palette — the onboarding is deliberately plain white, separate
// from the warm theme used everywhere else in the app.
const INK = '#18181B';
const MUTED = '#71717A';
const LINE = '#E4E4E7';
const GREEN = '#2C6248';

const TOTAL_STEPS = 7;
const TITLES = [
  '',
  'What is your name?',
  'Who is your caregiver?',
  'Region and language',
  'Access code and PIN',
  'Daily reminders',
  'Choose your companion',
  'Add a family photo',
];
const SUBS = [
  '',
  'We use this to greet you in the app.',
  'They manage your reminders and settings.',
  'We download local content so the app works offline.',
  'Your caregiver uses these to help you offline.',
  'Add one now or set them up later.',
  'They guide you through the day. You can change this later.',
  'Shown in your Memory Chest. You can skip this.',
];
const OPTIONAL = [5, 7];

export default function PatientSetupScreen({ navigation }: Props) {
  const { state, dispatch } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [region, setRegion] = useState('');
  const [language, setLanguage] = useState('');
  const [accessCode] = useState(generateAccessCode());
  const [pin, setPin] = useState('');
  const [useCodeAsPin, setUseCodeAsPin] = useState(true);
  const [avatar, setAvatar] = useState<AvatarId | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [rTitle, setRTitle] = useState('');
  const [rTime, setRTime] = useState('');

  const pack = state.contentPack;

  useEffect(() => {
    if (region && language && (pack.status === 'none' || pack.region !== region || pack.language !== language)) {
      dispatch({ type: 'START_PACK_DOWNLOAD', region, language });
    }
  }, [region, language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pack.status !== 'downloading') return;
    const t = setInterval(() => {
      const nextP = Math.min(100, pack.progress + 12 + Math.random() * 10);
      if (nextP >= 100) {
        clearInterval(t);
        dispatch({ type: 'PACK_READY' });
      } else {
        dispatch({ type: 'PACK_PROGRESS', progress: nextP });
      }
    }, 220);
    return () => clearInterval(t);
  }, [pack.status, pack.progress]); // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else finish();
  }
  function back() {
    if (step > 1) setStep(step - 1);
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Auth');
  }

  function addReminder() {
    if (!rTitle.trim() || !rTime.trim()) return;
    setReminders((prev) => [
      ...prev,
      { id: `r${Date.now()}`, kind: 'medication', title: rTitle.trim(), time: rTime.trim(), acknowledged: false },
    ]);
    setRTitle('');
    setRTime('');
  }

  function finish() {
    dispatch({
      type: 'UPDATE_PROFILE',
      payload: {
        name,
        caregiverName,
        region,
        language,
        avatar,
        accessCode,
        pin: useCodeAsPin ? accessCode.replace('-', '') : pin,
      },
    });
    dispatch({ type: 'SET_CAREGIVER', payload: { name: caregiverName, relation: 'Primary caregiver', phone: caregiverPhone } });
    reminders.forEach((reminder) => dispatch({ type: 'ADD_REMINDER', reminder }));
    if (photo) dispatch({ type: 'SET_FAMILY_PHOTO', uri: photo });
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    navigation.replace('Home');
  }

  const canProceed =
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && caregiverName.trim().length > 0) ||
    (step === 3 && !!region && !!language && pack.status === 'ready') ||
    (step === 4 && (useCodeAsPin || pin.length >= 4)) ||
    step === 5 ||
    (step === 6 && !!avatar) ||
    step === 7;

  const isLast = step === TOTAL_STEPS;
  const optional = OPTIONAL.includes(step);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={back} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={INK} />
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>
        <Text style={styles.stepNo}>{step}/{TOTAL_STEPS}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{TITLES[step]}</Text>
        <Text style={styles.sub}>{SUBS[step]}</Text>

        <View style={styles.body}>
          {step === 1 && (
            <Field label="Full name" placeholder="e.g. Kamala Das" value={name} onChangeText={setName} autoFocus />
          )}

          {step === 2 && (
            <>
              <Field label="Caregiver's name" placeholder="e.g. Priya Das" value={caregiverName} onChangeText={setCaregiverName} />
              <Field label="Caregiver's phone (optional)" placeholder="+91" value={caregiverPhone} onChangeText={setCaregiverPhone} keyboardType="phone-pad" />
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.label}>Region</Text>
              <View style={styles.chips}>
                {REGIONS.map((r) => (
                  <Chip key={r} label={r} on={region === r} onPress={() => { setRegion(r); setLanguage(''); }} />
                ))}
              </View>

              {!!region && (
                <>
                  <Text style={[styles.label, { marginTop: 22 }]}>Language</Text>
                  <View style={styles.chips}>
                    {LANGUAGES[region].map((l) => (
                      <Chip key={l} label={l} on={language === l} onPress={() => setLanguage(l)} />
                    ))}
                  </View>
                </>
              )}

              {!!region && !!language && (
                <View style={styles.note}>
                  {pack.status === 'ready' ? (
                    <View style={styles.noteRow}>
                      <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                      <Text style={styles.noteText}>{pack.language} pack ready</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.noteText}>Downloading {pack.language} pack… {Math.round(pack.progress)}%</Text>
                      <ProgressBar value={pack.progress} />
                    </>
                  )}
                </View>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <View style={styles.code}>
                <Text style={styles.codeCap}>YOUR ACCESS CODE</Text>
                <Text style={styles.codeText}>{accessCode}</Text>
                <Text style={styles.codeHint}>Give this to your caregiver for the portal.</Text>
              </View>

              <Pressable style={styles.check} onPress={() => setUseCodeAsPin(!useCodeAsPin)}>
                <View style={[styles.box, useCodeAsPin && styles.boxOn]}>
                  {useCodeAsPin && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkText}>Use my access code as my PIN</Text>
              </Pressable>

              {!useCodeAsPin && (
                <Field label="4-digit PIN" placeholder="••••" value={pin} onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry />
              )}
            </>
          )}

          {step === 5 && (
            <>
              <Field label="Reminder" placeholder="e.g. Take Donepezil 5mg" value={rTitle} onChangeText={setRTitle} />
              <TimePickerField label="Time" value={rTime} onChange={setRTime} />
              <PrimaryButton label="Add reminder" variant="outline" onPress={addReminder} disabled={!rTitle.trim() || !rTime.trim()} />
              {reminders.map((r) => (
                <View key={r.id} style={styles.remRow}>
                  <Text style={styles.remTitle} numberOfLines={1}>{r.title}</Text>
                  <Text style={styles.remTime}>{r.time}</Text>
                </View>
              ))}
            </>
          )}

          {step === 6 && (
            <View style={styles.avatars}>
              {AVATAR_OPTIONS.map((opt) => {
                const on = avatar === opt.id;
                return (
                  <Pressable key={opt.id} onPress={() => setAvatar(opt.id)} style={[styles.avatarCard, on && styles.avatarCardOn]}>
                    <Avatar id={opt.id} size={76} />
                    <Text style={[styles.avatarName, on && { color: GREEN }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 7 && <PhotoPicker value={photo} onChange={setPhoto} />}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <PrimaryButton label={isLast ? 'Finish' : 'Continue'} onPress={next} disabled={!canProceed} />
        {optional && !isLast && (
          <Pressable onPress={() => setStep(step + 1)} style={styles.skip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function Field({ label, ...rest }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#A1A1AA" {...rest} />
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingBottom: 12 },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 4, borderRadius: 999, backgroundColor: '#F0F0F1', overflow: 'hidden' },
  trackFill: { height: 4, backgroundColor: GREEN },
  stepNo: { fontSize: 13, fontWeight: '600', color: MUTED, width: 34, textAlign: 'right' },

  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '700', color: INK, letterSpacing: -0.3 },
  sub: { fontSize: 15, color: MUTED, marginTop: 6, lineHeight: 21 },
  body: { marginTop: 28, gap: 16 },

  label: { fontSize: 13, fontWeight: '600', color: MUTED },
  input: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: INK,
    backgroundColor: '#FFFFFF',
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
  },
  chipOn: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 15, fontWeight: '500', color: INK },

  note: { marginTop: 22, padding: 14, borderRadius: 12, backgroundColor: '#F7F7F8', gap: 10 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteText: { fontSize: 14, fontWeight: '600', color: INK },

  code: { padding: 22, borderRadius: 14, backgroundColor: '#F7F7F8', alignItems: 'center', gap: 6 },
  codeCap: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: MUTED },
  codeText: { fontSize: 28, fontWeight: '700', color: INK, letterSpacing: 3 },
  codeHint: { fontSize: 13, color: MUTED, textAlign: 'center' },

  check: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#C4C4C8', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: GREEN, borderColor: GREEN },
  checkText: { fontSize: 15, color: INK },

  remRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  remTitle: { flex: 1, fontSize: 15, color: INK },
  remTime: { fontSize: 14, color: MUTED },

  avatars: { flexDirection: 'row', gap: 12, marginTop: 4 },
  avatarCard: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  avatarCardOn: { borderColor: GREEN, borderWidth: 2 },
  avatarName: { fontSize: 15, fontWeight: '600', color: INK },

  footer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: LINE, gap: 4 },
  skip: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 15, fontWeight: '600', color: MUTED },
});
