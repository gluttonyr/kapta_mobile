import { useRouter } from 'expo-router';

import { ActivationForm } from '@/components/ActivationForm';

// From Réglages, before the end date: a new code extends the running license.
export default function Renew() {
  const router = useRouter();
  return <ActivationForm renew onDone={() => router.back()} />;
}
