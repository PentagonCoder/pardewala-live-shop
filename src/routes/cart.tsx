import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, LoaderCircle, Minus, Plus, Scale, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listCatalogProducts, type CatalogProduct } from '@/lib/catalog.functions';
import { estimateForQuantity, formatINR, formatWeight } from '@/lib/pricing';
import { readGuestCart, writeGuestCart } from '@/lib/guest-cart';

export const Route = createFileRoute('/cart')({
  head: () => ({ meta: [
    { title: 'Your notebook cart — Pardewala' },
    { name: 'description', content: 'Review your notebook quantities, estimated weights, and estimated total.' },
    { property: 'og:title', content: 'Your notebook cart — Pardewala' },
    { property: 'og:description', content: 'Review your notebook quantities, estimated weights, and estimated total.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: CartPage,
});

type CartEntry = { productId: string; quantity: number };

function CartPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [items, setItems] = useState<CartEntry[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const catalogue = await listCatalogProducts();
      if (!mounted) return;
      setProducts(catalogue);
      setItems(readGuestCart());
      setState('ready');
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const lines = useMemo(() => items.flatMap((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return product ? [{ product, quantity: item.quantity, estimate: estimateForQuantity(product, item.quantity) }] : [];
  }), [items, products]);
  const totals = lines.reduce((sum, line) => ({ amount: sum.amount + line.estimate.estimatedAmount, weight: sum.weight + line.estimate.estimatedWeightG }), { amount: 0, weight: 0 });

  async function update(productId: string, nextQuantity: number) {
    setWorkingId(productId);
    const updated = nextQuantity === 0 ? items.filter((item) => item.productId !== productId) : items.map((item) => item.productId === productId ? { ...item, quantity: nextQuantity } : item);
    writeGuestCart(updated);
    setItems(updated);
    setWorkingId(null);
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex h-17 max-w-5xl items-center justify-between px-4 sm:px-6"><Link to="/" className="flex items-center gap-2 text-xl font-bold"><span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><Scale size={19}/></span>Pardewala</Link><Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft size={17}/>Continue shopping</Link></div></header>
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><div className="max-w-2xl"><p className="text-sm font-semibold text-chart-1">YOUR SELECTION</p><h1 className="mt-1 text-3xl font-bold">Notebook cart</h1><p className="mt-2 leading-7 text-muted-foreground">Your total is an estimate. Final weight and price are confirmed by the shop.</p></div>
      {state === 'loading' && <div className="flex items-center gap-3 py-20 text-muted-foreground"><LoaderCircle className="animate-spin"/>Loading your cart…</div>}
      {state === 'error' && <div className="mt-8 border border-border bg-card p-6"><h2 className="text-xl font-bold">We couldn’t load your cart</h2><p className="mt-2 text-muted-foreground">Please try again in a moment.</p></div>}
      {state === 'ready' && (lines.length === 0 ? <div className="mt-8 border border-border bg-card p-6"><ShoppingBag className="text-chart-1"/><h2 className="mt-4 text-xl font-bold">Your cart is empty</h2><p className="mt-2 text-muted-foreground">Choose a notebook and its quantity to begin your order.</p><Button asChild className="mt-5"><Link to="/">Browse notebooks</Link></Button></div> : <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]"><div className="divide-y divide-border border-y border-border">{lines.map(({ product, quantity, estimate }) => <article key={product.id} className="flex gap-4 py-5"><div className="grid size-20 shrink-0 place-items-center rounded-md bg-secondary text-center text-xs font-bold text-secondary-foreground">{product.subject}<br/>{product.gsm} GSM</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><div><h2 className="font-bold">{product.name}</h2><p className="mt-1 text-sm text-muted-foreground">{product.brand} · {product.paperType ?? product.rulingType ?? 'Notebook'} · {formatINR(product.pricePerKg)}/kg</p></div><strong>{formatINR(estimate.estimatedAmount)}</strong></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Estimated: {formatWeight(estimate.estimatedWeightG)}</span><div className="flex items-center gap-1"><Button aria-label={`Remove one ${product.name}`} variant="outline" size="icon" disabled={workingId === product.id} onClick={() => void update(product.id, Math.max(0, quantity - 1))}><Minus/></Button><span className="w-9 text-center font-bold">{quantity}</span><Button aria-label={`Add one ${product.name}`} variant="outline" size="icon" disabled={workingId === product.id || quantity >= product.maxOrderQuantity} onClick={() => void update(product.id, quantity + 1)}><Plus/></Button><Button aria-label={`Remove ${product.name} from cart`} variant="ghost" size="icon" disabled={workingId === product.id} onClick={() => void update(product.id, 0)}><Trash2 className="text-destructive"/></Button></div></div></div></article>)}</div><aside className="h-fit border border-border bg-card p-5"><h2 className="text-lg font-bold">Estimated summary</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Notebook weight</dt><dd className="font-semibold">{formatWeight(totals.weight)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Estimated amount</dt><dd className="font-semibold">{formatINR(totals.amount)}</dd></div></dl><div className="mt-5 border-t border-border pt-4"><div className="flex justify-between gap-4 text-lg"><strong>Total estimate</strong><strong>{formatINR(totals.amount)}</strong></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Shipping, delivery method, and final shop weighing are confirmed at checkout.</p></div><Button asChild className="mt-5 w-full"><Link to="/checkout">Continue to checkout</Link></Button></aside></div>)}</section>
  </main>;
}
