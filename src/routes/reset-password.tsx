import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowRight, KeyRound, LoaderCircle, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [
    { title: 'Set a new password — Pardewala' },
    { name: 'description', content: 'Set a new password for your Pardewala administrator account.' },
    { property: 'og:title', content: 'Set a new password — Pardewala' },
    { property: 'og:description', content: 'Set a new password for your Pardewala administrator account.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryReady(true);
    });
    if (window.location.hash.includes('type=recovery')) setRecoveryReady(true);
    return () => subscription.unsubscribe();
  }, []);

  async function updatePassword() {
    if (password.length < 8) {
      toast.error('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setStatus('submitting');
    const { error } = await supabase.auth.updateUser({ password });
    setStatus('idle');
    if (error) {
      toast.error('This reset link has expired. Please request another one.');
      return;
    }
    toast.success('Your password has been updated.');
    await navigate({ to: '/admin-login' });
  }

  return <main className="min-h-screen bg-secondary px-4 py-8 text-foreground sm:grid sm:place-items-center sm:py-12">
    <section className="mx-auto w-full max-w-md border border-border bg-card p-6 shadow-lg sm:p-8">
      <Link to="/" className="flex w-fit items-center gap-2 text-xl font-bold"><span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><Scale size={19}/></span>Pardewala</Link>
      <div className="mt-8"><div className="flex size-10 items-center justify-center rounded-md bg-secondary text-chart-1"><KeyRound size={20}/></div><p className="mt-5 text-sm font-semibold text-chart-1">ACCOUNT RECOVERY</p><h1 className="mt-1 text-3xl font-bold">Set a new password</h1><p className="mt-2 leading-7 text-muted-foreground">Choose a strong password for your administrator account.</p></div>
      {recoveryReady ? <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); void updatePassword(); }}>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">New password</span><input autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Confirm new password</span><input autoComplete="new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" /></label>
        <Button type="submit" className="mt-2 w-full" disabled={status === 'submitting'}>{status === 'submitting' ? <><LoaderCircle className="animate-spin"/>Updating…</> : <>Set new password <ArrowRight/></>}</Button>
      </form> : <p className="mt-7 rounded-md border border-border bg-secondary p-4 text-sm leading-6 text-muted-foreground">Open the password-reset link sent to your email to set a new password.</p>}
    </section>
  </main>;
}