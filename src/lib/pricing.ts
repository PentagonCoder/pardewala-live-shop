export type WeightPricedProduct = {
  pricePerKg: number;
  referenceWeightG: number;
  notebooksPerReference: number;
  priceOverrides?: Record<number, number>;
};

export function weightPerNotebook(product: WeightPricedProduct) {
  return product.referenceWeightG / product.notebooksPerReference;
}

export function estimateForQuantity(product: WeightPricedProduct, quantity: number) {
  const estimatedWeightG = weightPerNotebook(product) * quantity;
  const automaticAmount = (product.pricePerKg * estimatedWeightG) / 1000;
  const overrideAmount = product.priceOverrides?.[quantity];
  return {
    quantity,
    estimatedWeightG,
    estimatedAmount: overrideAmount ?? automaticAmount,
    hasCustomPrice: overrideAmount !== undefined,
  };
}

export function formatWeight(weightG: number) {
  if (weightG >= 1000) return `${(weightG / 1000).toFixed(weightG % 1000 === 0 ? 0 : 2)} kg`;
  return `${weightG.toFixed(weightG % 1 === 0 ? 0 : 2)} g`;
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}
