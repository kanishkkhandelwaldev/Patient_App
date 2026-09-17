import React, { useState } from 'react';
import { Alert, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { colors, radii, spacing, typography } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';
import PrimaryButton from '../components/PrimaryButton';
import { useApp } from '../state/AppContext';
import { Contact, ContactCategory, PATIENT_MEDICAL_INFO } from '../data/mock';

type Props = NativeStackScreenProps<RootStackParamList, 'SOS'>;

const CATEGORY_META: Record<ContactCategory, { label: string; icon: string }> = {
  caregiver: { label: 'Caregiver', icon: 'heart-circle-outline' },
  family: { label: 'Family', icon: 'people-outline' },
  doctor: { label: 'Doctor', icon: 'medkit-outline' },
  emergency: { label: 'Emergency Services', icon: 'alert-circle-outline' },
};

export default function SOSScreen({ navigation }: Props) {
  const { state } = useApp();
  const [showMedicalInfo, setShowMedicalInfo] = useState(false);
  const [alerted, setAlerted] = useState(false);

  const primaryEmergency = state.contacts.find((c) => c.category === 'emergency' && c.isPrimary);
  const primaryCaregiver = state.contacts.find((c) => c.category === 'caregiver' && c.isPrimary);

  const grouped: Record<ContactCategory, Contact[]> = {
    caregiver: state.contacts.filter((c) => c.category === 'caregiver'),
    family: state.contacts.filter((c) => c.category === 'family'),
    doctor: state.contacts.filter((c) => c.category === 'doctor'),
    emergency: state.contacts.filter((c) => c.category === 'emergency'),
  };

  function handleAlertCaregiver() {
    // In production this pings the caregiver portal + backend in real time
    // (spec §21/§28). Simulated here since there's no backend yet.
    setAlerted(true);
    Alert.alert(
      'Caregiver Notified',
      `${primaryCaregiver?.name ?? 'Your caregiver'} has been sent an alert with your current status and location.`
    );
    setTimeout(() => setAlerted(false), 4000);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Help & Contacts" onBack={() => navigation.goBack()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        {/* Big SOS button */}
        <View style={styles.sosCard}>
          <Pressable
            style={styles.sosCircle}
            onPress={() => primaryEmergency && Linking.openURL(`tel:${primaryEmergency.phone}`)}
          >
            <Ionicons name="call" size={34} color={colors.textOnPrimary} />
            <Text style={styles.sosCircleText}>SOS</Text>
          </Pressable>
        </View>

        <PrimaryButton
          label={alerted ? 'Caregiver Alerted ✓' : `Alert ${primaryCaregiver?.name ?? 'Caregiver'} Now`}
          variant="secondary"
          onPress={handleAlertCaregiver}
          disabled={alerted}
        />

        {/* Medical info card */}
        <Pressable style={styles.medicalCard} onPress={() => setShowMedicalInfo(!showMedicalInfo)}>
          <View style={styles.medicalHeaderRow}>
            <Ionicons name="medical-outline" size={20} color={colors.danger} />
            <Text style={typography.h2}>Medical Info Card</Text>
            <Ionicons name={showMedicalInfo ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </View>
          <Text style={typography.bodyMuted}>For first responders — tap to {showMedicalInfo ? 'hide' : 'show'}.</Text>
          {showMedicalInfo && (
            <View style={styles.medicalBody}>
              <MedicalRow label="Blood Group" value={PATIENT_MEDICAL_INFO.bloodGroup} />
              <MedicalRow label="Conditions" value={PATIENT_MEDICAL_INFO.conditions.join(', ')} />
              <MedicalRow label="Allergies" value={PATIENT_MEDICAL_INFO.allergies.join(', ')} />
              <MedicalRow label="Medications" value={PATIENT_MEDICAL_INFO.medications.join(', ')} />
              <MedicalRow label="Home Address" value={PATIENT_MEDICAL_INFO.homeAddress} />
            </View>
          )}
        </Pressable>

        {/* Categorized contacts */}
        {(Object.keys(grouped) as ContactCategory[]).map((cat) => {
          const contacts = grouped[cat];
          if (!contacts.length) return null;
          const meta = CATEGORY_META[cat];
          return (
            <View key={cat} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Ionicons name={meta.icon as any} size={16} color={colors.textMuted} />
                <Text style={typography.label}>{meta.label.toUpperCase()}</Text>
              </View>
              {contacts.map((c) => (
                <View key={c.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={typography.body}>
                      {c.name} {c.isPrimary && <Text style={styles.primaryTag}>· Primary</Text>}
                    </Text>
                    <Text style={typography.bodyMuted}>{c.relation}</Text>
                  </View>
                  <Pressable style={styles.iconAction} onPress={() => Linking.openURL(`tel:${c.phone}`)}>
                    <Ionicons name="call" size={20} color={colors.secondary} />
                  </Pressable>
                  <Pressable style={styles.iconAction} onPress={() => Linking.openURL(`sms:${c.phone}`)}>
                    <Ionicons name="chatbubble-outline" size={20} color={colors.secondary} />
                  </Pressable>
                  {cat !== 'emergency' && (
                    <Pressable
                      style={styles.iconAction}
                      onPress={() => Linking.openURL(`https://wa.me/${c.phone.replace('+', '')}`)}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color={colors.success} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function MedicalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.medicalRow}>
      <Text style={styles.medicalLabel}>{label}</Text>
      <Text style={styles.medicalValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  sosCard: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sosCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(180, 52, 42, 0.4)',
    elevation: 5,
  },
  sosCircleText: { color: colors.textOnPrimary, fontWeight: '800', fontSize: 16, marginTop: 2 },
  medicalCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: 4 },
  medicalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  medicalBody: { marginTop: spacing.sm, gap: spacing.sm },
  medicalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  medicalLabel: { color: colors.textMuted, fontSize: 13, width: 110 },
  medicalValue: { color: colors.text, fontSize: 14, flex: 1, textAlign: 'right' },
  categorySection: { gap: spacing.sm },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  primaryTag: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  iconAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
