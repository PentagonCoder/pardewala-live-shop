import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getNotebookRecommendations } from './ai-gateway.server';
import { listCatalogProducts } from './catalog.functions';

const recommendationInput = z.object({ needs: z.string().trim().min(8).max(600) });

export const recommendNotebooks = createServerFn({ method: 'POST' })
  .validator(recommendationInput)
  .handler(async ({ data }) => {
    const products = await listCatalogProducts();
    const catalogue = JSON.stringify(products.map((product) => ({
      id: product.id,
      name: product.name,
      subject: product.subject,
      brand: product.brand,
      gsm: product.gsm,
      paperType: product.paperType,
      rulingType: product.rulingType,
      pricePerKg: product.pricePerKg,
      stockQuantity: product.stockQuantity,
    })));
    const raw = await getNotebookRecommendations(data.needs, catalogue);
    try {
      const parsed = JSON.parse(raw) as { ids?: unknown; note?: unknown };
      const validIds = Array.isArray(parsed.ids)
        ? parsed.ids.filter((id): id is string => typeof id === 'string' && products.some((product) => product.id === id)).slice(0, 3)
        : [];
      return { ids: validIds, note: typeof parsed.note === 'string' ? parsed.note.slice(0, 280) : 'Here are the closest options from the catalogue.' };
    } catch {
      throw new Error('The notebook finder could not prepare recommendations. Please try again.');
    }
  });