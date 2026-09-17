import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/theme';

// Home sits in the centre as the anchor the patient always returns to.
// SOS lives on the Home screen itself, not here.
const TABS = [
  { key: 'MoreGames', label: 'More Games', icon: 'game-controller', route: 'MoreGames' as const },
  { key: 'Community', label: 'Community', icon: 'book', route: 'Community' as const },
  { key: 'Home', label: 'Home', icon: 'home', route: 'Home' as const },
  { key: 'Alerts', label: 'Alerts', icon: 'notifications', route: 'Alerts' as const },
  { key: 'Settings', label: 'Settings', icon: 'settings', route: 'Settings' as const },
];

const SPRING = { friction: 7, tension: 130, useNativeDriver: false } as const;

function Tab({
  tab,
  active,
  onPress,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  onPress: () => void;
}) {
  const isHome = tab.key === 'Home';
  const a = useRef(new Animated.Value(active ? 1 : 0)).current; // active state
  const press = useRef(new Animated.Value(0)).current; // press-down

  useEffect(() => {
    Animated.spring(a, { toValue: active ? 1 : 0, ...SPRING }).start();
  }, [active, a]);

  const lift = a.interpolate({ inputRange: [0, 1], outputRange: [0, isHome ? -20 : -12] });
  const scale = Animated.multiply(
    a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
    press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] })
  );
  // colors.primary === #2C6248 === rgb(44,98,72); keep both stops in rgba so the
  // interpolation stays well-defined.
  const bg = a.interpolate({
    inputRange: [0, 1],
    outputRange: [isHome ? 'rgba(255,255,255,1)' : 'rgba(44,98,72,0)', 'rgba(44,98,72,1)'],
  });
  const shadowOpacity = a.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onPressIn={() => Animated.timing(press, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: false }).start()}
      onPressOut={() => Animated.spring(press, { toValue: 0, ...SPRING }).start()}
    >
      <Animated.View
        style={[
          styles.pill,
          isHome && styles.homePill,
          {
            backgroundColor: bg,
            transform: [{ translateY: lift }, { scale }],
            shadowColor: colors.primaryDark,
            shadowOpacity,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: active ? 8 : 0,
          },
        ]}
      >
        <Ionicons
          name={tab.icon as any}
          size={isHome ? 26 : 22}
          color={active ? colors.textOnPrimary : isHome ? colors.primary : colors.textMuted}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          {
            color: active ? colors.primary : colors.textMuted,
            fontWeight: active || isHome ? '800' : '600',
            transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, isHome ? -8 : -4] }) }],
          },
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

export default function BottomNav({ active, navigation }: { active: string; navigation: any }) {
  return (
    <View style={styles.wrap}>
      {TABS.map((tab) => (
        <Tab
          key={tab.key}
          tab={tab}
          active={tab.key === active}
          onPress={() => navigation.navigate(tab.route)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm + 2,
    // soft lift so the bar reads as a raised surface
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  pill: {
    width: 42,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homePill: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  label: { fontSize: 11 },
});
