import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { colors, radii, spacing, typography } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import PrimaryButton from '../components/PrimaryButton';
import ProgressBar from '../components/ProgressBar';
import PhotoPicker from '../components/PhotoPicker';
import { useApp } from '../state/AppContext';
import { addDoctor } from '../lib/remote';
import { isRemote } from '../lib/supabase';
import { REGIONS, LANGUAGES } from '../data/regions';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

// The caregiver code. `1234` always works (for the demo); the patient's own
// PIN / access code works too.
const CAREGIVER_PASSWORD = '1234';

function pinOk(entered: string, profilePin: string) {
  const v = entered.trim();
  return v === CAREGIVER_PASSWORD || (profilePin.length > 0 && v === profilePin);
}

// PIN / code fields: allow letters + digits (access codes are alphanumeric).
const cleanCode = (t: string) => t.replace(/[^0-9a-zA-Z]/g, '').slice(0, 12);

export default function SettingsScreen({ navigation }: Props) {
  const { state, dispatch } = useApp();
  const hasPin = state.profile.pin.length > 0;
  const [unlocked, setUnlocked] = useState(!hasPin);
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);

  function tryUnlock() {
    if (!hasPin || pinOk(entry, state.profile.pin)) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  if (!unlocked) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />
        <View style={styles.lockWrap}>
          <Ionicons name="lock-closed" size={40} color={colors.primary} />
          <Text style={typography.h2}>Enter your PIN</Text>
          <Text style={typography.bodyMuted}>
            Settings are protected so they can't be changed by accident.
          </Text>
          <TextInput
            style={styles.pinInput}
            value={entry}
            onChangeText={(t) => setEntry(cleanCode(t))}
            autoCapitalize="characters"
            secureTextEntry
            placeholder="PIN"
            placeholderTextColor={colors.textMuted}
          />
          {error && <Text style={styles.errorText}>That PIN doesn't match. Try again.</Text>}
          <PrimaryButton label="Unlock" onPress={tryUnlock} disabled={entry.length < 4} />
          <Text style={styles.hintLine}>Caregiver code for the demo: 1234</Text>
        </View>
        <BottomNav active="Settings" navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <EditableProfile />

        <DoctorCard />

        {/* Cognitive report — the doctor's performance charts, in-app (§25.1) */}
        <View style={styles.card}>
          <Text style={typography.label}>COGNITIVE REPORT</Text>
          <Text style={typography.bodyMuted}>
            Reaction time, accuracy trend, cognitive-domain balance and consistency —
            the same charts the doctor sees.
          </Text>
          <PrimaryButton
            label="Open Cognitive Report"
            variant="outline"
            onPress={() => navigation.navigate('CognitiveReport')}
          />
        </View>

        <CaregiverProgress navigation={navigation} name={state.profile.name || 'the patient'} />

        {/* Offline-first status (§19–§20) */}
        <View style={styles.card}>
          <Text style={typography.label}>OFFLINE & SYNC</Text>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>Offline mode</Text>
              <Text style={typography.bodyMuted}>
                Changes are saved on the device and sync when the internet returns.
              </Text>
            </View>
            <Switch value={!state.isOnline} onValueChange={(off) => dispatch({ type: 'SET_ONLINE', value: !off })} />
          </View>

          <Text style={styles.metaLine}>Content pre-downloaded for offline use</Text>
          <ProgressBar value={state.preDownloadedDays} max={3} color={colors.secondary} />
          <Text style={typography.bodyMuted}>{state.preDownloadedDays} of 3 days ready</Text>

          <Text style={[styles.metaLine, { marginTop: spacing.sm }]}>
            {state.pendingSync > 0
              ? `${state.pendingSync} change${state.pendingSync === 1 ? '' : 's'} waiting to sync`
              : 'Everything is synced'}
          </Text>
          {state.syncLog.slice(0, 5).map((line, i) => (
            <Text key={i} style={styles.syncLine}>• {line}</Text>
          ))}
        </View>

        {/* Caregiver local override (§17) */}
        <CaregiverOverride />

        <PrimaryButton
          label="Sign out"
          variant="danger"
          onPress={() => {
            dispatch({ type: 'SIGN_OUT' });
            navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
          }}
        />

        {/* Presenter controls — not a real feature */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>🎬 Demo / Presenter Controls</Text>
          <Text style={typography.bodyMuted}>
            Shortcuts for walking judges through the flow. Not part of the real app.
          </Text>

          <PrimaryButton
            label={state.isOnline ? 'Go offline' : 'Go back online'}
            variant="outline"
            onPress={() => dispatch({ type: 'SET_ONLINE', value: !state.isOnline })}
          />
          <PrimaryButton label="Fire a reminder now" variant="outline" onPress={() => dispatch({ type: 'FIRE_REMINDER' })} />
          <PrimaryButton
            label="Complete today's game set"
            variant="outline"
            onPress={() => {
              dispatch({ type: 'RESET_DAILY_SET' });
              navigation.navigate('MemoryChest');
            }}
          />
          <PrimaryButton label="Advance one day" variant="outline" onPress={() => dispatch({ type: 'ADVANCE_DAY' })} />
          <PrimaryButton
            label="Jump to a populated demo patient"
            variant="outline"
            onPress={() => {
              dispatch({ type: 'RESET_DEMO', seeded: true });
              navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            }}
          />

          <Text style={[typography.label, { marginTop: spacing.sm }]}>FAMILY PHOTO</Text>
          <PhotoPicker value={state.familyPhotoUri} onChange={(uri) => dispatch({ type: 'SET_FAMILY_PHOTO', uri })} />

          <PrimaryButton
            label="Reset demo data"
            variant="danger"
            onPress={() => {
              dispatch({ type: 'RESET_DEMO', seeded: false });
              navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
            }}
          />
        </View>
      </ScrollView>
      <BottomNav active="Settings" navigation={navigation} />
    </SafeAreaView>
  );
}

function CaregiverProgress({
  navigation,
  name,
}: {
  navigation: Props['navigation'];
  name: string;
}) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);

  function submit() {
    if (pinOk(pw, state.profile.pin)) {
      setPw('');
      setErr(false);
      setOpen(false);
      navigation.navigate('Progress');
    } else {
      setErr(true);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={typography.label}>FOR THE CAREGIVER</Text>
      <Text style={typography.bodyMuted}>
        A detailed view of {name}'s training — day streak, weekly accuracy and per-game progress.
        Protected by a caregiver password.
      </Text>
      {!open ? (
        <PrimaryButton label="View My Progress" onPress={() => setOpen(true)} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            style={styles.pinInline}
            value={pw}
            onChangeText={(t) => setPw(cleanCode(t))}
            autoCapitalize="characters"
            secureTextEntry
            placeholder="Caregiver password (1234)"
            placeholderTextColor={colors.textMuted}
          />
          {err && <Text style={styles.errorText}>Wrong password. Try again.</Text>}
          <PrimaryButton label="Open progress" onPress={submit} disabled={pw.length < 4} />
        </View>
      )}
    </View>
  );
}

function CaregiverOverride() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [ok, setOk] = useState(false);

  return (
    <View style={styles.card}>
      <Text style={typography.label}>CAREGIVER OVERRIDE</Text>
      <Text style={typography.bodyMuted}>
        When there's no internet, an authorized caregiver can enter the PIN on this device to change a
        setting. It applies immediately and syncs later.
      </Text>

      {!open ? (
        <PrimaryButton label="Caregiver: make a change" variant="outline" onPress={() => setOpen(true)} />
      ) : !ok ? (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            style={styles.pinInline}
            value={pin}
            onChangeText={(t) => setPin(cleanCode(t))}
            autoCapitalize="characters"
            secureTextEntry
            placeholder="Caregiver PIN"
            placeholderTextColor={colors.textMuted}
          />
          <PrimaryButton
            label="Verify"
            onPress={() => setOk(pinOk(pin, state.profile.pin))}
            disabled={pin.length < 4}
          />
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.okText}>✓ Verified as caregiver</Text>
          <PrimaryButton
            label="Reduce daily game set to 3"
            variant="outline"
            onPress={() => dispatch({ type: 'QUEUE_CHANGE', label: 'Caregiver reduced daily set to 3 games' })}
          />
          <PrimaryButton
            label="Turn off evening walk reminder"
            variant="outline"
            onPress={() => dispatch({ type: 'QUEUE_CHANGE', label: 'Caregiver disabled "Evening walk" reminder' })}
          />
        </View>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// Editable patient + caregiver profile. Saving pushes to the backend, which
// syncs live to the caregiver portal (and vice-versa via realtime).
function EditableProfile() {
  const { state, dispatch } = useApp();
  const [name, setName] = useState(state.profile.name);
  const [cgName, setCgName] = useState(state.caregiver.name || state.profile.caregiverName);
  const [cgPhone, setCgPhone] = useState(state.caregiver.phone);
  const [cgRelation, setCgRelation] = useState(state.caregiver.relation || 'Primary caregiver');
  const [region, setRegion] = useState(state.profile.region);
  const [language, setLanguage] = useState(state.profile.language);
  const [saved, setSaved] = useState(false);

  // Keep local fields in step when realtime pushes a change from the portal.
  React.useEffect(() => {
    setName(state.profile.name);
    setRegion(state.profile.region);
    setLanguage(state.profile.language);
  }, [state.profile.name, state.profile.region, state.profile.language]);
  React.useEffect(() => {
    setCgName(state.caregiver.name || state.profile.caregiverName);
    setCgPhone(state.caregiver.phone);
    setCgRelation(state.caregiver.relation || 'Primary caregiver');
  }, [state.caregiver.name, state.caregiver.phone, state.caregiver.relation, state.profile.caregiverName]);

  function save() {
    dispatch({ type: 'UPDATE_PROFILE', payload: { name, caregiverName: cgName, region, language } });
    dispatch({ type: 'SET_CAREGIVER', payload: { name: cgName, phone: cgPhone, relation: cgRelation } });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <View style={styles.card}>
      <Text style={typography.label}>PROFILE</Text>

      <Field label="Patient name" value={name} onChangeText={setName} />
      <Field label="Caregiver name" value={cgName} onChangeText={setCgName} />
      <Field label="Caregiver phone" value={cgPhone} onChangeText={setCgPhone} keyboardType="phone-pad" />
      <Field label="Caregiver relation" value={cgRelation} onChangeText={setCgRelation} />

      <Text style={styles.fieldLabel}>Region</Text>
      <View style={styles.chipRow}>
        {REGIONS.map((r) => (
          <Chip
            key={r}
            label={r}
            selected={region === r}
            onPress={() => {
              setRegion(r);
              if (!LANGUAGES[r]?.includes(language)) setLanguage('');
            }}
          />
        ))}
      </View>

      {!!region && (
        <>
          <Text style={styles.fieldLabel}>Language</Text>
          <View style={styles.chipRow}>
            {LANGUAGES[region].map((l) => (
              <Chip key={l} label={l} selected={language === l} onPress={() => setLanguage(l)} />
            ))}
          </View>
        </>
      )}

      <View style={styles.readonlyRow}>
        <Text style={styles.rowLabel}>Access code</Text>
        <Text style={styles.rowValue}>{state.profile.accessCode || '—'}</Text>
      </View>

      <PrimaryButton label={saved ? '✓ Saved' : 'Save changes'} onPress={save} />
      {isRemote && (
        <Text style={styles.hintLine}>Changes sync to the caregiver portal automatically.</Text>
      )}
    </View>
  );
}

function DoctorCard() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [dName, setDName] = useState('');
  const [dHospital, setDHospital] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const doctor = state.doctor;

  async function add() {
    if (!dName.trim() || !state.patientId || !isRemote) {
      setErr(!isRemote ? 'Connect to the internet to add a doctor.' : 'Enter the doctor’s name.');
      return;
    }
    setBusy(true);
    setErr('');
    const created = await addDoctor(state.patientId, { name: dName.trim(), hospital: dHospital.trim() });
    setBusy(false);
    if (created) {
      dispatch({ type: 'SET_DOCTOR', payload: created });
      setOpen(false);
      setDName('');
      setDHospital('');
    } else {
      setErr('Could not add the doctor. Try again.');
    }
  }

  return (
    <View style={styles.card}>
      <Text style={typography.label}>DOCTOR</Text>
      {doctor ? (
        <>
          <Row label="Name" value={doctor.name || '—'} />
          <Row label="Hospital" value={doctor.hospital || '—'} />
          <View style={styles.readonlyRow}>
            <Text style={styles.rowLabel}>Doctor access code</Text>
            <Text style={[styles.rowValue, styles.codeValue]}>{doctor.accessCode}</Text>
          </View>
          <Text style={styles.hintLine}>Share this code with the doctor for the Doctor Portal.</Text>
        </>
      ) : !open ? (
        <>
          <Text style={typography.bodyMuted}>
            Add a doctor to generate an access code they can use to view {state.profile.name || 'the patient'}'s
            performance and set appointments.
          </Text>
          <PrimaryButton label="Add a doctor" variant="outline" onPress={() => setOpen(true)} />
        </>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Field label="Doctor name" value={dName} onChangeText={setDName} />
          <Field label="Hospital / clinic" value={dHospital} onChangeText={setDHospital} />
          {err ? <Text style={styles.errorText}>{err}</Text> : null}
          <PrimaryButton label={busy ? 'Adding…' : 'Generate access code'} onPress={add} disabled={busy || !dName.trim()} />
          <PrimaryButton label="Cancel" variant="outline" onPress={() => setOpen(false)} />
        </View>
      )}
    </View>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.textMuted} {...rest} />
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  lockWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  pinInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
    minWidth: 160,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  pinInline: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    letterSpacing: 4,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  errorText: { color: colors.danger, fontSize: 13 },
  hintLine: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  okText: { color: colors.success, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm },
  demoCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  demoTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metaLine: { fontSize: 13, fontWeight: '600', color: colors.text },
  syncLine: { fontSize: 12, color: colors.textMuted },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    marginTop: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontSize: 13,
    color: colors.text,
    overflow: 'hidden',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.textOnPrimary },
  readonlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  codeValue: { fontSize: 16, fontWeight: '800', color: colors.primaryDark, letterSpacing: 1 },
});
