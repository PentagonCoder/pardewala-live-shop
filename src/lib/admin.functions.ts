import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (error || !data) throw new Error('This workspace is only available to shop administrators.');
}

export const getAdminWorkspace = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const [products, orders, customers] = await Promise.all([
      context.supabase.from('products').select('id,name,subject,brand,gsm,price_per_kg,reference_weight_g,notebooks_per_reference,stock_quantity,active,updated_at').order('updated_at', { ascending: false }),
      context.supabase.from('orders').select('id,order_number,customer_id,estimated_weight_g,actual_weight_g,estimated_amount,final_amount,payment_method,payment_status,status,created_at,profiles(full_name,phone)').order('created_at', { ascending: false }).limit(100),
      context.supabase.from('profiles').select('id,full_name,phone,created_at').order('created_at', { ascending: false }).limit(100),
    ]);
    if (products.error || orders.error || customers.error) throw new Error('The shop workspace could not be loaded.');
    return { products: products.data ?? [], orders: orders.data ?? [], customers: customers.data ?? [] };
  });

const productInput = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(2).max(140), subject: z.string().trim().max(80).nullable(), brand: z.string().trim().max(80).nullable(), gsm: z.number().int().min(1).nullable(), pricePerKg: z.number().positive(), referenceWeightG: z.number().positive(), notebooksPerReference: z.number().positive(), stockQuantity: z.number().int().min(0), minOrderQuantity: z.number().int().min(1), maxOrderQuantity: z.number().int().min(1), active: z.boolean() });

export const saveAdminProduct = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator(productInput)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.maxOrderQuantity < data.minOrderQuantity) throw new Error('Maximum quantity must be at least the minimum quantity.');
    const payload = { name: data.name, subject: data.subject, brand: data.brand, gsm: data.gsm, price_per_kg: data.pricePerKg, reference_weight_g: data.referenceWeightG, notebooks_per_reference: data.notebooksPerReference, stock_quantity: data.stockQuantity, min_order_quantity: data.minOrderQuantity, max_order_quantity: data.maxOrderQuantity, active: data.active, updated_at: new Date().toISOString() };
    if (data.id) {
      const { error } = await context.supabase.from('products').update(payload).eq('id', data.id);
      if (error) throw new Error('We could not update this notebook.');
      return { id: data.id };
    }
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`;
    const { data: product, error } = await context.supabase.from('products').insert({ ...payload, slug }).select('id').single();
    if (error || !product) throw new Error('We could not create this notebook.');
    return { id: product.id };
  });

const statusInput = z.object({ orderId: z.string().uuid(), status: z.enum(['payment_pending', 'placed', 'confirmed', 'weighing', 'packing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']) });
export const updateAdminOrderStatus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).validator(statusInput).handler(async ({ data, context }) => {
  await requireAdmin(context);
  const { error } = await context.supabase.from('orders').update({ status: data.status, updated_at: new Date().toISOString() }).eq('id', data.orderId);
  if (error) throw new Error('We could not update this order.');
  return { ok: true };
});