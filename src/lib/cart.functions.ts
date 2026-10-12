import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const cartItemInput = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(0).max(100) });

export const getMyCart = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: cart, error: cartError } = await context.supabase
      .from('carts')
      .select('id,cart_items(id,product_id,notebook_quantity)')
      .eq('user_id', context.userId)
      .maybeSingle();
    if (cartError) throw new Error('Could not load your cart.');
    return cart;
  });

export const saveCartItems = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ items: z.array(cartItemInput).min(1).max(30) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: cart, error: cartError } = await context.supabase
      .from('carts')
      .upsert({ user_id: context.userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('id')
      .single();
    if (cartError || !cart) throw new Error('Could not save your cart.');

    const { error } = await context.supabase
      .from('cart_items')
      .upsert(data.items.filter((item) => item.quantity > 0).map((item) => ({ cart_id: cart.id, product_id: item.productId, notebook_quantity: item.quantity, updated_at: new Date().toISOString() })), { onConflict: 'cart_id,product_id' });
    if (error) throw new Error('Could not save your cart.');
    return { cartId: cart.id };
  });

export const setCartItemQuantity = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator(cartItemInput)
  .handler(async ({ data, context }) => {
    const { data: cart, error: cartError } = await context.supabase.from('carts').select('id').eq('user_id', context.userId).maybeSingle();
    if (cartError || !cart) throw new Error('Your cart is unavailable.');

    if (data.quantity === 0) {
      const { error } = await context.supabase.from('cart_items').delete().eq('cart_id', cart.id).eq('product_id', data.productId);
      if (error) throw new Error('Could not update your cart.');
    } else {
      const { error } = await context.supabase.from('cart_items').update({ notebook_quantity: data.quantity, updated_at: new Date().toISOString() }).eq('cart_id', cart.id).eq('product_id', data.productId);
      if (error) throw new Error('Could not update your cart.');
    }
    return { ok: true };
  });
