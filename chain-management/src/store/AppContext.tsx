import React, { createContext, useContext, useReducer, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Store, Product, StoreProduct, Order, TransferRequest, Notice, SalesData, User, PageType, InventoryLog } from '../types';
import { mockStores, mockProducts, mockOrders, mockTransfers, mockNotifications, mockSalesData, generateStoreProducts, generateInventoryLogs } from '../data/mockData';

interface AppState {
  currentPage: PageType | null;
  currentUser: User | null;
  currentStoreId: string | null;
  stores: Store[];
  products: Product[];
  storeProducts: StoreProduct[];
  orders: Order[];
  transfers: TransferRequest[];
  notifications: Notice[];
  salesData: SalesData[];
  inventoryLogs: InventoryLog[];
}

type Action =
  | { type: 'SET_PAGE'; payload: PageType | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_CURRENT_STORE'; payload: string | null }
  | { type: 'ADD_STORE'; payload: Store }
  | { type: 'UPDATE_STORE_STATUS'; payload: { id: string; status: Store['status'] } }
  | { type: 'UPDATE_STORE'; payload: Store }
  | { type: 'DELETE_STORE'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'UPDATE_STORE_PRODUCT'; payload: StoreProduct }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'ADD_TRANSFER'; payload: TransferRequest }
  | { type: 'UPDATE_TRANSFER_STATUS'; payload: { id: string; status: TransferRequest['status'] } }
  | { type: 'ADD_NOTIFICATION'; payload: Notice }
  | { type: 'MARK_NOTIFICATION_READ'; payload: { notificationId: string; storeId: string } }
  | { type: 'ADD_INVENTORY_LOG'; payload: InventoryLog };

const initialStoreProducts = generateStoreProducts(mockStores, mockProducts);

type ProcessedInitData = {
  storeProducts: StoreProduct[];
  transfers: TransferRequest[];
  inventoryLogs: InventoryLog[];
};

const processInitialTransfers = (): ProcessedInitData => {
  let storeProducts = [...initialStoreProducts.map(sp => ({ ...sp }))];
  let inventoryLogs: InventoryLog[] = generateInventoryLogs(mockStores, mockProducts, initialStoreProducts);
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');

  const transfers = mockTransfers.map(t => {
    if (t.status === 'approved' || t.status === 'completed') {
      if (t.type === 'to-hq') {
        storeProducts = storeProducts.map(sp => {
          if (sp.storeId === t.fromStoreId && sp.productId === t.productId) {
            const before = sp.stock;
            const after = sp.stock + t.quantity;
            inventoryLogs.unshift({
              id: `log-init-${t.id}`,
              storeId: t.fromStoreId,
              productId: t.productId,
              productName: t.productName,
              type: 'hq-replenish',
              quantity: t.quantity,
              beforeStock: before,
              afterStock: after,
              relatedId: t.id,
              remark: '历史调拨入库',
              createdAt: t.createdAt,
            });
            return { ...sp, stock: after };
          }
          return sp;
        });
      } else if (t.type === 'to-store') {
        storeProducts = storeProducts.map(sp => {
          if (sp.storeId === t.fromStoreId && sp.productId === t.productId) {
            const before = sp.stock;
            const after = Math.max(0, sp.stock - t.quantity);
            inventoryLogs.unshift({
              id: `log-init-out-${t.id}`,
              storeId: t.fromStoreId,
              productId: t.productId,
              productName: t.productName,
              type: 'transfer-out',
              quantity: t.quantity,
              beforeStock: before,
              afterStock: after,
              relatedId: t.id,
              remark: '历史调拨出库',
              createdAt: t.createdAt,
            });
            return { ...sp, stock: after };
          }
          if (sp.storeId === t.toStoreId && sp.productId === t.productId) {
            const before = sp.stock;
            const after = sp.stock + t.quantity;
            inventoryLogs.unshift({
              id: `log-init-in-${t.id}`,
              storeId: t.toStoreId,
              productId: t.productId,
              productName: t.productName,
              type: 'transfer-in',
              quantity: t.quantity,
              beforeStock: before,
              afterStock: after,
              relatedId: t.id,
              remark: '历史调拨入库',
              createdAt: t.createdAt,
            });
            return { ...sp, stock: after };
          }
          return sp;
        });
      }
      return {
        ...t,
        status: 'completed' as const,
        approvedAt: t.approvedAt || t.createdAt || now,
        completedAt: t.completedAt || t.createdAt || now,
      };
    }
    return t;
  });

  return { storeProducts, transfers, inventoryLogs };
};

const initialData = processInitialTransfers();

const initialState: AppState = {
  currentPage: null,
  currentUser: null,
  currentStoreId: null,
  stores: mockStores,
  products: mockProducts,
  storeProducts: initialData.storeProducts,
  orders: mockOrders,
  transfers: initialData.transfers,
  notifications: mockNotifications,
  salesData: mockSalesData,
  inventoryLogs: initialData.inventoryLogs,
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_CURRENT_STORE':
      return { ...state, currentStoreId: action.payload };
    case 'ADD_STORE': {
      const newStore = action.payload;
      let storeProducts = [...state.storeProducts];
      let inventoryLogs = [...state.inventoryLogs];
      if (newStore.status === 'approved') {
        const newProducts = state.products.map((p, idx) => {
          const sp = {
            storeId: newStore.id,
            productId: p.id,
            stock: 50,
            discountPrice: null,
            discountEnabled: false,
          };
          inventoryLogs.unshift({
            id: `log-${Date.now()}-${idx}`,
            storeId: newStore.id,
            productId: p.id,
            productName: p.name,
            type: 'hq-replenish',
            quantity: 50,
            beforeStock: 0,
            afterStock: 50,
            remark: '新门店初始铺货',
            createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
          });
          return sp;
        });
        storeProducts = [...storeProducts, ...newProducts];
      }
      return { ...state, stores: [...state.stores, newStore], storeProducts, inventoryLogs };
    }
    case 'UPDATE_STORE_STATUS': {
      const stores = state.stores.map(s =>
        s.id === action.payload.id ? { ...s, status: action.payload.status } : s
      );
      let storeProducts = [...state.storeProducts];
      let inventoryLogs = [...state.inventoryLogs];
      if (action.payload.status === 'approved') {
        const store = state.stores.find(s => s.id === action.payload.id);
        if (store) {
          const newProducts = state.products.map((p, idx) => {
            const sp = {
              storeId: store.id,
              productId: p.id,
              stock: 50,
              discountPrice: null,
              discountEnabled: false,
            };
            inventoryLogs.unshift({
              id: `log-${Date.now()}-${idx}`,
              storeId: store.id,
              productId: p.id,
              productName: p.name,
              type: 'hq-replenish',
              quantity: 50,
              beforeStock: 0,
              afterStock: 50,
              remark: '加盟审核通过，初始铺货',
              createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
            });
            return sp;
          });
          storeProducts = [...storeProducts, ...newProducts];
        }
      }
      return { ...state, stores, storeProducts, inventoryLogs };
    }
    case 'UPDATE_STORE':
      return {
        ...state,
        stores: state.stores.map(s => s.id === action.payload.id ? action.payload : s),
      };
    case 'DELETE_STORE':
      return {
        ...state,
        stores: state.stores.filter(s => s.id !== action.payload),
        storeProducts: state.storeProducts.filter(sp => sp.storeId !== action.payload),
        orders: state.orders.filter(o => o.storeId !== action.payload),
        transfers: state.transfers.filter(t => t.fromStoreId !== action.payload && t.toStoreId !== action.payload),
        salesData: state.salesData.filter(d => d.storeId !== action.payload),
        inventoryLogs: state.inventoryLogs.filter(l => l.storeId !== action.payload),
        notifications: state.notifications.map(n => ({
          ...n,
          targetStoreIds: n.targetStoreIds.filter(id => id !== action.payload),
          readBy: n.readBy.filter(id => id !== action.payload),
        })),
      };
    case 'ADD_PRODUCT': {
      const newProduct = action.payload;
      const approvedStores = state.stores.filter(s => s.status === 'approved');
      const newStoreProducts = approvedStores.map(s => ({
        storeId: s.id,
        productId: newProduct.id,
        stock: 50,
        discountPrice: null,
        discountEnabled: false,
      }));
      return {
        ...state,
        products: [...state.products, newProduct],
        storeProducts: [...state.storeProducts, ...newStoreProducts],
      };
    }
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => p.id === action.payload.id ? action.payload : p),
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload),
        storeProducts: state.storeProducts.filter(sp => sp.productId !== action.payload),
      };
    case 'UPDATE_STORE_PRODUCT': {
      const exists = state.storeProducts.find(
        sp => sp.storeId === action.payload.storeId && sp.productId === action.payload.productId
      );
      if (exists) {
        return {
          ...state,
          storeProducts: state.storeProducts.map(sp =>
            sp.storeId === action.payload.storeId && sp.productId === action.payload.productId
              ? action.payload
              : sp
          ),
        };
      }
      return {
        ...state,
        storeProducts: [...state.storeProducts, action.payload],
      };
    }
    case 'ADD_ORDER':
      return { ...state, orders: [action.payload, ...state.orders] };
    case 'ADD_TRANSFER':
      return { ...state, transfers: [action.payload, ...state.transfers] };
    case 'UPDATE_TRANSFER_STATUS': {
      let storeProducts = [...state.storeProducts];
      let inventoryLogs = [...state.inventoryLogs];
      const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
      const transfer = state.transfers.find(t => t.id === action.payload.id);
      let updatedTransfer: Partial<TransferRequest> = { status: action.payload.status };

      if (action.payload.status === 'approved' && transfer) {
        updatedTransfer.approvedAt = now;
        if (transfer.type === 'to-hq') {
          const sp = storeProducts.find(p => p.storeId === transfer.fromStoreId && p.productId === transfer.productId);
          const beforeStock = sp?.stock || 0;
          storeProducts = storeProducts.map(sp =>
            sp.storeId === transfer.fromStoreId && sp.productId === transfer.productId
              ? { ...sp, stock: sp.stock + transfer.quantity }
              : sp
          );
          inventoryLogs.unshift({
            id: `log-${Date.now()}`,
            storeId: transfer.fromStoreId,
            productId: transfer.productId,
            productName: transfer.productName,
            type: 'hq-replenish',
            quantity: transfer.quantity,
            beforeStock,
            afterStock: beforeStock + transfer.quantity,
            relatedId: transfer.id,
            remark: '总部补货入库',
            createdAt: now,
          });
        } else if (transfer.type === 'to-store') {
          const fromSp = storeProducts.find(p => p.storeId === transfer.fromStoreId && p.productId === transfer.productId);
          const beforeStockFrom = fromSp?.stock || 0;
          const toSp = storeProducts.find(p => p.storeId === transfer.toStoreId && p.productId === transfer.productId);
          const beforeStockTo = toSp?.stock || 0;
          storeProducts = storeProducts.map(sp => {
            if (sp.storeId === transfer.fromStoreId && sp.productId === transfer.productId) {
              return { ...sp, stock: Math.max(0, sp.stock - transfer.quantity) };
            }
            if (sp.storeId === transfer.toStoreId && sp.productId === transfer.productId) {
              return { ...sp, stock: sp.stock + transfer.quantity };
            }
            return sp;
          });
          inventoryLogs.unshift({
            id: `log-${Date.now()}-out`,
            storeId: transfer.fromStoreId,
            productId: transfer.productId,
            productName: transfer.productName,
            type: 'transfer-out',
            quantity: transfer.quantity,
            beforeStock: beforeStockFrom,
            afterStock: Math.max(0, beforeStockFrom - transfer.quantity),
            relatedId: transfer.id,
            remark: `调拨出库至 ${state.stores.find(s => s.id === transfer.toStoreId)?.name || ''}`,
            createdAt: now,
          });
          inventoryLogs.unshift({
            id: `log-${Date.now()}-in`,
            storeId: transfer.toStoreId,
            productId: transfer.productId,
            productName: transfer.productName,
            type: 'transfer-in',
            quantity: transfer.quantity,
            beforeStock: beforeStockTo,
            afterStock: beforeStockTo + transfer.quantity,
            relatedId: transfer.id,
            remark: `调拨入库自 ${state.stores.find(s => s.id === transfer.fromStoreId)?.name || ''}`,
            createdAt: now,
          });
        }
        updatedTransfer.status = 'completed';
        updatedTransfer.completedAt = now;
      } else if (action.payload.status === 'rejected') {
        updatedTransfer.approvedAt = now;
      }
      return {
        ...state,
        transfers: state.transfers.map(t =>
          t.id === action.payload.id ? { ...t, ...updatedTransfer } : t
        ),
        storeProducts,
        inventoryLogs,
      };
    }
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload.notificationId && !n.readBy.includes(action.payload.storeId)
            ? { ...n, readBy: [...n.readBy, action.payload.storeId] }
            : n
        ),
      };
    case 'ADD_INVENTORY_LOG':
      return { ...state, inventoryLogs: [action.payload, ...state.inventoryLogs] };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
