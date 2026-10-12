CREATE TABLE public.checkout_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  phone text,
  verification_code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_email_verifications TO service_role;
ALTER TABLE public.checkout_email_verifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX checkout_email_verifications_email_created_at_idx ON public.checkout_email_verifications (email, created_at DESC);