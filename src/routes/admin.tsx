import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Boxes,
  LoaderCircle,
  MailCheck,
  PackageSearch,
  Pencil,
  Plus,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getAdminWorkspace, saveAdminProduct, updateAdminOrderStatus } from "@/lib/admin.functions";
import { formatINR, formatWeight, weightPerNotebook } from "@/lib/pricing";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Shop workspace — Pardewala" },
      {
        name: "description",
        content: "Manage Pardewala notebooks, weight pricing, stock, and customer orders.",
      },
      { property: "og:title", content: "Shop workspace — Pardewala" },
      {
        property: "og:description",
        content: "Manage Pardewala notebooks, weight pricing, stock, and customer orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminWorkspace,
});

type Product = {
  id: string;
  name: string;
  subject: string | null;
  brand: string | null;
  gsm: number | null;
  price_per_kg: number;
  reference_weight_g: number;
  notebooks_per_reference: number;
  stock_quantity: number;
  active: boolean;
};
type Order = {
  id: string;
  order_number: string;
  estimated_weight_g: number;
  actual_weight_g: number | null;
  estimated_amount: number;
  final_amount: number | null;
  payment_method: string | null;
  payment_status: string;
  status: string;
  created_at: string;
  profiles: { full_name: string | null; phone: string | null } | null;
};
const blank = {
  name: "",
  subject: "",
  brand: "",
  gsm: "70",
  pricePerKg: "80",
  referenceWeightG: "1000",
  notebooksPerReference: "3",
  stockQuantity: "0",
  minOrderQuantity: "1",
  maxOrderQuantity: "20",
  active: true,
};

function AdminWorkspace() {
  const load = useServerFn(getAdminWorkspace);
  const save = useServerFn(saveAdminProduct);
  const changeStatus = useServerFn(updateAdminOrderStatus);
  const [tab, setTab] = useState<"orders" | "products" | "customers" | "email">("orders");
  const [state, setState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<
    { id: string; full_name: string | null; phone: string | null; created_at: string }[]
  >([]);
  const [editing, setEditing] = useState<(typeof blank & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  async function refresh() {
    setState("loading");
    try {
      const data = await load();
      setProducts(data.products as Product[]);
      setOrders(data.orders as Order[]);
      setCustomers(data.customers);
      setState("ready");
    } catch {
      setState("denied");
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function saveProduct() {
    if (!editing) return;
    setSaving(true);
    try {
      await save({
        data: {
          id: editing.id,
          name: editing.name,
          subject: editing.subject || null,
          brand: editing.brand || null,
          gsm: editing.gsm ? Number(editing.gsm) : null,
          pricePerKg: Number(editing.pricePerKg),
          referenceWeightG: Number(editing.referenceWeightG),
          notebooksPerReference: Number(editing.notebooksPerReference),
          stockQuantity: Number(editing.stockQuantity),
          minOrderQuantity: Number(editing.minOrderQuantity),
          maxOrderQuantity: Number(editing.maxOrderQuantity),
          active: editing.active,
        },
      });
      setEditing(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  }
  async function updateStatus(orderId: string, status: string) {
    await changeStatus({
      data: {
        orderId,
        status: status as
          | "payment_pending"
          | "placed"
          | "confirmed"
          | "weighing"
          | "packing"
          | "packed"
          | "shipped"
          | "out_for_delivery"
          | "delivered"
          | "cancelled",
      },
    });
    await refresh();
  }
  if (state === "loading")
    return (
      <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <LoaderCircle className="animate-spin" />
      </main>
    );
  if (state !== "ready")
    return (
      <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground">
        <section className="max-w-md border border-border bg-card p-6 text-center">
          <ShieldCheck className="mx-auto text-chart-1" />
          <h1 className="mt-4 text-xl font-bold">Shop access required</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in with a Pardewala shop administrator account to manage operations.
          </p>
          <Button asChild className="mt-5">
            <Link to="/admin-login">Admin sign in</Link>
          </Button>
        </section>
      </main>
    );
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-17 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Scale size={19} />
            </span>
            Pardewala
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-chart-1">
            <ShieldCheck size={17} />
            Shop workspace
          </span>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          {(
            [
              ["orders", "Orders"],
              ["products", "Notebooks"],
              ["customers", "Customers"],
              ["email", "Email setup"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={tab === key ? "secondary" : "ghost"}
              onClick={() => setTab(key)}
            >
              {key === "orders" ? (
                <PackageSearch />
              ) : key === "products" ? (
                <Boxes />
              ) : key === "customers" ? (
                <Users />
              ) : (
                <MailCheck />
              )}
              {label}
            </Button>
          ))}
        </div>
        {tab === "orders" && <OrdersView orders={orders} onStatus={updateStatus} />}{" "}
        {tab === "products" && (
          <ProductsView
            products={products}
            onEdit={(product) =>
              setEditing({
                id: product.id,
                name: product.name,
                subject: product.subject || "",
                brand: product.brand || "",
                gsm: String(product.gsm || ""),
                pricePerKg: String(product.price_per_kg),
                referenceWeightG: String(product.reference_weight_g),
                notebooksPerReference: String(product.notebooks_per_reference),
                stockQuantity: String(product.stock_quantity),
                minOrderQuantity: "1",
                maxOrderQuantity: "20",
                active: product.active,
              })
            }
            onCreate={() => setEditing(blank)}
          />
        )}{" "}
        {tab === "customers" && <CustomersView customers={customers} />}{" "}
        {tab === "email" && <EmailSettingsView />}
      </section>
      {editing && (
        <ProductEditor
          product={editing}
          setProduct={setEditing}
          saving={saving}
          onSave={() => void saveProduct()}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}

function OrdersView({
  orders,
  onStatus,
}: {
  orders: Order[];
  onStatus: (id: string, status: string) => Promise<void>;
}) {
  return (
    <div className="mt-6">
      <div>
        <p className="text-sm font-semibold text-chart-1">OPERATIONS</p>
        <h1 className="mt-1 text-3xl font-bold">Customer orders</h1>
      </div>
      <div className="mt-6 overflow-x-auto border border-border">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Estimate</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-border">
                <td className="p-3 font-semibold">{order.order_number}</td>
                <td className="p-3">
                  {order.profiles?.full_name || "Customer"}
                  <span className="block text-xs text-muted-foreground">
                    {order.profiles?.phone}
                  </span>
                </td>
                <td className="p-3">
                  {formatINR(order.estimated_amount)}
                  <span className="block text-xs text-muted-foreground">
                    {formatWeight(order.estimated_weight_g)}
                  </span>
                </td>
                <td className="p-3 capitalize">
                  {order.payment_status}
                  <span className="block text-xs text-muted-foreground">
                    {order.payment_method || "—"}
                  </span>
                </td>
                <td className="p-3">
                  <select
                    value={order.status}
                    onChange={(event) => void onStatus(order.id, event.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 capitalize"
                  >
                    {[
                      "payment_pending",
                      "placed",
                      "confirmed",
                      "weighing",
                      "packing",
                      "packed",
                      "shipped",
                      "out_for_delivery",
                      "delivered",
                      "cancelled",
                    ].map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && <p className="p-6 text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}
function ProductsView({
  products,
  onEdit,
  onCreate,
}: {
  products: Product[];
  onEdit: (product: Product) => void;
  onCreate: () => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-chart-1">CATALOGUE</p>
          <h1 className="mt-1 text-3xl font-bold">Weight-priced notebooks</h1>
        </div>
        <Button onClick={onCreate}>
          <Plus />
          New notebook
        </Button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article key={product.id} className="border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-chart-1">
                  {product.subject || "Notebook"} · {product.gsm || "—"} GSM
                </p>
                <h2 className="mt-1 font-bold">{product.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {product.brand || "Unbranded"} · {product.stock_quantity} in stock
                </p>
              </div>
              <Button
                aria-label={`Edit ${product.name}`}
                variant="outline"
                size="icon"
                onClick={() => onEdit(product)}
              >
                <Pencil />
              </Button>
            </div>
            <div className="mt-4 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <b>{formatINR(product.price_per_kg)}/kg</b>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Per notebook</span>
                <b>
                  ~
                  {formatWeight(
                    weightPerNotebook({
                      pricePerKg: product.price_per_kg,
                      referenceWeightG: product.reference_weight_g,
                      notebooksPerReference: product.notebooks_per_reference,
                    }),
                  )}
                </b>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
function CustomersView({
  customers,
}: {
  customers: { id: string; full_name: string | null; phone: string | null; created_at: string }[];
}) {
  return (
    <div className="mt-6">
      <p className="text-sm font-semibold text-chart-1">CUSTOMERS</p>
      <h1 className="mt-1 text-3xl font-bold">Customer directory</h1>
      <div className="mt-6 divide-y divide-border border-y border-border">
        {customers.map((customer) => (
          <div key={customer.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <b>{customer.full_name || "Customer"}</b>
              <p className="text-sm text-muted-foreground">{customer.phone || "No phone saved"}</p>
            </div>
            <span className="text-sm text-muted-foreground">
              Joined {new Date(customer.created_at).toLocaleDateString("en-IN")}
            </span>
          </div>
        ))}
        {!customers.length && <p className="py-6 text-muted-foreground">No customers yet.</p>}
      </div>
    </div>
  );
}
function EmailSettingsView() {
  return (
    <div className="mt-6 max-w-3xl">
      <p className="text-sm font-semibold text-chart-1">NOTIFICATIONS</p>
      <h1 className="mt-1 text-3xl font-bold">Email & OTP setup</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
        Checkout sends a six-digit verification code through Resend. No sign-up or confirmation
        links are used.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="border border-border bg-card p-5">
          <div className="flex items-center gap-2 font-bold">
            <MailCheck className="text-chart-1" />
            Sending status
          </div>
          <p className="mt-4 text-sm font-semibold text-destructive">Domain setup required</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A verified Pardewala sending domain is needed before OTPs can reach every shopper.
            Resend test mode only delivers to the account owner.
          </p>
        </section>
        <section className="border border-border bg-card p-5">
          <h2 className="font-bold">What is already connected</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
            <li>
              <b className="text-foreground">Resend gateway:</b> connected securely on the server.
            </li>
            <li>
              <b className="text-foreground">Verification:</b> six-digit codes expire after 10
              minutes.
            </li>
            <li>
              <b className="text-foreground">Duplicate accounts:</b> checkout asks existing
              customers to sign in.
            </li>
          </ul>
        </section>
      </div>
      <section className="mt-4 border border-border bg-secondary p-5">
        <h2 className="font-bold">Finish sending setup</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>
            Use a domain you own, such as <b className="text-foreground">pardewala.in</b>; Gmail
            addresses cannot be verified as bulk senders.
          </li>
          <li>Add the DNS records supplied by Resend at your domain provider.</li>
          <li>Once the domain is verified, set the OTP sender to an address on that domain.</li>
        </ol>
      </section>
    </div>
  );
}
function ProductEditor({
  product,
  setProduct,
  saving,
  onSave,
  onClose,
}: {
  product: typeof blank & { id?: string };
  setProduct: (value: typeof product) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const update = (key: keyof typeof product, value: string | boolean) =>
    setProduct({ ...product, [key]: value });
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-foreground/35 sm:items-center sm:justify-center">
      <section className="max-h-[90vh] w-full overflow-y-auto rounded-t-lg bg-background p-5 shadow-2xl sm:max-w-xl sm:rounded-lg">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-chart-1">CATALOGUE</p>
            <h2 className="text-2xl font-bold">{product.id ? "Edit notebook" : "New notebook"}</h2>
          </div>
          <Button aria-label="Close editor" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["name", "Name"],
              ["subject", "Subject"],
              ["brand", "Brand"],
              ["gsm", "GSM"],
              ["pricePerKg", "Price per KG"],
              ["referenceWeightG", "Reference weight (g)"],
              ["notebooksPerReference", "Notebooks in reference"],
              ["stockQuantity", "Stock"],
              ["minOrderQuantity", "Minimum quantity"],
              ["maxOrderQuantity", "Maximum quantity"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className={key === "name" ? "sm:col-span-2" : ""}>
              <span className="mb-1 block text-sm font-medium">{label}</span>
              <input
                value={product[key] as string}
                onChange={(event) => update(key, event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={product.active}
              onChange={(event) => update("active", event.target.checked)}
            />
            Available to shoppers
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save notebook"}
          </Button>
        </div>
      </section>
    </div>
  );
}
