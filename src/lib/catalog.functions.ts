import { supabase } from '@/integrations/supabase/client';

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  brand: string | null;
  gsm: number | null;
  paperType: string | null;
  notebookSize: string | null;
  rulingType: string | null;
  pricePerKg: number;
  referenceWeightG: number;
  notebooksPerReference: number;
  stockQuantity: number;
  minOrderQuantity: number;
  maxOrderQuantity: number;
  imageUrl: string | null;
  priceOverrides: Record<number, number>;
  relatedProductIds: string[];
};

export async function listCatalogProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,description,subject,brand,gsm,paper_type,notebook_size,ruling_type,price_per_kg,reference_weight_g,notebooks_per_reference,stock_quantity,min_order_quantity,max_order_quantity,product_images(image_url,sort_order),quantity_price_overrides(notebook_quantity,custom_price),related_products!related_products_product_id_fkey(related_product_id,sort_order)')
    .eq('active', true)
    .order('name');

  if (error) throw new Error('Catalogue is temporarily unavailable.');

  return (data ?? []).map((product): CatalogProduct => ({
    id: product.id,
    name: product.name,
    description: product.description,
    subject: product.subject,
    brand: product.brand,
    gsm: product.gsm,
    paperType: product.paper_type,
    notebookSize: product.notebook_size,
    rulingType: product.ruling_type,
    pricePerKg: Number(product.price_per_kg),
    referenceWeightG: Number(product.reference_weight_g),
    notebooksPerReference: Number(product.notebooks_per_reference),
    stockQuantity: product.stock_quantity,
    minOrderQuantity: product.min_order_quantity,
    maxOrderQuantity: product.max_order_quantity,
    imageUrl: [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url ?? null,
    priceOverrides: Object.fromEntries(product.quantity_price_overrides.map((item) => [item.notebook_quantity, Number(item.custom_price)])),
    relatedProductIds: product.related_products
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => item.related_product_id),
  }));
}
