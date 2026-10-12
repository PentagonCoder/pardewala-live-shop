import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, LoaderCircle, Scale, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin-login')({
  head: () => ({ meta: [
    { title: 'Shop admin sign in — Pardewala' },
    { name: 'description', content: 'Secure sign-in for the Pardewala shop workspace.' },
    { property: 'og:title', content: 'Shop admin sign in — Pardewala' },
    { property: 'og:description', content: 'Secure sign-in for the Pardewala shop workspace.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: '/admin' });
    });
  }, [navigate]);

  async function signIn() {
    if (!email.trim() || !password) {
      toast.error('Enter the administrator email and password.');
      return;
    }
    setStatus('submitting');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setStatus('idle');
    if (error) {
      toast.error('Administrator email or password is incorrect.');
      return;
    }
    await navigate({ to: '/admin' });
  }

  async function requestRecovery() {
    if (!email.trim()) {
      toast.error('Enter the administrator email first.');
      return;
    }
    setStatus('submitting');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setStatus('idle');
    if (error) {
      toast.error('We could not send a password reset email. Please try again.');
      return;
    }
    toast.success('Password reset instructions have been sent to your email.');
    setShowRecovery(false);
  }

  return <main className="min-h-screen bg-secondary px-4 py-8 text-foreground sm:grid sm:place-items-center sm:py-12">
    <section className="mx-auto w-full max-w-md border border-border bg-card p-6 shadow-lg sm:p-8">
      <Link to="/" className="flex w-fit items-center gap-2 text-xl font-bold"><span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><Scale size={19}/></span>Pardewala</Link>
      <div className="mt-8"><div className="flex size-10 items-center justify-center rounded-md bg-secondary text-chart-1"><ShieldCheck size={21}/></div><p className="mt-5 text-sm font-semibold text-chart-1">SHOP WORKSPACE</p><h1 className="mt-1 text-3xl font-bold">Admin sign in</h1><p className="mt-2 leading-7 text-muted-foreground">Use your authorised shop administrator account.</p></div>
      {showRecovery ? <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); void requestRecovery(); }}>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Administrator email</span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" placeholder="admin@example.com" /></label>
        <Button type="submit" className="mt-2 w-full" disabled={status === 'submitting'}>{status === 'submitting' ? <><LoaderCircle className="animate-spin"/>Sending…</> : <>Send reset email <ArrowRight/></>}</Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => setShowRecovery(false)}><ArrowLeft/>Back to sign in</Button>
      </form> : <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); void signIn(); }}>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Administrator email</span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" placeholder="admin@example.com" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Password</span><input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" placeholder="Your password" /></label>
        <Button type="submit" className="mt-2 w-full" disabled={status === 'submitting'}>{status === 'submitting' ? <><LoaderCircle className="animate-spin"/>Signing in…</> : <>Open shop workspace <ArrowRight/></>}</Button>
        <Button type="button" variant="link" className="mx-auto flex" onClick={() => setShowRecovery(true)}>Forgot password?</Button>
      </form>}
    </section>
  </main>;
}