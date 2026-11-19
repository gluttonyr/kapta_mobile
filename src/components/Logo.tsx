import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/theme/colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Same geometry as the app icons (240x240 viewBox): an SMS bubble holding a "K", and the dot of a captured payment.
const BUBBLE =
  'M70 44 H170 A34 34 0 0 1 204 78 V134 A34 34 0 0 1 170 168 H106 L58 204 L72 168 H70 A34 34 0 0 1 36 134 V78 A34 34 0 0 1 70 44 Z';
const K_STEM = 'M92 78 V136';
const K_STEM_LENGTH = 58;
const K_ARMS = 'M148 78 L104 107 L150 136';
const K_ARMS_LENGTH = 108;

// Three layers sharing one viewBox (bubble, K, dot), so each can move alone.
export function Logo({ size = 96, animate = false, onDone }: { size?: number; animate?: boolean; onDone?: () => void }) {
  const reduced = useReducedMotion();
  const play = animate && !reduced;
  const bubble = useSharedValue(play ? 0 : 1);
  const letter = useSharedValue(play ? 0 : 1);
  const dot = useSharedValue(play ? 0 : 1);

  useEffect(() => {
    if (!play) {
      onDone?.();
      return;
    }
    const ease = Easing.out(Easing.cubic);
    bubble.value = withSpring(1, { damping: 12, stiffness: 150 });
    letter.value = withDelay(300, withTiming(1, { duration: 450, easing: ease }));
    dot.value = withDelay(700, withSpring(1, { damping: 8, stiffness: 220 }));
    const t = setTimeout(() => onDone?.(), 1000);
    return () => clearTimeout(t);
    // Runs once per mount: the splash and login play the intro a single time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, bubble.value * 2),
    transform: [{ translateY: (1 - bubble.value) * size * 0.08 }, { scale: 0.85 + bubble.value * 0.15 }],
  }));
  const stemProps = useAnimatedProps(() => ({ strokeDashoffset: K_STEM_LENGTH * (1 - Math.min(1, letter.value * 2)) }));
  const armsProps = useAnimatedProps(() => ({ strokeDashoffset: K_ARMS_LENGTH * (1 - letter.value) }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, dot.value * 2), transform: [{ scale: dot.value }] }));

  const layer = { width: size, height: size };
  return (
    <View style={layer} accessible accessibilityRole="image" accessibilityLabel="Logo Kapta">
      <Animated.View style={[StyleSheet.absoluteFill, bubbleStyle]}>
        <Svg width={size} height={size} viewBox="0 0 240 240">
          <Defs>
            <LinearGradient id="kaptaAmber" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FCD34D" />
              <Stop offset="0.5" stopColor={colors.primary} />
              <Stop offset="1" stopColor="#D97706" />
            </LinearGradient>
          </Defs>
          <Path d={BUBBLE} fill="url(#kaptaAmber)" />
          <AnimatedPath
            d={K_STEM}
            fill="none"
            stroke={colors.onPrimary}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray={K_STEM_LENGTH}
            animatedProps={stemProps}
          />
          <AnimatedPath
            d={K_ARMS}
            fill="none"
            stroke={colors.onPrimary}
            strokeWidth={16}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={K_ARMS_LENGTH}
            animatedProps={armsProps}
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, dotStyle]}>
        <Svg width={size} height={size} viewBox="0 0 240 240">
          <Circle cx="190" cy="50" r="19" fill={colors.bg} />
          <Circle cx="190" cy="50" r="13" fill={colors.success} />
        </Svg>
      </Animated.View>
    </View>
  );
}
