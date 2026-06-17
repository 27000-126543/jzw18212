import type { Store, Product, StoreProduct, Order, TransferRequest, Notice, SalesData, InventoryLog } from '../types';
import dayjs from 'dayjs';

export const mockStores: Store[] = [
  {
    id: 'store-001',
    name: '华东旗舰店',
    address: '上海市浦东新区世纪大道100号',
    region: '华东区',
    businessHours: '09:00 - 22:00',
    manager: '张伟',
    phone: '13800138001',
    status: 'approved',
    createdAt: '2025-01-15',
  },
  {
    id: 'store-002',
    name: '华北中心店',
    address: '北京市朝阳区建国路88号',
    region: '华北区',
    businessHours: '10:00 - 21:00',
    manager: '李娜',
    phone: '13800138002',
    status: 'approved',
    createdAt: '2025-02-20',
  },
  {
    id: 'store-003',
    name: '华南体验店',
    address: '广州市天河区体育西路191号',
    region: '华南区',
    businessHours: '09:30 - 22:30',
    manager: '王强',
    phone: '13800138003',
    status: 'approved',
    createdAt: '2025-03-10',
  },
  {
    id: 'store-004',
    name: '西南分店',
    address: '成都市锦江区春熙路1号',
    region: '西南区',
    businessHours: '10:00 - 22:00',
    manager: '陈静',
    phone: '13800138004',
    status: 'approved',
    createdAt: '2025-04-05',
  },
  {
    id: 'store-005',
    name: '华中加盟店',
    address: '武汉市江汉区解放大道128号',
    region: '华中区',
    businessHours: '09:00 - 21:30',
    manager: '刘洋',
    phone: '13800138005',
    status: 'pending',
    createdAt: '2025-06-10',
  },
  {
    id: 'store-006',
    name: '东北分店',
    address: '沈阳市和平区中山路200号',
    region: '东北区',
    businessHours: '09:30 - 21:00',
    manager: '赵明',
    phone: '13800138006',
    status: 'pending',
    createdAt: '2025-06-15',
  },
];

export const mockProducts: Product[] = [
  {
    id: 'prod-001',
    name: '经典拿铁咖啡',
    category: '饮品',
    basePrice: 28,
    description: '浓郁意式浓缩搭配丝滑牛奶',
    image: '☕',
    status: 'active',
    createdAt: '2025-01-01',
  },
  {
    id: 'prod-002',
    name: '美式咖啡',
    category: '饮品',
    basePrice: 22,
    description: '纯正美式风味，醇厚香浓',
    image: '☕',
    status: 'active',
    createdAt: '2025-01-01',
  },
  {
    id: 'prod-003',
    name: '抹茶拿铁',
    category: '饮品',
    basePrice: 32,
    description: '宇治抹茶搭配香醇牛奶',
    image: '🍵',
    status: 'active',
    createdAt: '2025-01-15',
  },
  {
    id: 'prod-004',
    name: '巧克力熔岩蛋糕',
    category: '甜点',
    basePrice: 38,
    description: '外酥内软，流心巧克力',
    image: '🍰',
    status: 'active',
    createdAt: '2025-02-01',
  },
  {
    id: 'prod-005',
    name: '提拉米苏',
    category: '甜点',
    basePrice: 35,
    description: '意式经典甜品，咖啡酒香',
    image: '🍮',
    status: 'active',
    createdAt: '2025-02-10',
  },
  {
    id: 'prod-006',
    name: '三明治套餐',
    category: '轻食',
    basePrice: 42,
    description: '全麦三明治配蔬菜沙拉',
    image: '🥪',
    status: 'active',
    createdAt: '2025-03-01',
  },
  {
    id: 'prod-007',
    name: '水果沙拉',
    category: '轻食',
    basePrice: 28,
    description: '新鲜时令水果拼盘',
    image: '🥗',
    status: 'active',
    createdAt: '2025-03-15',
  },
  {
    id: 'prod-008',
    name: '冰焦糖玛奇朵',
    category: '饮品',
    basePrice: 30,
    description: '冰爽焦糖与浓缩咖啡的完美结合',
    image: '🧊',
    status: 'active',
    createdAt: '2025-04-01',
  },
];

export const generateStoreProducts = (stores: Store[], products: Product[]): StoreProduct[] => {
  const result: StoreProduct[] = [];
  const approvedStores = stores.filter(s => s.status === 'approved');
  approvedStores.forEach(store => {
    products.forEach(product => {
      result.push({
        storeId: store.id,
        productId: product.id,
        stock: Math.floor(Math.random() * 100) + 20,
        discountPrice: Math.random() > 0.5 ? Math.round(product.basePrice * 0.85 * 100) / 100 : null,
        discountEnabled: Math.random() > 0.6,
      });
    });
  });
  return result;
};

const generateOrders = (): Order[] => {
  const orders: Order[] = [];
  const approvedStores = mockStores.filter(s => s.status === 'approved');
  const statuses: Order['status'][] = ['completed', 'completed', 'completed', 'pending', 'cancelled'];
  
  for (let i = 0; i < 200; i++) {
    const store = approvedStores[Math.floor(Math.random() * approvedStores.length)];
    const numItems = Math.floor(Math.random() * 4) + 1;
    const items: Order['items'] = [];
    let totalAmount = 0;
    
    for (let j = 0; j < numItems; j++) {
      const product = mockProducts[Math.floor(Math.random() * mockProducts.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const price = product.basePrice * (Math.random() > 0.3 ? 1 : 0.85);
      items.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: Math.round(price * 100) / 100,
      });
      totalAmount += quantity * price;
    }
    
    const daysAgo = Math.floor(Math.random() * 60);
    const date = dayjs().subtract(daysAgo, 'day').format('YYYY-MM-DD HH:mm:ss');
    
    orders.push({
      id: `order-${String(i + 1).padStart(4, '0')}`,
      storeId: store.id,
      items,
      totalAmount: Math.round(totalAmount * 100) / 100,
      customerPhone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: date,
    });
  }
  
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const mockOrders = generateOrders();

export const mockTransfers: TransferRequest[] = [
  {
    id: 'transfer-001',
    fromStoreId: 'store-001',
    toStoreId: 'hq',
    productId: 'prod-001',
    productName: '经典拿铁咖啡',
    quantity: 50,
    status: 'pending',
    type: 'to-hq',
    createdAt: '2025-06-15 10:30:00',
  },
  {
    id: 'transfer-002',
    fromStoreId: 'store-002',
    toStoreId: 'store-001',
    productId: 'prod-004',
    productName: '巧克力熔岩蛋糕',
    quantity: 30,
    status: 'approved',
    type: 'to-store',
    createdAt: '2025-06-14 14:20:00',
    approvedAt: '2025-06-14 16:00:00',
  },
  {
    id: 'transfer-003',
    fromStoreId: 'store-003',
    toStoreId: 'hq',
    productId: 'prod-003',
    productName: '抹茶拿铁',
    quantity: 100,
    status: 'completed',
    type: 'to-hq',
    createdAt: '2025-06-10 09:00:00',
    approvedAt: '2025-06-10 11:30:00',
  },
  {
    id: 'transfer-004',
    fromStoreId: 'store-004',
    toStoreId: 'store-003',
    productId: 'prod-006',
    productName: '三明治套餐',
    quantity: 25,
    status: 'rejected',
    type: 'to-store',
    createdAt: '2025-06-12 11:15:00',
  },
];

export const mockNotifications: Notice[] = [
  {
    id: 'notif-001',
    title: '端午节促销活动通知',
    content: '各门店请注意：端午节期间（6月22日-6月24日），全场饮品第二杯半价。请各门店做好物料准备和人员安排。',
    targetType: 'all',
    targetStoreIds: [],
    createdAt: '2025-06-18 09:00:00',
    readBy: ['store-001', 'store-002'],
  },
  {
    id: 'notif-002',
    title: '新品上市：冰椰拿铁',
    content: '新品冰椰拿铁将于7月1日全线上线，总部将于6月25日前完成所有门店物料配送。',
    targetType: 'all',
    targetStoreIds: [],
    createdAt: '2025-06-16 14:30:00',
    readBy: ['store-001', 'store-003', 'store-004'],
  },
  {
    id: 'notif-003',
    title: '华东区门店运营培训',
    content: '华东区各门店负责人请于6月25日到上海总部参加季度运营培训，为期一天。',
    targetType: 'specific',
    targetStoreIds: ['store-001'],
    createdAt: '2025-06-15 16:00:00',
    readBy: ['store-001'],
  },
];

export const generateSalesData = (): SalesData[] => {
  const data: SalesData[] = [];
  const approvedStores = mockStores.filter(s => s.status === 'approved');
  
  for (let i = 29; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    approvedStores.forEach(store => {
      const baseSales = store.id === 'store-001' ? 15000 : 
                        store.id === 'store-002' ? 12000 :
                        store.id === 'store-003' ? 10000 : 8000;
      const variation = (Math.random() - 0.3) * 0.3;
      const salesAmount = Math.round(baseSales * (1 + variation));
      const orderCount = Math.floor(salesAmount / 35);
      const customerCount = Math.floor(orderCount * 1.1);
      
      data.push({
        date,
        storeId: store.id,
        storeName: store.name,
        salesAmount,
        orderCount,
        customerCount,
      });
    });
  }
  
  return data;
};

export const mockSalesData = generateSalesData();

export const generateInventoryLogs = (stores: Store[], products: Product[], storeProducts: StoreProduct[]): InventoryLog[] => {
  const logs: InventoryLog[] = [];
  const approvedStores = stores.filter(s => s.status === 'approved');
  let logId = 1;

  approvedStores.forEach(store => {
    products.forEach(product => {
      const sp = storeProducts.find(p => p.storeId === store.id && p.productId === product.id);
      if (!sp) return;
      
      let currentStock = 100;
      logs.push({
        id: `log-${String(logId++).padStart(5, '0')}`,
        storeId: store.id,
        productId: product.id,
        productName: product.name,
        type: 'hq-replenish',
        quantity: 100,
        beforeStock: 0,
        afterStock: 100,
        remark: '总部初始铺货',
        createdAt: dayjs().subtract(60, 'day').format('YYYY-MM-DD 08:00:00'),
      });

      const numChanges = 8 + Math.floor(Math.random() * 8);
      for (let i = 0; i < numChanges; i++) {
        const daysAgo = numChanges - i - 1;
        const isSale = Math.random() > 0.25;
        const qty = isSale
          ? Math.floor(Math.random() * 15) + 3
          : Math.floor(Math.random() * 30) + 10;
        
        if (isSale) {
          const sold = Math.min(qty, currentStock);
          if (sold > 0) {
            const before = currentStock;
            currentStock -= sold;
            logs.push({
              id: `log-${String(logId++).padStart(5, '0')}`,
              storeId: store.id,
              productId: product.id,
              productName: product.name,
              type: 'sale',
              quantity: sold,
              beforeStock: before,
              afterStock: currentStock,
              remark: `销售出库 ${sold} 件`,
              createdAt: dayjs().subtract(daysAgo, 'day').format('YYYY-MM-DD HH:mm:ss'),
            });
          }
        } else {
          const before = currentStock;
          currentStock += qty;
          logs.push({
            id: `log-${String(logId++).padStart(5, '0')}`,
            storeId: store.id,
            productId: product.id,
            productName: product.name,
            type: 'transfer-in',
            quantity: qty,
            beforeStock: before,
            afterStock: currentStock,
            remark: '调拨入库',
            createdAt: dayjs().subtract(daysAgo, 'day').format('YYYY-MM-DD 10:30:00'),
          });
        }
      }

      const diff = sp.stock - currentStock;
      if (Math.abs(diff) > 0) {
        logs.push({
          id: `log-${String(logId++).padStart(5, '0')}`,
          storeId: store.id,
          productId: product.id,
          productName: product.name,
          type: 'adjust',
          quantity: diff,
          beforeStock: currentStock,
          afterStock: sp.stock,
          remark: '库存盘点调整',
          createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD 23:00:00'),
        });
        currentStock = sp.stock;
      }
    });
  });

  return logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
