import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, CreditCard, LoaderCircle, MailCheck, Scale, Truck, Video } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { createCheckoutOrder } from '@/lib/checkout.functions';
import { requestCheckoutEmailCode, verifyCheckoutEmailCode } from '@/lib/checkout-email-verification.functions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const Route = createFileRoute('/checkout')({
  head: () => ({ meta: [
    { title: 'Checkout — Pardewala' }, { name: 'description', content: 'Choose delivery and payment for your weighed notebook order.' },
    { property: 'og:title', content: 'Checkout — Pardewala' }, { property: 'og:description', content: 'Choose delivery and payment for your weighed notebook order.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: CheckoutPage,
});

type CheckoutForm = { recipientName: string; phone: string; email: string; password: string; confirmPassword: string; line1: string; line2: string; city: string; state: string; postalCode: string };
const initialForm: CheckoutForm = { recipientName: '', phone: '', email: '', password: '', confirmPassword: '', line1: '', line2: '', city: '', state: '', postalCode: '' };

function CheckoutPage() {
  const placeOrder = useServerFn(createCheckoutOrder);
  const requestEmailCode = useServerFn(requestCheckoutEmailCode);
  const confirmEmailCode = useServerFn(verifyCheckoutEmailCode);
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [method, setMethod] = useState<'cod' | 'online' | 'video'>('cod');
  const [state, setState] = useState<'idle' | 'verifying' | 'verified' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const update = (key: keyof CheckoutForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setForm((current) => ({ ...current, email: data.user?.email ?? current.email }));
    });
  }, []);
  async function sendVerification() {
    setMessage('');
    const email = form.email.trim().toLowerCase();
    if (!email || !form.password) { setState('error'); setMessage('Enter your email and password before verifying.'); toast.error('Enter your email and password first.'); return; }
    if (form.password.length < 8) { setState('error'); setMessage('Password must be at least 8 characters.'); toast.error('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirmPassword) { setState('error'); setMessage('Password and confirm password must match.'); toast.error('Password and confirm password must match.'); return; }
    setState('verifying');
    try {
      const result = await requestEmailCode({ data: { email } });
      if (result.status === 'existing') {
        setState('error');
        setMessage('An account with this email already exists. Please sign in with your password.');
        toast.error('This email already has an account. Please sign in instead.');
        return;
      }
      setState('verified');
      setMessage('We sent a 6-digit verification code to your email. Enter it below to continue.');
      toast.success('6-digit verification code sent to your email.');
    } catch (error) {
      setState('error');
      const errorMessage = error instanceof Error ? error.message : 'We could not send your verification code.';
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  }
  async function verifyEmail() {
    setMessage('');
    setState('verifying');
    try {
      await confirmEmailCode({ data: { email: form.email.trim().toLowerCase(), code: otp } });
      const { data, error } = await supabase.auth.signUp({ email: form.email.trim().toLowerCase(), password: form.password, options: { data: { full_name: form.recipientName, phone: form.phone } } });
      if (error) throw error;
      if (!data.user) throw new Error('We could not create your account. Please try again.');
      setState('idle');
      setMessage('Email verified. Your account is ready.');
      toast.success('Email verified. Your account is ready.');
    } catch (error) {
      setState('error');
      const errorMessage = error instanceof Error ? error.message : 'We could not verify your email.';
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  }
  async function submit() {
    setMessage('');
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setState('error'); setMessage('Please verify your email before placing the order.'); return; }
    setState('saving');
    try {
      const order = await placeOrder({ data: { method, address: form } });
      if (method === 'online' && !order.paymentConfigured) {
        setState('error'); setMessage(`Order ${order.orderNumber} is saved, but online payment is not configured yet. Please choose COD or contact the shop.`); return;
      }
      await navigate({ to: '/order/$orderId/confirmation', params: { orderId: order.orderId }, search: { number: order.orderNumber, method: order.method, amount: order.amount } });
    } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'We could not place your order.'); }
  }
  return <main className="min-h-screen bg-background text-foreground"><header className="border-b border-border"><div className="mx-auto flex h-17 max-w-4xl items-center justify-between px-4 sm:px-6"><Link to="/" className="flex items-center gap-2 text-xl font-bold"><span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><Scale size={19}/></span>Pardewala</Link><Link to="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ChevronLeft size={17}/>Back to cart</Link></div></header><section className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><p className="text-sm font-semibold text-chart-1">CHECKOUT</p><h1 className="mt-1 text-3xl font-bold">Where should we send your notebooks?</h1><p className="mt-2 max-w-2xl leading-7 text-muted-foreground">Your order stays estimated until the shop confirms the final physical weight.</p><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]"><div className="space-y-6"><section className="border border-border bg-card p-5"><h2 className="text-lg font-bold">Delivery address</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{([['recipientName', 'Full name'], ['phone', 'Phone'], ['line1', 'Address line 1'], ['line2', 'Address line 2'], ['city', 'City'], ['state', 'State'], ['postalCode', 'PIN code']] as const).map(([key, label]) => <label key={key} className={key === 'line1' || key === 'line2' ? 'sm:col-span-2' : ''}><span className="mb-1 block text-sm font-medium">{label}{key !== 'line2' && <span className="text-destructive"> *</span>}</span><input value={form[key]} onChange={(event) => update(key, event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" /></label>)}</div><div className="mt-5 border-t border-border pt-5"><div className="flex items-start gap-3"><MailCheck className="mt-0.5 text-chart-1"/><div><h3 className="font-bold">Sign in or create your account</h3><p className="mt-1 text-sm text-muted-foreground">We will send a one-time code to your email before placing the order.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-medium">Email <span className="text-destructive">*</span></span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" /></label><label><span className="mb-1 block text-sm font-medium">Password <span className="text-destructive">*</span></span><input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" /></label><label><span className="mb-1 block text-sm font-medium">Confirm password <span className="text-destructive">*</span></span><input type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" /></label><div className="flex items-end"><Button type="button" onClick={() => void sendVerification()} disabled={state === 'verifying'} className="w-full">{state === 'verifying' ? <LoaderCircle className="animate-spin"/> : 'Send OTP'}</Button></div></div>{state === 'verified' && <div className="mt-4 grid gap-3 rounded-md border border-primary/20 bg-secondary p-4 sm:grid-cols-[1fr_auto]"><label><span className="mb-1 block text-sm font-medium">Email verification code</span><input inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter the code from your email" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" /></label><Button type="button" onClick={() => void verifyEmail()} disabled={!otp.trim()} className="self-end">Confirm code</Button></div>}{message && <p className={`mt-3 text-sm ${state === 'error' ? 'text-destructive' : 'text-chart-2'}`}>{state !== 'error' && <CheckCircle2 className="mr-1 inline size-4"/>}{message}</p>}</div></section><section className="border border-border bg-card p-5"><h2 className="text-lg font-bold">Payment method</h2><div className="mt-4 grid gap-3"><Button type="button" variant="outline" onClick={() => setMethod('cod')} className={`h-auto items-start justify-start gap-3 p-4 text-left ${method === 'cod' ? 'border-primary bg-secondary' : 'border-border'}`}><Truck className="mt-0.5 text-chart-1"/><span><b>Cash on delivery</b><span className="mt-1 block text-sm font-normal text-muted-foreground">Pay after the shop weighs and confirms your notebooks.</span></span></Button><Button type="button" variant="outline" onClick={() => setMethod('online')} className={`h-auto items-start justify-start gap-3 p-4 text-left ${method === 'online' ? 'border-primary bg-secondary' : 'border-border'}`}><CreditCard className="mt-0.5 text-chart-1"/><span><b>Pay online</b><span className="mt-1 block text-sm font-normal text-muted-foreground">A secure payment request is shown once online payments are enabled.</span></span></Button><Button type="button" variant="outline" onClick={() => setMethod('video')} className={`h-auto items-start justify-start gap-3 p-4 text-left ${method === 'video' ? 'border-primary bg-secondary' : 'border-border'}`}><Video className="mt-0.5 text-chart-1"/><span><b>Live order with video call</b><span className="mt-1 block text-sm font-normal text-muted-foreground">Discuss your notebooks, confirm the actual weight, and pay with the shop on a live call.</span></span></Button></div></section></div><aside className="h-fit border border-border bg-card p-5"><h2 className="font-bold">Order confirmation</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">We will create your order from the saved items in your cart and keep the original estimate with it.</p><Button onClick={() => void submit()} disabled={state === 'saving'} className="mt-5 w-full">{state === 'saving' ? <><LoaderCircle className="animate-spin"/>Placing order…</> : method === 'cod' ? 'Place COD order' : method === 'video' ? 'Request live video order' : 'Continue to online payment'}</Button>{state === 'error' && <p className="mt-3 text-sm text-destructive">{message}</p>}</aside></div></section></main>;
}