import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';

import { colors } from '@/theme/colors';

const tones = {
  success: { bg: colors.success, fg: colors.onPrimary },
  warning: { bg: colors.warningSurface, fg: colors.warningText },
  error: { bg: colors.errorSurface, fg: colors.errorText },
  neutral: { bg: colors.border, fg: colors.textSecondary },
} as const;

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: keyof typeof tones }) {
  const t = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontSize: 12, fontWeight: '600' },
});
