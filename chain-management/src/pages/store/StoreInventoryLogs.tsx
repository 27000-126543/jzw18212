import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Select, Modal, Timeline, Input } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { InventoryLog, InventoryLogType } from '../../types';

const typeColorMap: Record<InventoryLogType, string> = {
  'sale': '#ff4d4f',
  'transfer-in': '#52c41a',
  'transfer-out': '#fa8c16',
  'hq-replenish': '#722ed1',
  'adjust': '#1890ff',
};

const typeTextMap: Record<InventoryLogType, string> = {
  'sale': '销售出库',
  'transfer-in': '调拨入库',
  'transfer-out': '调拨出库',
  'hq-replenish': '总部补货',
  'adjust': '库存调整',
};

const typeIconMap: Record<InventoryLogType, string> = {
  'sale': '🛒',
  'transfer-in': '📥',
  'transfer-out': '📤',
  'hq-replenish': '📦',
  'adjust': '🔧',
};

const StoreInventoryLogs: React.FC = () => {
  const { state } = useApp();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [viewingProduct, setViewingProduct] = useState<{ productId: string; name: string; image: string; stock: number } | null>(null);

  const storeLogs = useMemo(() => {
    return state.inventoryLogs.filter(l => l.storeId === state.currentStoreId);
  }, [state.inventoryLogs, state.currentStoreId]);

  const storeProducts = useMemo(() => {
    return state.storeProducts
      .filter(sp => sp.storeId === state.currentStoreId)
      .map(sp => {
        const p = state.products.find(prod => prod.id === sp.productId);
        return { ...sp, name: p?.name || '', image: p?.image || '' };
      });
  }, [state.storeProducts, state.products, state.currentStoreId]);

  const filteredLogs = storeLogs.filter(log => {
    const matchType = !typeFilter || log.type === typeFilter;
    const matchProduct = !productFilter || log.productId === productFilter;
    const matchSearch = !searchText || log.productName.includes(searchText) || (log.remark && log.remark.includes(searchText));
    return matchType && matchProduct && matchSearch;
  });

  const productLogs = useMemo(() => {
    if (!viewingProduct) return [];
    return storeLogs.filter(l => l.productId === viewingProduct.productId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [viewingProduct, storeLogs]);

  const inQty = storeLogs.filter(l => l.type === 'transfer-in' || l.type === 'hq-replenish').reduce((sum, l) => sum + l.quantity, 0);
  const outQty = storeLogs.filter(l => l.type === 'sale' || l.type === 'transfer-out').reduce((sum, l) => sum + l.quantity, 0);

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (text: string) => <span style={{ fontSize: '12px' }}>{text}</span>,
    },
    {
      title: '商品',
      dataIndex: 'productName',
      key: 'productName',
      render: (text: string, record: InventoryLog) => (
        <Space>
          <span style={{ fontSize: '20px' }}>{storeProducts.find(p => p.productId === record.productId)?.image || '📦'}</span>
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type: InventoryLogType) => (
        <Tag color={typeColorMap[type]} icon={typeIconMap[type]}>
          {typeTextMap[type]}
        </Tag>
      ),
    },
    {
      title: '变动数量',
      key: 'qty',
      width: 100,
      render: (_: unknown, record: InventoryLog) => {
        const isIn = record.type === 'transfer-in' || record.type === 'hq-replenish';
        const isOut = record.type === 'sale' || record.type === 'transfer-out';
        const color = isIn ? '#52c41a' : isOut ? '#ff4d4f' : '#1890ff';
        const sign = isIn ? '+' : isOut ? '-' : record.quantity >= 0 ? '+' : '';
        return <span style={{ color, fontWeight: 500 }}>{sign}{Math.abs(record.quantity)}</span>;
      },
    },
    {
      title: '变动前库存',
      dataIndex: 'beforeStock',
      key: 'beforeStock',
      width: 100,
      render: (v: number) => <span style={{ color: '#999' }}>{v}</span>,
    },
    {
      title: '变动后库存',
      dataIndex: 'afterStock',
      key: 'afterStock',
      width: 100,
      render: (v: number) => <span style={{ fontWeight: 500, color: v < 30 ? '#ff4d4f' : undefined }}>{v}</span>,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      render: (text: string) => <span style={{ color: '#666', fontSize: '12px' }}>{text || '—'}</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: InventoryLog) => {
        const product = storeProducts.find(p => p.productId === record.productId);
        if (!product) return null;
        return (
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewingProduct({
            productId: product.productId,
            name: product.name,
            image: product.image,
            stock: product.stock,
          })}>
            商品流水
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Space size={[16, 16]} wrap>
          <Card style={{ minWidth: 180 }}>
            <div style={{ fontSize: '12px', color: '#999' }}>入库总量</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#52c41a' }}>
              +{inQty} 件
            </div>
          </Card>
          <Card style={{ minWidth: 180 }}>
            <div style={{ fontSize: '12px', color: '#999' }}>出库总量</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ff4d4f' }}>
              -{outQty} 件
            </div>
          </Card>
          <Card style={{ minWidth: 180 }}>
            <div style={{ fontSize: '12px', color: '#999' }}>流水条数</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1890ff' }}>
              {storeLogs.length}
            </div>
          </Card>
        </Space>
      </div>

      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <Space wrap>
          <Input
            placeholder="搜索商品名称、备注"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="选择商品"
            value={productFilter || undefined}
            onChange={setProductFilter}
            style={{ width: 200 }}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {storeProducts.map(p => (
              <Select.Option key={p.productId} value={p.productId}>
                {p.image} {p.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="变动类型"
            value={typeFilter || undefined}
            onChange={setTypeFilter}
            style={{ width: 140 }}
            allowClear
          >
            <Select.Option value="sale">🛒 销售出库</Select.Option>
            <Select.Option value="transfer-in">📥 调拨入库</Select.Option>
            <Select.Option value="transfer-out">📤 调拨出库</Select.Option>
            <Select.Option value="hq-replenish">📦 总部补货</Select.Option>
            <Select.Option value="adjust">🔧 库存调整</Select.Option>
          </Select>
        </Space>
      </Card>

      <Card>
        <Table
          dataSource={filteredLogs}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={viewingProduct ? `${viewingProduct.image} ${viewingProduct.name} · 库存流水` : ''}
        open={!!viewingProduct}
        onCancel={() => setViewingProduct(null)}
        footer={[<Button key="close" onClick={() => setViewingProduct(null)}>关闭</Button>]}
        width={620}
      >
        {viewingProduct && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{viewingProduct.name}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>共 {productLogs.length} 条记录</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#999' }}>当前库存</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: viewingProduct.stock < 30 ? '#ff4d4f' : '#52c41a' }}>
                  {viewingProduct.stock} 件
                </div>
              </div>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
              <Timeline
                mode="left"
                items={productLogs.map(log => ({
                  color: typeColorMap[log.type],
                  dot: <span style={{ fontSize: '16px' }}>{typeIconMap[log.type]}</span>,
                  children: (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Tag color={typeColorMap[log.type]}>{typeTextMap[log.type]}</Tag>
                        <span style={{
                          color: log.type === 'transfer-in' || log.type === 'hq-replenish' ? '#52c41a' : '#ff4d4f',
                          fontWeight: 500,
                        }}>
                          {log.type === 'transfer-in' || log.type === 'hq-replenish' ? '+' : '-'}{Math.abs(log.quantity)} 件
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                        {log.createdAt}
                      </div>
                      {log.remark && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>{log.remark}</div>
                      )}
                      <div style={{ fontSize: '12px', marginTop: 4 }}>
                        库存：<span style={{ color: '#999' }}>{log.beforeStock}</span> → <span style={{ fontWeight: 500 }}>{log.afterStock}</span>
                      </div>
                    </div>
                  ),
                  label: '',
                }))}
              />
              {productLogs.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>暂无流水记录</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StoreInventoryLogs;
