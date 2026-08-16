export interface StockBatch {
  batchNumber: string;
  quantity: number;
  unitCost: number;
  mfgDate?: string;
  expiryDate?: string;
  godownId: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  itemName: string;
  uom: string;
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  valuationMethod: "WEIGHTED_AVG" | "FIFO" | "LIFO" | "STANDARD_COST" | "LAST_PURCHASE";
  standardRate: number;
  batches?: StockBatch[];
}

export interface BomRecipe {
  id: string;
  bomName: string;
  finishedItemId: string;
  yieldQuantity: number;
  components: {
    componentItemId: string;
    quantity: number;
    scrapRatePct: number;
  }[];
}

/**
 * Calculates Weighted Average Cost for a series of inbound batches
 * Formula: V_avg = Sum(Q_i * P_i) / Sum(Q_i)
 */
export function calculateWeightedAverageCost(batches: { quantity: number; unitPrice: number }[]): number {
  if (!batches || batches.length === 0) return 0;

  let totalQty = 0;
  let totalCost = 0;

  for (const b of batches) {
    const q = Number(b.quantity) || 0;
    const p = Number(b.unitPrice) || 0;
    if (q > 0 && p >= 0) {
      totalQty += q;
      totalCost += q * p;
    }
  }

  if (totalQty === 0) return 0;
  return Math.round((totalCost / totalQty) * 100) / 100;
}

/**
 * Calculates stock valuation using FIFO consumption against active batches
 */
export function calculateFifoStockValuation(batches: StockBatch[]): {
  totalQuantity: number;
  totalValue: number;
  effectiveAverageRate: number;
} {
  if (!batches || batches.length === 0) {
    return { totalQuantity: 0, totalValue: 0, effectiveAverageRate: 0 };
  }

  let totalQty = 0;
  let totalVal = 0;

  for (const b of batches) {
    const q = Number(b.quantity) || 0;
    const c = Number(b.unitCost) || 0;
    if (q > 0) {
      totalQty += q;
      totalVal += q * c;
    }
  }

  const avgRate = totalQty > 0 ? totalVal / totalQty : 0;

  return {
    totalQuantity: totalQty,
    totalValue: Math.round(totalVal * 100) / 100,
    effectiveAverageRate: Math.round(avgRate * 100) / 100,
  };
}

/**
 * Validates Bill of Materials requirements for a planned manufacturing run
 */
export function explodeBomRequirements(
  bom: BomRecipe,
  targetProductionQty: number,
  currentStockMap: Record<string, number>
) {
  const multiplier = targetProductionQty / bom.yieldQuantity;
  const componentRequirements = bom.components.map((c) => {
    const grossQtyNeeded = c.quantity * multiplier * (1 + (c.scrapRatePct || 0) / 100);
    const available = currentStockMap[c.componentItemId] || 0;
    const shortfall = Math.max(0, grossQtyNeeded - available);

    return {
      componentItemId: c.componentItemId,
      unitQuantity: c.quantity,
      scrapRatePct: c.scrapRatePct,
      grossQtyNeeded: Math.round(grossQtyNeeded * 100) / 100,
      availableStock: available,
      isSufficient: available >= grossQtyNeeded,
      shortfall: Math.round(shortfall * 100) / 100,
    };
  });

  const canProduce = componentRequirements.every((c) => c.isSufficient);

  return {
    bomId: bom.id,
    bomName: bom.bomName,
    targetProductionQty,
    canProduce,
    components: componentRequirements,
  };
}
