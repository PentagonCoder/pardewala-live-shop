import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/pricing';

export const Route = createFileRoute('/order/$orderId/confirmation')({
  validateSearch: (search: Record<string, unknown>) => ({ number: typeof search['number'] === 'string' ? search['number'] : 'Pardewala order', method: search['method'] === 'online' || search['method'] === 'video' ? search['method'] : 'cod', amount: typeof search['amount'] === 'number' ? search['amount'] : typeof search['amount'] === 'string' ? Number(search['amount']) : 0 }),
  head: () => ({ meta: [
    { title: 'Order confirmed — Pardewala' }, { name: 'description', content: 'Your Pardewala notebook order has been created.' },
    { property: 'og:title', content: 'Order confirmed — Pardewala' }, { property: 'og:description', content: 'Your Pardewala notebook order has been created.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: OrderConfirmation,
});

function OrderConfirmation() { const search = Route.useSearch(); return <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground"><section className="w-full max-w-lg border border-border bg-card p-7 text-center"><div className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-chart-1"><CheckCircle2 size={30}/></div><p className="mt-5 text-sm font-semibold text-chart-1">ORDER CREATED</p><h1 className="mt-1 text-3xl font-bold">{search.number}</h1><p className="mt-4 leading-7 text-muted-foreground">{search.method === 'cod' ? 'Your cash-on-delivery order is with the shop.' : search.method === 'video' ? 'Your live video order request is with the shop. We will confirm the notebooks, actual weight, and payment during the call.' : 'Your order is saved and awaiting secure online payment setup.'} The estimated amount is {formatINR(search.amount)} and will remain visible beside any final shop weight.</p><div className="mt-6 border-y border-border py-4 text-left text-sm"><div className="flex items-center gap-2"><Scale className="text-chart-1" size={17}/><span>Final weight and price are confirmed after physical weighing.</span></div></div><Button asChild className="mt-6 w-full"><Link to="/">Continue shopping</Link></Button></section></main>; }