import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { estimateForQuantity } from './pricing';

const addressInput = z.object({
  recipientName: z.string().trim().min(2).max(100), phone: z.string().trim().min(8).max(20),
  line1: z.string().trim().min(4).max(200), line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), postalCode: z.string().trim().min(4).max(12),
});
const checkoutInput = z.object({ method: z.enum(['cod', 'online', 'video']), address: addressInput });

export const createCheckoutOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator(checkoutInput)
  .handler(async ({ data, context }) => {
    const { data: cart, error: cartError } = await context.supabase.from('carts').select('id,cart_items(product_id,notebook_quantity)').eq('user_id', context.userId).maybeSingle();
    if (cartError || !cart?.cart_items.length) throw new Error('Your cart is empty.');
    const productIds = cart.cart_items.map((item) => item.product_id);
    const { data: products, error: productsError } = await context.supabase
      .from('products').select('id,name,price_per_kg,reference_weight_g,notebooks_per_reference,stock_quantity,active,quantity_price_overrides(notebook_quantity,custom_price)')
      .in('id', productIds);
    if (productsError || !products || products.length !== productIds.length) throw new Error('One or more selected notebooks are unavailable.');
    const productMap = new Map(products.map((product) => [product.id, product]));
    const lines = cart.cart_items.map((item) => {
      const product = productMap.get(item.product_id);
      if (!product || !product.active || product.stock_quantity < item.notebook_quantity) throw new Error('One or more selected notebooks are out of stock.');
      const priceOverrides = Object.fromEntries(product.quantity_price_overrides.map((override) => [override.notebook_quantity, Number(override.custom_price)]));
      const estimate = estimateForQuantity({ pricePerKg: Number(product.price_per_kg), referenceWeightG: Number(product.reference_weight_g), notebooksPerReference: Number(product.notebooks_per_reference), priceOverrides }, item.notebook_quantity);
      return { product, quantity: item.notebook_quantity, estimate };
    });
    const total = lines.reduce((sum, line) => ({ amount: sum.amount + line.estimate.estimatedAmount, weight: sum.weight + line.estimate.estimatedWeightG }), { amount: 0, weight: 0 });
    const { data: address, error: addressError } = await context.supabase.from('addresses').insert({
      user_id: context.userId, label: 'Checkout address', recipient_name: data.address.recipientName, phone: data.address.phone,
      line1: data.address.line1, line2: data.address.line2 || null, city: data.address.city, state: data.address.state, postal_code: data.address.postalCode,
    }).select('id').single();
    if (addressError || !address) throw new Error('We could not save your delivery address.');
    const cod = data.method === 'cod';
    const videoOrder = data.method === 'video';
    const { data: order, error: orderError } = await context.supabase.from('orders').insert({
      customer_id: context.userId, address_id: address.id, order_type: videoOrder ? 'video_call' : 'direct', status: cod ? 'placed' : 'payment_pending',
      payment_status: cod ? 'cod' : 'pending', payment_method: videoOrder ? 'video_call' : cod ? 'cod' : 'online', estimated_weight_g: total.weight, estimated_amount: total.amount,
    }).select('id,order_number,estimated_amount').single();
    if (orderError || !order) throw new Error('We could not create your order.');
    const { error: itemsError } = await context.supabase.from('order_items').insert(lines.map((line) => ({
      order_id: order.id, product_id: line.product.id, product_name: line.product.name, notebook_quantity: line.quantity,
      price_per_kg: Number(line.product.price_per_kg), estimated_weight_g: line.estimate.estimatedWeightG, estimated_amount: line.estimate.estimatedAmount,
    })));
    if (itemsError) throw new Error('We could not save your order items.');
    const { error: clearError } = await context.supabase.from('cart_items').delete().eq('cart_id', cart.id);
    if (clearError) throw new Error('Your order is placed, but we could not clear the cart.');
    if (!cod && !videoOrder) {
      const { error: paymentError } = await context.supabase.from('payment_transactions').insert({ order_id: order.id, provider: 'razorpay', amount: total.amount, status: 'pending', method: 'online' });
      if (paymentError) throw new Error('Your order is ready, but payment could not be started.');
    }
    return { orderId: order.id, orderNumber: order.order_number, amount: Number(order.estimated_amount), method: data.method, paymentConfigured: Boolean(process.env['RAZORPAY_KEY_ID'] && process.env['RAZORPAY_KEY_SECRET']) };
  });

const verifyPaymentInput = z.object({ orderId: z.string().uuid(), razorpayPaymentId: z.string().trim().min(1), razorpayOrderId: z.string().trim().min(1), razorpaySignature: z.string().trim().min(1) });

export const verifyRazorpayPayment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator(verifyPaymentInput)
  .handler(async ({ data, context }) => {
    const secret = process.env['RAZORPAY_KEY_SECRET'];
    if (!secret) throw new Error('Online payment is not configured yet.');
    const { createHmac, timingSafeEqual } = await import('crypto');
    const signature = createHmac('sha256', secret).update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`).digest('hex');
    const received = Buffer.from(data.razorpaySignature);
    const expected = Buffer.from(signature);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error('We could not verify this payment.');
    const { data: order, error } = await context.supabase.from('orders').select('id').eq('id', data.orderId).eq('customer_id', context.userId).maybeSingle();
    if (error || !order) throw new Error('Order not found.');
    const { error: updateError } = await context.supabase.from('orders').update({ payment_status: 'paid', status: 'placed', updated_at: new Date().toISOString() }).eq('id', order.id);
    if (updateError) throw new Error('Payment verified, but the order could not be updated.');
    const { error: transactionError } = await context.supabase.from('payment_transactions').update({ provider_order_id: data.razorpayOrderId, provider_payment_id: data.razorpayPaymentId, provider_signature: data.razorpaySignature, status: 'paid', verified_at: new Date().toISOString() }).eq('order_id', order.id).eq('status', 'pending');
    if (transactionError) throw new Error('Payment verified, but the receipt could not be updated.');
    return { ok: true };
  });