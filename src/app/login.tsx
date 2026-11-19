import { StyleSheet } from 'react-native';

import { ADMIN_ONLY_MESSAGE } from '@/api/auth';
import { CredentialsForm } from '@/components/CredentialsForm';
import { Pressable } from '@/components/Pressable';
import { Text } from '@/components/Text';
import { useLicense } from '@/license/LicenseProvider';
import { useSession } from '@/session/SessionProvider';
import { colors } from '@/theme/colors';

// Second sign-in, once the phone is licensed: the admin account on the client's own backend.
export default function Login() {
  const { signIn } = useSession();
  const { license, signOut: signOutKapta } = useLicense();
  const clientName = license?.client.name ?? 'votre client';

  async function submit(email: string, password: string) {
    try {
      await signIn(email, password);
    } catch (e: any) {
      throw new Error(e?.message === ADMIN_ONLY_MESSAGE ? ADMIN_ONLY_MESSAGE : (e?.response?.data?.message ?? 'Connexion impossible'));
    }
  }

  return (
    <CredentialsForm
      title={`Connexion à ${clientName}`}
      hint={`Compte administrateur de ${clientName}`}
      onSubmit={submit}
      footer={
        <Pressable onPress={() => signOutKapta()} accessibilityRole="button">
          <Text style={styles.link}>Changer de compte Kapta</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 13, color: colors.greenText, fontWeight: '600', textAlign: 'center', marginTop: 4 },
});
