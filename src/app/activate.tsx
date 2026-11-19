import { ActivationForm } from '@/components/ActivationForm';

// Shown while the phone has no usable license (never activated, expired, revoked, or unchecked too long).
export default function Activate() {
  return <ActivationForm />;
}
