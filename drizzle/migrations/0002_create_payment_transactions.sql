CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_request_id UUID REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_order_id TEXT,
  provider_payment_id TEXT,
  provider_signature TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status public.payment_status NOT NULL DEFAULT 'pending',
  method TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);
GRANT SELECT, INSERT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order parties read payment transactions" ON public.payment_transactions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = payment_transactions.order_id
      AND (orders.customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);
CREATE POLICY "Customers create pending payment transactions" ON public.payment_transactions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = payment_transactions.order_id
      AND orders.customer_id = auth.uid()
  )
  AND status = 'pending'
);
CREATE INDEX payment_transactions_order_idx ON public.payment_transactions(order_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_transactions;