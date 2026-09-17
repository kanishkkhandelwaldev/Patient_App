import React, { useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

// A slot-machine style time picker: three scrolling wheels (hour / minute /
// AM-PM) instead of a keyboard, so patients never have to type or read a
// blinking cursor. Built from a plain ScrollView (snap + momentum-end) so it
// behaves the same in Expo Go and on web — no native picker dependency.

const ITEM_HEIGHT = 46;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const MERIDIEMS = ['AM', 'PM'];

function parseValue(value: string): { hour: string; minute: string; meridiem: string } {
  const m = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return { hour: '9', minute: '00', meridiem: 'AM' };
  const hour = String(parseInt(m[1], 10));
  const minuteRaw = parseInt(m[2], 10);
  const minute = String(Math.round(minuteRaw / 5) * 5 % 60).padStart(2, '0');
  const meridiem = m[3].toUpperCase();
  return { hour: HOURS.includes(hour) ? hour : '9', minute, meridiem };
}

export default function TimePickerField({
  label,
  value,
  onChange,
  style,
  labelStyle,
  fieldStyle,
  textStyle,
  placeholder = 'Tap to set a time',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  style?: ViewStyle;
  labelStyle?: any;
  fieldStyle?: ViewStyle;
  textStyle?: any;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseValue(value));

  function openPicker() {
    setDraft(parseValue(value || ''));
    setOpen(true);
  }

  function confirm() {
    onChange(`${draft.hour}:${draft.minute} ${draft.meridiem}`);
    setOpen(false);
  }

  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <Pressable style={[styles.field, fieldStyle]} onPress={openPicker}>
        <Text style={[styles.fieldText, !value && styles.placeholder, textStyle]}>
          {value || placeholder}
        </Text>
        <Ionicons name="time-outline" size={22} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Set time</Text>

          <View style={styles.wheelRow}>
            <View style={styles.highlight} pointerEvents="none" />
            <Wheel data={HOURS} value={draft.hour} onChange={(hour) => setDraft((d) => ({ ...d, hour }))} />
            <Text style={styles.colon}>:</Text>
            <Wheel data={MINUTES} value={draft.minute} onChange={(minute) => setDraft((d) => ({ ...d, minute }))} />
            <Wheel
              data={MERIDIEMS}
              value={draft.meridiem}
              onChange={(meridiem) => setDraft((d) => ({ ...d, meridiem }))}
            />
          </View>

          <View style={styles.sheetActions}>
            <Pressable style={[styles.sheetBtn, styles.cancelBtn]} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.sheetBtn, styles.setBtn]} onPress={confirm}>
              <Text style={styles.setText}>Set time</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Wheel({
  data,
  value,
  onChange,
}: {
  data: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const index = Math.max(0, data.indexOf(value));

  function snapTo(i: number, animated: boolean) {
    scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated });
  }

  function handleEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.min(data.length - 1, Math.max(0, i));
    snapTo(clamped, true);
    if (data[clamped] !== value) onChange(data[clamped]);
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={{ height: WHEEL_HEIGHT, width: 72 }}
      contentContainerStyle={{ paddingVertical: PAD }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      contentOffset={{ x: 0, y: index * ITEM_HEIGHT }}
      onMomentumScrollEnd={handleEnd}
      onScrollEndDrag={handleEnd}
    >
      {data.map((item) => (
        <View key={item} style={styles.wheelItem}>
          <Text style={[styles.wheelText, item === value && styles.wheelTextOn]}>{item}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  fieldText: { fontSize: 16, color: colors.text },
  placeholder: { color: colors.textMuted },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 18,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 },

  wheelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: WHEEL_HEIGHT },
  highlight: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: PAD,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
  },
  colon: { fontSize: 22, fontWeight: '700', color: colors.text, marginHorizontal: 2 },

  wheelItem: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  wheelText: { fontSize: 19, color: colors.textMuted, fontWeight: '500' },
  wheelTextOn: { color: colors.text, fontWeight: '800', fontSize: 22 },

  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  sheetBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.surfaceMuted },
  cancelText: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  setBtn: { backgroundColor: colors.primary },
  setText: { fontSize: 16, fontWeight: '700', color: colors.textOnPrimary },
});
