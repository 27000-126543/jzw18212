import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Store, Product, StoreProduct, Order, TransferRequest, Notice, SalesData, User, PageType } from '../types';
import { mockStores, mockProducts, mockOrders, mockTransfers, mockNotifications, mockSalesData, generateStoreProducts } from '../data/mockData';

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
  | { type: 'MARK_NOTIFICATION_READ'; payload: { notificationId: string; storeId: string } };

const initialStoreProducts = generateStoreProducts(mockStores, mockProducts);

const initialState: AppState = {
  currentPage: null,
  currentUser: null,
  currentStoreId: null,
  stores: mockStores,
  products: mockProducts,
  storeProducts: initialStoreProducts,
  orders: mockOrders,
  transfers: mockTransfers,
  notifications: mockNotifications,
  salesData: mockSalesData,
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
      if (newStore.status === 'approved') {
        const newProducts = state.products.map(p => ({
          storeId: newStore.id,
          productId: p.id,
          stock: 50,
          discountPrice: null,
          discountEnabled: false,
        }));
        storeProducts = [...storeProducts, ...newProducts];
      }
      return { ...state, stores: [...state.stores, newStore], storeProducts };
    }
    case 'UPDATE_STORE_STATUS': {
      const stores = state.stores.map(s =>
        s.id === action.payload.id ? { ...s, status: action.payload.status } : s
      );
      let storeProducts = [...state.storeProducts];
      if (action.payload.status === 'approved') {
        const store = state.stores.find(s => s.id === action.payload.id);
        if (store) {
          const newProducts = state.products.map(p => ({
            storeId: store.id,
            productId: p.id,
            stock: 50,
            discountPrice: null,
            discountEnabled: false,
          }));
          storeProducts = [...storeProducts, ...newProducts];
        }
      }
      return { ...state, stores, storeProducts };
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
      const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
      const transfer = state.transfers.find(t => t.id === action.payload.id);
      let updatedTransfer: Partial<TransferRequest> = { status: action.payload.status };

      if (action.payload.status === 'approved' && transfer) {
        updatedTransfer.approvedAt = now;
        if (transfer.type === 'to-hq') {
          storeProducts = storeProducts.map(sp =>
            sp.storeId === transfer.fromStoreId && sp.productId === transfer.productId
              ? { ...sp, stock: sp.stock + transfer.quantity }
              : sp
          );
        } else if (transfer.type === 'to-store') {
          storeProducts = storeProducts.map(sp => {
            if (sp.storeId === transfer.fromStoreId && sp.productId === transfer.productId) {
              return { ...sp, stock: Math.max(0, sp.stock - transfer.quantity) };
            }
            if (sp.storeId === transfer.toStoreId && sp.productId === transfer.productId) {
              return { ...sp, stock: sp.stock + transfer.quantity };
            }
            return sp;
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
  return (
    <AppContext.Provider value={{ state, dispatch }}>
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
