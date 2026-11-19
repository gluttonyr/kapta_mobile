import { kaptaErrorMessage } from '@/api/kapta';
import { CredentialsForm } from '@/components/CredentialsForm';
import { useLicense } from '@/license/LicenseProvider';

// First sign-in: the Kapta account that the Kapta owner created for this client.
export default function KaptaLogin() {
  const { signIn } = useLicense();

  async function submit(email: string, password: string) {
    try {
      await signIn(email, password);
    } catch (e) {
      throw new Error(kaptaErrorMessage(e, 'Connexion impossible'));
    }
  }

  return <CredentialsForm title="Compte Kapta" hint="Identifiants fournis avec votre licence Kapta" onSubmit={submit} />;
}
