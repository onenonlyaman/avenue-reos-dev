import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export interface ApiResponseEnvelope<T> {
  success: boolean;
  status_code: number;
  timestamp: string;
  request_id: string;
  data: T | null;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
  meta?: {
    page?: number;
    limit?: number;
    total_records?: number;
  } | null;
}

export interface PurchaseOrder {
  id: string;
  orderReference: string;
  siteName: string;
  vendorName: string;
  materialDescription: string;
  orderValueLakhs: number;
  deliveryDueDate: string;
  requiresHitl: boolean;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "DISPATCHED";
  quantity: number;
  unitRate: number;
  freightAmount: number;
  gstAmount: number;
}

export interface GoodsReceiptNote {
  id: string;
  grnReference: string;
  orderReference: string;
  warehouseName: string;
  vendorName: string;
  materialName: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unitOfMeasure: string;
  inspectionStatus: "ACCEPTED" | "REJECTED" | "PARTIALLY_ACCEPTED";
  gatepassNumber: string;
  receivedDate: string;
}

export interface InventoryItem {
  id: string;
  category: string;
  itemDescription: string;
  storageLocation: string;
  availableQuantity: number;
  unitOfMeasure: string;
  reorderLevel: number;
  stockValuationLakhs: number;
  unitCost: number;
  status: "Optimal" | "Reorder Required" | "Out of Stock";
}

export interface VendorPerformance {
  id: string;
  companyName: string;
  specialty: string;
  gstinReference: string;
  performanceRating: number;
  activeOrderCount: number;
  status: "ACTIVE" | "PENDING_REVIEW" | "SUSPENDED";
}

export interface CreatePoPayload {
  siteName: string;
  vendorName: string;
  materialDescription: string;
  quantity: number;
  unitRate: number;
  freightAmount: number;
  deliveryDueDate: string;
}

export interface CreateGrnPayload {
  orderReference: string;
  warehouseName: string;
  vendorName: string;
  materialName: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unitOfMeasure: string;
  gatepassNumber: string;
}

const API_BASE = "/api/v1/procurement";

async function fetchEnvelope<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    "X-Tenant-ID": ACTIVE_TENANT_ID,
    "X-Request-ID": `req-${Date.now()}`,
    ...(options?.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const envelope: ApiResponseEnvelope<T> = await response.json();

  if (!envelope.success || envelope.error) {
    throw new Error(envelope.error?.message || `Request failed with status ${envelope.status_code}`);
  }

  if (envelope.data === null || envelope.data === undefined) {
    throw new Error("No record was returned");
  }

  return envelope.data;
}

export const procurementApi = {
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return fetchEnvelope<PurchaseOrder[]>(`${API_BASE}/orders`);
  },

  async createPurchaseOrder(payload: CreatePoPayload): Promise<PurchaseOrder> {
    return fetchEnvelope<PurchaseOrder>(`${API_BASE}/orders`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getGoodsReceiptNotes(): Promise<GoodsReceiptNote[]> {
    return fetchEnvelope<GoodsReceiptNote[]>(`${API_BASE}/grn`);
  },

  async createGoodsReceiptNote(payload: CreateGrnPayload): Promise<GoodsReceiptNote> {
    return fetchEnvelope<GoodsReceiptNote>(`${API_BASE}/grn`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getInventory(): Promise<InventoryItem[]> {
    return fetchEnvelope<InventoryItem[]>(`${API_BASE}/inventory`);
  },

  async getVendors(): Promise<VendorPerformance[]> {
    return fetchEnvelope<VendorPerformance[]>(`${API_BASE}/vendors`);
  },

  async getPendingApprovals(): Promise<PurchaseOrder[]> {
    return fetchEnvelope<PurchaseOrder[]>(`${API_BASE}/approvals`);
  },

  async authorizePurchaseOrder(id: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/authorize`, {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  },

  async rejectPurchaseOrder(id: string, reason: string): Promise<{ success: boolean; id: string }> {
    return fetchEnvelope<{ success: boolean; id: string }>(`${API_BASE}/approvals/reject`, {
      method: "POST",
      body: JSON.stringify({ id, reason }),
    });
  },
};
