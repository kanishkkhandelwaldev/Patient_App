import React, { useState } from 'react';
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { colors, radii, spacing, typography } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';
import PrimaryButton from '../components/PrimaryButton';
import { RECALL_QUESTIONNAIRE } from '../data/mock';
import { useApp } from '../state/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryChest'>;

export default function MemoryChestScreen({ navigation }: Props) {
  const { state, dispatch } = useApp();
  const familyPhoto = state.familyPhotoUri;
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const correctRef = React.useRef(0);

  const question = RECALL_QUESTIONNAIRE[qIndex];

  function choose(i: number) {
    setSelected(i);
    if (i === question.correctIndex) correctRef.current += 1;
    setTimeout(() => {
      if (qIndex >= RECALL_QUESTIONNAIRE.length - 1) {
        const accuracy = Math.round((correctRef.current / RECALL_QUESTIONNAIRE.length) * 100);
        dispatch({ type: 'RECORD_MEMORY_RESULT', accuracy });
        setFinished(true);
      } else {
        setQIndex(qIndex + 1);
        setSelected(null);
      }
    }, 500);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Memory Chest" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        {!finished ? (
          <>
            {familyPhoto ? (
              <Image source={{ uri: familyPhoto }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={{ fontSize: 40 }}>📷</Text>
                <Text style={typography.bodyMuted}>Your caregiver hasn't added a family photo yet.</Text>
              </View>
            )}

            <Text style={[typography.label, { marginTop: spacing.lg }]}>
              QUESTION {qIndex + 1} OF {RECALL_QUESTIONNAIRE.length}
            </Text>
            <Text style={typography.h2}>{question.question}</Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {question.options.map((opt, i) => (
                <Pressable
                  key={i}
                  onPress={() => choose(i)}
                  style={[
                    styles.option,
                    selected === i && i === question.correctIndex && styles.optionCorrect,
                    selected === i && i !== question.correctIndex && styles.optionWrong,
                  ]}
                >
                  <Text style={typography.body}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.doneWrap}>
            <Text style={{ fontSize: 56 }}>🎁</Text>
            <Text style={typography.h1}>Chest Opened!</Text>
            <Text style={typography.bodyMuted}>Thank you for sharing your memories today.</Text>
            <PrimaryButton label="Back to Home" onPress={() => navigation.navigate('Home')} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg },
  photo: { width: '100%', height: 200, borderRadius: radii.lg },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCorrect: { borderColor: colors.success, backgroundColor: colors.surfaceMuted },
  optionWrong: { borderColor: colors.danger },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
