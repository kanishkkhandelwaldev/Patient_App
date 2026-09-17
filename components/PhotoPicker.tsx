import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, radii, spacing, typography } from '../theme/theme';

/**
 * Lets a caregiver (here, the presenter during setup / demo) set the patient's
 * family photo (spec §4/§12). Real device photos come via expo-image-picker
 * (on web that's a file <input>, no API key); the bundled sample photos are a
 * fallback so the flow works fully offline.
 */
export default function PhotoPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (uri: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function pickFromDevice() {
    setBusy(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.6,
        base64: false,
      });
      if (!res.canceled && res.assets?.[0]?.uri) onChange(res.assets[0].uri);
    } catch (e) {
      console.warn('Photo pick failed', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {value ? (
        <View>
          <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
          <Pressable style={styles.clearBtn} onPress={() => onChange(null)}>
            <Ionicons name="close" size={16} color={colors.textOnPrimary} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.emptyPreview}>
          <Ionicons name="image-outline" size={28} color={colors.textMuted} />
          <Text style={typography.bodyMuted}>No family photo yet</Text>
        </View>
      )}

      <Pressable style={styles.deviceBtn} onPress={pickFromDevice} disabled={busy}>
        <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
        <Text style={styles.deviceBtnText}>{busy ? 'Opening…' : 'Choose a photo'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  preview: { width: '100%', height: 160, borderRadius: radii.md },
  clearBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.danger,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPreview: {
    width: '100%',
    height: 120,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
  },
  deviceBtnText: { color: colors.primary, fontWeight: '700' },
});
