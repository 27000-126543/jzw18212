import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Select, Row, Col, Modal, message, Badge } from 'antd';
import { WarningOutlined, ExclamationCircleOutlined, ShoppingCartOutlined, SwapOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { TransferRequest } from '../../types';

const InventoryWarning: React.FC = () => {
  const { state, dispatch } = useApp();
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [storeFilter, setStoreFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [actionModal, setActionModal] = useState<{
    type: 'replenish' | 'suggest';
    storeId: string;
    storeName: string;
    productId: string;
    productName: string;
    image: string;
    stock: number;
    fromStoreId?: string;
    fromStoreName?: string;
    fromStock?: number;
  } | null>(null);

  const approvedStores = useMemo(() => state.stores.filter(s => s.status === 'approved'), [state.stores]);
  const regions = useMemo(() => Array.from(new Set(approvedStores.map(s => s.region))), [approvedStores]);

  const filteredStores = useMemo(() => {
    return approvedStores.filter(s => {
      const matchRegion = !regionFilter || s.region === regionFilter;
      const matchStore = !storeFilter || s.id === storeFilter;
      return matchRegion && matchStore;
    });
  }, [approvedStores, regionFilter, storeFilter]);

  const lowStockItems = useMemo(() => {
    const items: Array<{
      storeId: string;
      storeName: string;
      region: string;
      productId: string;
      productName: string;
      image: string;
      stock: number;
      level: 'out' | 'low' | 'warning';
      inTransitQty: number;
    }> = [];

    const pendingTransfers = state.transfers.filter(t => t.status === 'pending');

    filteredStores.forEach(store => {
      state.storeProducts
        .filter(sp => sp.storeId === store.id)
        .forEach(sp => {
          if (sp.stock < 50) {
            const product = state.products.find(p => p.id === sp.productId);
            if (!product) return;
            const inTransit = pendingTransfers
              .filter(t => (t.toStoreId === store.id || t.fromStoreId === store.id) && t.productId === sp.productId)
              .reduce((sum, t) => t.toStoreId === store.id ? sum + t.quantity : sum, 0);
            let level: 'out' | 'low' | 'warning' = 'warning';
            if (sp.stock === 0) level = 'out';
            else if (sp.stock < 20) level = 'low';
            items.push({
              storeId: store.id,
              storeName: store.name,
              region: store.region,
              productId: sp.productId,
              productName: product.name,
              image: product.image,
              stock: sp.stock,
              level,
              inTransitQty: inTransit,
            });
          }
        });
    });

    items.sort((a, b) => {
      const levelOrder = { out: 0, low: 1, warning: 2 };
      if (levelOrder[a.level] !== levelOrder[b.level]) return levelOrder[a.level] - levelOrder[b.level];
      return a.stock - b.stock;
    });

    return items;
  }, [filteredStores, state.storeProducts, state.products, state.transfers]);

  const displayItems = useMemo(() => {
    if (!levelFilter) return lowStockItems;
    return lowStockItems.filter(i => i.level === levelFilter);
  }, [lowStockItems, levelFilter]);

  const outCount = lowStockItems.filter(i => i.level === 'out').length;
  const lowCount = lowStockItems.filter(i => i.level === 'low').length;
  const warningCount = lowStockItems.filter(i => i.level === 'warning').length;

  const nearbyStores = (storeId: string, productId: string) => {
    const store = approvedStores.find(s => s.id === storeId);
    if (!store) return [];
    const sameRegionStores = approvedStores
      .filter(s => s.id !== storeId && s.region === store.region)
      .map(s => {
        const sp = state.storeProducts.find(p => p.storeId === s.id && p.productId === productId);
        return { ...s, stock: sp?.stock || 0 };
      })
      .filter(s => s.stock > 30)
      .sort((a, b) => b.stock - a.stock);
    return sameRegionStores.slice(0, 3);
  };

  const handleReplenish = (record: any) => {
    setActionModal({
      type: 'replenish',
      storeId: record.storeId,
      storeName: record.storeName,
      productId: record.productId,
      productName: record.productName,
      image: record.image,
      stock: record.stock,
    });
  };

  const handleSuggestTransfer = (record: any, fromStore: any) => {
    setActionModal({
      type: 'suggest',
      storeId: record.storeId,
      storeName: record.storeName,
      productId: record.productId,
      productName: record.productName,
      image: record.image,
      stock: record.stock,
      fromStoreId: fromStore.id,
      fromStoreName: fromStore.name,
      fromStock: fromStore.stock,
    });
  };

  const handleConfirmAction = () => {
    if (!actionModal) return;
    const transfer: TransferRequest = {
      id: `transfer-${Date.now()}`,
      fromStoreId: '',
      toStoreId: '',
      productId: actionModal.productId,
      productName: actionModal.productName,
      quantity: actionModal.type === 'replenish' ? 50 : 20,
      status: 'pending',
      type: actionModal.type === 'replenish' ? 'to-hq' : 'to-store',
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    };
    if (actionModal.type === 'replenish') {
      transfer.fromStoreId = actionModal.storeId;
      transfer.toStoreId = 'hq';
    } else {
      transfer.fromStoreId = actionModal.fromStoreId!;
      transfer.toStoreId = actionModal.storeId;
    }
    dispatch({ type: 'ADD_TRANSFER', payload: transfer });
    message.success(`已为 ${actionModal.storeName} 创建调拨申请，请到调拨管理审批`);
    setActionModal(null);
  };

  const columns = [
    {
      title: '门店',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 140,
      render: (text: string, record: any) => (
        <Space>
          <span style={{ fontSize: '16px' }}>🏪</span>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ fontSize: '11px', color: '#999' }}>{record.region}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '商品',
      key: 'product',
      render: (_: unknown, record: any) => (
        <Space>
          <span style={{ fontSize: '24px' }}>{record.image}</span>
          <span>{record.productName}</span>
        </Space>
      ),
    },
    {
      title: '库存状态',
      key: 'level',
      width: 110,
      render: (_: unknown, record: any) => {
        const colors: Record<string, string> = { out: 'red', low: 'orange', warning: 'gold' };
        const texts: Record<string, string> = { out: '已断货', low: '库存告急', warning: '库存偏低' };
        return (
          <Tag color={colors[record.level]} icon={record.level === 'out' ? <ExclamationCircleOutlined /> : <WarningOutlined />}>
            {texts[record.level]}
          </Tag>
        );
      },
    },
    {
      title: '当前库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      render: (stock: number) => (
        <span style={{ fontWeight: 500, color: stock === 0 ? '#ff4d4f' : stock < 20 ? '#fa8c16' : '#faad14' }}>
          {stock} 件
        </span>
      ),
      sorter: (a: any, b: any) => a.stock - b.stock,
    },
    {
      title: '在途数量',
      dataIndex: 'inTransitQty',
      key: 'inTransitQty',
      width: 100,
      render: (qty: number) => {
        if (qty === 0) return <span style={{ color: '#999' }}>—</span>;
        return <Badge count={`+${qty}`} style={{ backgroundColor: '#1890ff' }} />;
      },
    },
    {
      title: '快速处理',
      key: 'action',
      width: 260,
      render: (_: unknown, record: any) => {
        const nearby = nearbyStores(record.storeId, record.productId);
        return (
          <Space direction="vertical" size={6}>
            <Button type="primary" size="small" icon={<ShoppingCartOutlined />} onClick={() => handleReplenish(record)}>
              总部补货
            </Button>
            {nearby.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: 4 }}>附近门店可调货：</div>
                <Space wrap size={[6, 6]}>
                  {nearby.map(s => (
                    <Tag
                      key={s.id}
                      color="cyan"
                      style={{ cursor: 'pointer', margin: 0 }}
                      onClick={() => handleSuggestTransfer(record, s)}
                    >
                      <SwapOutlined /> {s.name}（{s.stock}件）
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>🚨</span>
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>已断货</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#ff4d4f' }}>{outCount}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>库存告急</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#fa8c16' }}>{lowCount}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>⚡</span>
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>库存偏低</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#faad14' }}>{warningCount}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>📦</span>
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>涉及门店</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1890ff' }}>{filteredStores.length}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
        <Space wrap>
          <Select
            placeholder="选择区域"
            value={regionFilter || undefined}
            onChange={(v) => { setRegionFilter(v); setStoreFilter(''); }}
            style={{ width: 140 }}
            allowClear
          >
            {regions.map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}
          </Select>
          <Select
            placeholder="选择门店"
            value={storeFilter || undefined}
            onChange={setStoreFilter}
            style={{ width: 180 }}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {filteredStores.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
          </Select>
          <Select
            placeholder="预警级别"
            value={levelFilter || undefined}
            onChange={setLevelFilter}
            style={{ width: 140 }}
            allowClear
          >
            <Select.Option value="out">已断货</Select.Option>
            <Select.Option value="low">库存告急</Select.Option>
            <Select.Option value="warning">库存偏低</Select.Option>
          </Select>
        </Space>
      </Card>

      <Card title={`低库存预警商品（${displayItems.length}）`}>
        <Table
          dataSource={displayItems}
          columns={columns}
          rowKey={record => `${record.storeId}-${record.productId}`}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={actionModal?.type === 'replenish' ? '总部补货' : '门店间调货建议'}
        open={!!actionModal}
        onOk={handleConfirmAction}
        onCancel={() => setActionModal(null)}
        width={460}
        okText="创建调拨申请"
        cancelText="取消"
      >
        {actionModal && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 32 }}>{actionModal.image}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{actionModal.productName}</div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {actionModal.storeName} 当前库存：
                  <span style={{ color: actionModal.stock < 20 ? '#ff4d4f' : '#faad14', fontWeight: 500 }}>
                    {actionModal.stock} 件
                  </span>
                </div>
              </div>
            </div>
            {actionModal.type === 'replenish' ? (
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8 }}>
                <p>📦 由总部仓库向 <strong>{actionModal.storeName}</strong> 补货 50 件。</p>
                <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                  创建后调拨单进入待审批状态，总部批准后库存自动入库。
                </p>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8 }}>
                <p>📤 调出门店：<strong>{actionModal.fromStoreName}</strong>（库存 {actionModal.fromStock} 件）</p>
                <p>📥 调入门店：<strong>{actionModal.storeName}</strong>（库存 {actionModal.stock} 件）</p>
                <p>数量：20 件</p>
                <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                  创建后调拨单进入待审批状态，总部批准后自动完成调拨。
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InventoryWarning;
