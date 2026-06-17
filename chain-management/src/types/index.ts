export interface Store {
  id: string;
  name: string;
  address: string;
  region: string;
  businessHours: string;
  manager: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  description: string;
  image: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface StoreProduct {
  storeId: string;
  productId: string;
  stock: number;
  discountPrice: number | null;
  discountEnabled: boolean;
}

export interface Order {
  id: string;
  storeId: string;
  items: OrderItem[];
  totalAmount: number;
  customerPhone?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface TransferRequest {
  id: string;
  fromStoreId: string;
  toStoreId: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  type: 'to-hq' | 'to-store';
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  targetType: 'all' | 'specific';
  targetStoreIds: string[];
  createdAt: string;
  readBy: string[];
}

export interface SalesData {
  date: string;
  storeId: string;
  storeName: string;
  salesAmount: number;
  orderCount: number;
  customerCount: number;
}

export interface User {
  id: string;
  name: string;
  role: 'hq' | 'store';
  storeId?: string;
}

export type PageType = 'hq' | 'store';
