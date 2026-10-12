import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const gatewayUrl = 'https://connector-gateway.lovable.dev/resend/emails';
const codeLifetimeMinutes = 10;

const requestCodeInput = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

const verifyCodeInput = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your email.'),
});

function hashCode(value: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then((buffer) =>
    Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  );
}

function createCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  const randomValue = values[0] ?? 0;
  return String((randomValue % 900000) + 100000);
}

async function sendCodeEmail(email: string, code: string) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  const resendKey = process.env['RESEND_API_KEY'];
  if (!apiKey || !resendKey) throw new Error('Email verification is not available right now. Please try again shortly.');

  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-Connection-Api-Key': resendKey,
    },
    body: JSON.stringify({
      from: 'Pardewala <onboarding@resend.dev>',
      to: [email],
      subject: 'Your Pardewala verification code',
      text: `Your Pardewala verification code is ${code}. It expires in ${codeLifetimeMinutes} minutes. Do not share this code with anyone.`,
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Resend verification email failed [${response.status}]: ${errorBody}`);
    if (response.status === 403) throw new Error('OTP sending needs a verified Pardewala email domain before it can reach shoppers.');
    throw new Error('We could not send your verification code. Please try again.');
  }
}

export const requestCheckoutEmailCode = createServerFn({ method: 'POST' })
  .validator(requestCodeInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: existingUser, error: userError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (userError) throw new Error('We could not check your email address. Please try again.');
    if (existingUser.users.some((user) => user.email?.toLowerCase() === data.email)) return { status: 'existing' as const };

    const code = createCode();
    const { error } = await supabaseAdmin.from('checkout_email_verifications').insert({
      email: data.email,
      password_hash: 'signup-managed-by-auth',
      verification_code_hash: await hashCode(code),
      expires_at: new Date(Date.now() + codeLifetimeMinutes * 60_000).toISOString(),
    });
    if (error) throw new Error('We could not prepare your verification code. Please try again.');
    await sendCodeEmail(data.email, code);
    return { status: 'sent' as const };
  });

export const verifyCheckoutEmailCode = createServerFn({ method: 'POST' })
  .validator(verifyCodeInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: verification, error } = await supabaseAdmin
      .from('checkout_email_verifications')
      .select('id,verification_code_hash,expires_at')
      .eq('email', data.email)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !verification || new Date(verification.expires_at).getTime() < Date.now()) throw new Error('This verification code has expired. Please request a new one.');
    if ((await hashCode(data.code)) !== verification.verification_code_hash) throw new Error('That verification code is not correct.');
    const { error: consumeError } = await supabaseAdmin.from('checkout_email_verifications').update({
      verified_at: new Date().toISOString(),
      consumed_at: new Date().toISOString(),
    }).eq('id', verification.id);
    if (consumeError) throw new Error('We could not complete verification. Please try again.');
    return { ok: true };
  });