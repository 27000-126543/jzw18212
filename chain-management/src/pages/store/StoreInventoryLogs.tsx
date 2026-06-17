import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Select, Modal, Timeline, Input, Tabs, DatePicker, Statistic } from 'antd';
import type { TableProps } from 'antd';
import { SearchOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { InventoryLog, InventoryLogType } from '../../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

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
  const [activeTab, setActiveTab] = useState<string>('logs');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [viewingProduct, setViewingProduct] = useState<{ productId: string; name: string; image: string; stock: number } | null>(null);
  const [reconProductFilter, setReconProductFilter] = useState<string>('');
  const [reconDateRange, setReconDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().subtract(30, 'day'), dayjs()]);

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

  const reconciliationData = useMemo(() => {
    if (!reconDateRange || !reconDateRange[0] || !reconDateRange[1]) return [];

    const startDate = reconDateRange[0].startOf('day');
    const endDate = reconDateRange[1].endOf('day');

    return storeProducts
      .filter(p => !reconProductFilter || p.productId === reconProductFilter)
      .map(product => {
        const productLogs = storeLogs.filter(l => l.productId === product.productId);
        const sortedLogs = [...productLogs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        let opening = 0;
        let inTotal = 0;
        let outTotal = 0;

        const logsBeforePeriod = sortedLogs.filter(l => dayjs(l.createdAt).isBefore(startDate));
        if (logsBeforePeriod.length > 0) {
          opening = logsBeforePeriod[logsBeforePeriod.length - 1].afterStock;
        }

        const logsInPeriod = sortedLogs.filter(l => {
          const logDate = dayjs(l.createdAt);
          return logDate.isAfter(startDate.subtract(1, 'second')) && logDate.isBefore(endDate.add(1, 'second'));
        });

        logsInPeriod.forEach(log => {
          if (log.type === 'transfer-in' || log.type === 'hq-replenish') {
            inTotal += log.quantity;
          } else if (log.type === 'sale' || log.type === 'transfer-out') {
            outTotal += log.quantity;
          }
        });

        if (logsInPeriod.length === 0 && logsBeforePeriod.length === 0) {
          opening = product.stock;
        }

        const expectedClosing = opening + inTotal - outTotal;
        const actualClosing = product.stock;
        const diff = actualClosing - expectedClosing;

        return {
          key: product.productId,
          productId: product.productId,
          productName: product.name,
          productImage: product.image,
          opening,
          inTotal,
          outTotal,
          expectedClosing,
          actualClosing,
          diff,
        };
      });
  }, [storeLogs, storeProducts, reconDateRange, reconProductFilter]);

  const reconciliationSummary = useMemo(() => {
    if (reconciliationData.length === 0) return null;

    const totalOpening = reconciliationData.reduce((sum, r) => sum + r.opening, 0);
    const totalIn = reconciliationData.reduce((sum, r) => sum + r.inTotal, 0);
    const totalOut = reconciliationData.reduce((sum, r) => sum + r.outTotal, 0);
    const totalClosing = reconciliationData.reduce((sum, r) => sum + r.actualClosing, 0);
    const matchedCount = reconciliationData.filter(r => r.diff === 0).length;
    const diffCount = reconciliationData.filter(r => r.diff !== 0).length;

    return { totalOpening, totalIn, totalOut, totalClosing, matchedCount, diffCount };
  }, [reconciliationData]);

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

  type ReconciliationRecord = {
    key: string;
    productId: string;
    productName: string;
    productImage: string;
    opening: number;
    inTotal: number;
    outTotal: number;
    expectedClosing: number;
    actualClosing: number;
    diff: number;
  };

  const reconciliationColumns: TableProps<ReconciliationRecord>['columns'] = [
    {
      title: '商品',
      key: 'product',
      width: 200,
      render: (_: unknown, record: ReconciliationRecord) => (
        <Space>
          <span style={{ fontSize: '24px' }}>{record.productImage || '📦'}</span>
          <span>{record.productName}</span>
        </Space>
      ),
    },
    {
      title: '期初库存',
      dataIndex: 'opening',
      key: 'opening',
      width: 100,
      align: 'center',
    },
    {
      title: '入库数量',
      dataIndex: 'inTotal',
      key: 'inTotal',
      width: 100,
      align: 'center',
      render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 500 }}>+{v}</span>,
    },
    {
      title: '出库数量',
      dataIndex: 'outTotal',
      key: 'outTotal',
      width: 100,
      align: 'center',
      render: (v: number) => <span style={{ color: '#ff4d4f', fontWeight: 500 }}>-{v}</span>,
    },
    {
      title: '账面期末',
      dataIndex: 'expectedClosing',
      key: 'expectedClosing',
      width: 100,
      align: 'center',
      render: (v: number) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '实际期末',
      dataIndex: 'actualClosing',
      key: 'actualClosing',
      width: 100,
      align: 'center',
      render: (v: number) => <span style={{ fontWeight: 500, color: v < 30 ? '#ff4d4f' : undefined }}>{v}</span>,
    },
    {
      title: '差异',
      dataIndex: 'diff',
      key: 'diff',
      width: 100,
      align: 'center',
      render: (v: number) => <span style={{ fontWeight: 500, color: v !== 0 ? '#ff4d4f' : undefined }}>{v > 0 ? `+${v}` : v}</span>,
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      align: 'center',
      render: (_: unknown, record: ReconciliationRecord) => {
        const isMatched = record.diff === 0;
        return (
          <Tag icon={isMatched ? <CheckCircleOutlined /> : <CloseCircleOutlined />} color={isMatched ? 'success' : 'error'}>
            {isMatched ? '对账相符' : '存在差异'}
          </Tag>
        );
      },
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'logs',
            label: '流水明细',
            children: (
              <>
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
              </>
            ),
          },
          {
            key: 'reconciliation',
            label: '库存对账',
            children: (
              <>
                <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
                  <Space wrap>
                    <Select
                      placeholder="选择商品（可选）"
                      value={reconProductFilter || undefined}
                      onChange={setReconProductFilter}
                      style={{ width: 240 }}
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
                    <RangePicker
                      value={reconDateRange}
                      onChange={(dates) => setReconDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                      style={{ width: 280 }}
                    />
                  </Space>
                </Card>

                {reconciliationSummary && (
                  <div style={{ marginBottom: '16px' }}>
                    <Space size={[16, 16]} wrap>
                      <Card style={{ minWidth: 200 }}>
                        <Statistic
                          title="期初库存总量"
                          value={reconciliationSummary.totalOpening}
                          suffix="件"
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Card>
                      <Card style={{ minWidth: 200 }}>
                        <Statistic
                          title="本期入库总量"
                          value={reconciliationSummary.totalIn}
                          prefix="+"
                          suffix="件"
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                      <Card style={{ minWidth: 200 }}>
                        <Statistic
                          title="本期出库总量"
                          value={reconciliationSummary.totalOut}
                          prefix="-"
                          suffix="件"
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Card>
                      <Card style={{ minWidth: 200 }}>
                        <Statistic
                          title="期末库存总量"
                          value={reconciliationSummary.totalClosing}
                          suffix="件"
                          valueStyle={{ color: '#722ed1' }}
                        />
                      </Card>
                    </Space>
                  </div>
                )}

                {reconciliationSummary && (
                  <Card style={{ marginBottom: '16px' }}>
                    <Space size={[24, 24]}>
                      <Space>
                        <span style={{ color: '#666' }}>对账结果：</span>
                        <Tag icon={<CheckCircleOutlined />} color="success" style={{ padding: '4px 12px', fontSize: '14px' }}>
                          对账相符：{reconciliationSummary.matchedCount} 个商品
                        </Tag>
                        <Tag icon={<CloseCircleOutlined />} color="error" style={{ padding: '4px 12px', fontSize: '14px' }}>
                          存在差异：{reconciliationSummary.diffCount} 个商品
                        </Tag>
                      </Space>
                      <Button
                        type="primary"
                        onClick={() => {
                          const csvContent = [
                            ['商品', '期初库存', '入库数量', '出库数量', '账面期末', '实际期末', '差异', '状态'].join(','),
                            ...reconciliationData.map(r => [
                              r.productName,
                              r.opening,
                              r.inTotal,
                              r.outTotal,
                              r.expectedClosing,
                              r.actualClosing,
                              r.diff,
                              r.diff === 0 ? '对账相符' : '存在差异'
                            ].join(','))
                          ].join('\n');
                          const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.download = `库存对账_${dayjs().format('YYYYMMDD')}.csv`;
                          link.click();
                        }}
                      >
                        导出对账单
                      </Button>
                    </Space>
                  </Card>
                )}

                <Card>
                  <Table
                    dataSource={reconciliationData}
                    columns={reconciliationColumns}
                    rowKey="key"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                  />
                </Card>
              </>
            ),
          },
        ]}
      />

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
