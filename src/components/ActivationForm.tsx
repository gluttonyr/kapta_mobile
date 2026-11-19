import { KeyRound, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { kaptaErrorMessage } from '@/api/kapta';
import { BackgroundDecor } from '@/components/BackgroundDecor';
import { Logo } from '@/components/Logo';
import { Pressable } from '@/components/Pressable';
import { Text, TextInput } from '@/components/Text';
import { type LicenseBlock, useLicense } from '@/license/LicenseProvider';
import { colors } from '@/theme/colors';

const COPY: Record<LicenseBlock | 'RENEW', { title: string; text: string }> = {
  NON_ACTIVEE: {
    title: 'Activer ce téléphone',
    text: 'Saisissez le code d’activation fourni avec votre licence Kapta.',
  },
  EXPIREE: {
    title: 'Licence expirée',
    text: 'La capture des paiements est arrêtée. Saisissez un nouveau code pour la réactiver.',
  },
  REVOQUEE: {
    title: 'Licence désactivée',
    text: 'Ce téléphone a été désactivé. Contactez Kapta ou saisissez un nouveau code.',
  },
  HORS_LIGNE: {
    title: 'Vérification impossible',
    text: 'La licence n’a pas pu être vérifiée depuis plus de 3 jours. Connectez le téléphone à Internet puis réessayez.',
  },
  RENEW: {
    title: 'Prolonger la licence',
    text: 'La durée du nouveau code s’ajoute à la date de fin actuelle.',
  },
};

/** Code entry. `renew`: opened from Réglages while the license still runs; onDone closes it. */
export function ActivationForm({ renew = false, onDone }: { renew?: boolean; onDone?: () => void }) {
  const { account, license, block, activate, refresh, signOut } = useLicense();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const copy = COPY[renew ? 'RENEW' : (block ?? 'NON_ACTIVEE')];

  async function submit() {
    if (busy || !code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await activate(code);
      setCode('');
      onDone?.();
    } catch (e) {
      setError(kaptaErrorMessage(e, 'Activation impossible'));
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    setChecking(true);
    await refresh().catch(() => {});
    setChecking(false);
  }

  return (
    <SafeAreaView style={styles.root}>
      <BackgroundDecor />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Logo size={72} />
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.text}>{copy.text}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.client}>{license?.client.name ?? account?.clientName}</Text>
            <Text style={styles.account}>{account?.email}</Text>
            {renew && license?.expiresAt ? (
              <Text style={styles.account}>Fin actuelle : {new Date(license.expiresAt).toLocaleDateString('fr-FR')}</Text>
            ) : null}

            {block === 'HORS_LIGNE' && !renew ? (
              <Pressable style={styles.secondary} onPress={retry} disabled={checking} accessibilityRole="button">
                {checking ? <ActivityIndicator color={colors.text} /> : <RefreshCw size={16} color={colors.text} />}
                <Text style={styles.secondaryText}>Réessayer la vérification</Text>
              </Pressable>
            ) : null}

            <View style={styles.field}>
              <KeyRound size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="KPT-XXXX-XXXX-XXXX"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Code d’activation"
                value={code}
                onChangeText={setCode}
                onSubmitEditing={submit}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={({ pressed }) => [styles.button, (busy || pressed) && { opacity: 0.75 }]}
              onPress={submit}
              disabled={busy}
              accessibilityRole="button">
              {busy ? <ActivityIndicator color={colors.onGreen} /> : <Text style={styles.buttonText}>Activer</Text>}
            </Pressable>
          </View>

          {renew ? null : (
            <Pressable onPress={() => signOut()} accessibilityRole="button">
              <Text style={styles.link}>Changer de compte Kapta</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20 },
  brand: { alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 6 },
  text: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  card: {
    gap: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  client: { fontSize: 17, fontWeight: '700', color: colors.text },
  account: { fontSize: 13, color: colors.textSecondary, marginTop: -8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 17, letterSpacing: 1.5, color: colors.text },
  error: { color: colors.errorText, fontSize: 14 },
  button: { backgroundColor: colors.green, borderRadius: 12, padding: 15, alignItems: 'center' },
  buttonText: { color: colors.onGreen, fontSize: 16, fontWeight: '700' },
  secondary: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  secondaryText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  link: { fontSize: 13, color: colors.greenText, fontWeight: '600', textAlign: 'center' },
});
