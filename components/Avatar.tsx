import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/theme';
import { AvatarId } from '../state/AppContext';

// The two companions: an elderly grandmother (Aita) and grandfather (Koka) in
// traditional North-East-India dress.
const AVATAR_IMAGE: Partial<Record<AvatarId, ImageSourcePropType>> = {
  aita: require('../assets/avatars/aita.png'),
  koka: require('../assets/avatars/koka.png'),
};

// Fallback if an image ever fails to load.
const AVATAR_GLYPH: Record<AvatarId, string> = {
  aita: '👵',
  koka: '👴',
};

export const AVATAR_OPTIONS: { id: AvatarId; label: string }[] = [
  { id: 'aita', label: 'Aita — Grandmother' },
  { id: 'koka', label: 'Koka — Grandfather' },
];

// The ring is painted a bit larger than the requested `size` and centred on
// the same point — so it fully covers the image's square corners instead of
// relying on the image being shrunk to fit exactly inside it. The outer box
// stays exactly `size x size` so callers positioning the avatar don't shift.
const RING_OVERSCALE = 1.18;

export default function Avatar({
  id,
  size = 50,
  style,
}: {
  id: AvatarId | null;
  size?: number;
  style?: ViewStyle;
}) {
  const image = id ? AVATAR_IMAGE[id] : undefined;
  const ringSize = size * RING_OVERSCALE;
  const inset = (ringSize - size) / 2;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          styles.circle,
          { width: ringSize, height: ringSize, borderRadius: ringSize / 2, left: -inset, top: -inset },
        ]}
      >
        {image ? (
          <Image
            source={image}
            style={{ width: ringSize * 0.85, height: ringSize * 0.85 }}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ fontSize: ringSize * 0.5 }}>{id ? AVATAR_GLYPH[id] : '🙂'}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
