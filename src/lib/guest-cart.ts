import type { CatalogProduct } from '@/lib/catalog.functions';

const KEY = 'pardewala-guest-cart';

export type GuestCartItem = { productId: string; quantity: number };

function hasBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readGuestCart(): GuestCartItem[] {
  if (!hasBrowserStorage()) return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.flatMap((item): GuestCartItem[] => {
      if (!item || typeof item !== 'object') return [];
      const entry = item as { productId?: unknown; quantity?: unknown };
      return typeof entry.productId === 'string' && typeof entry.quantity === 'number' && Number.isInteger(entry.quantity) && entry.quantity > 0 ? [{ productId: entry.productId, quantity: entry.quantity }] : [];
    });
  } catch { return []; }
}

export function writeGuestCart(items: GuestCartItem[]) {
  if (hasBrowserStorage()) window.localStorage.setItem(KEY, JSON.stringify(items.filter((item) => item.quantity > 0)));
}

export function mergeGuestCart(items: GuestCartItem[], additions: GuestCartItem[], products: CatalogProduct[]) {
  const next = new Map(items.map((item) => [item.productId, item.quantity]));
  additions.forEach(({ productId, quantity }) => {
    const max = products.find((product) => product.id === productId)?.maxOrderQuantity ?? 100;
    next.set(productId, Math.min(max, (next.get(productId) ?? 0) + quantity));
  });
  return [...next.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}