import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowRight, LoaderCircle, LockKeyhole, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [
    { title: 'Sign in — Pardewala' },
    { name: 'description', content: 'Sign in to Pardewala to place orders and manage your notebook shopping.' },
    { property: 'og:title', content: 'Sign in — Pardewala' },
    { property: 'og:description', content: 'Sign in to Pardewala to place orders and manage your notebook shopping.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: '/' });
    });
  }, [navigate]);

  async function signIn() {
    if (!email.trim() || !password) {
      toast.error('Enter your email and password.');
      return;
    }
    setStatus('submitting');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setStatus('idle');
    if (error) {
      toast.error('Email or password is incorrect.');
      return;
    }
    toast.success('You are signed in.');
    await navigate({ to: '/' });
  }

  return <main className="min-h-screen bg-secondary px-4 py-8 text-foreground sm:grid sm:place-items-center sm:py-12">
    <section className="mx-auto w-full max-w-md border border-border bg-card p-6 shadow-lg sm:p-8">
      <Link to="/" className="flex w-fit items-center gap-2 text-xl font-bold"><span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><Scale size={19}/></span>Pardewala</Link>
      <div className="mt-8"><div className="flex size-10 items-center justify-center rounded-md bg-secondary text-chart-1"><LockKeyhole size={20}/></div><p className="mt-5 text-sm font-semibold text-chart-1">WELCOME BACK</p><h1 className="mt-1 text-3xl font-bold">Sign in to your account</h1><p className="mt-2 leading-7 text-muted-foreground">Use the email and password you created while checking out.</p></div>
      <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); void signIn(); }}>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Email</span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" placeholder="you@example.com" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Password</span><input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" placeholder="Your password" /></label>
        <Button type="submit" className="mt-2 w-full" disabled={status === 'submitting'}>{status === 'submitting' ? <><LoaderCircle className="animate-spin"/>Signing in…</> : <>Sign in <ArrowRight/></>}</Button>
      </form>
      <p className="mt-6 border-t border-border pt-5 text-center text-sm leading-6 text-muted-foreground">New to Pardewala? Add your notebooks to the cart, then create your account securely during checkout.</p>
    </section>
  </main>;
}