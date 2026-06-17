import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Select, Row, Col, DatePicker, Modal, Statistic, Switch } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import dayjs from 'dayjs';
import type { InventoryLog } from '../../types';
const { RangePicker } = DatePicker;

const InventoryReconciliation: React.FC = () => {
  const { state } = useApp();
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [storeFilter, setStoreFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [showDiffOnly, setShowDiffOnly] = useState<boolean>(false);
  const [viewingLogs, setViewingLogs] = useState<{
    storeId: string;
    storeName: string;
    productId: string;
    productName: string;
    productImage: string;
  } | null>(null);

  const approvedStores = useMemo(
    () => state.stores.filter(s => s.status === 'approved'),
    [state.stores]
  );

  const regions = useMemo(() => {
    const set = new Set(approvedStores.map(s => s.region));
    return Array.from(set);
  }, [approvedStores]);

  const filteredStores = useMemo(() => {
    if (!regionFilter) return approvedStores;
    return approvedStores.filter(s => s.region === regionFilter);
  }, [approvedStores, regionFilter]);

  const reconciliationData = useMemo(() => {
    const storesToProcess = storeFilter
      ? approvedStores.filter(s => s.id === storeFilter)
      : filteredStores;

    const productsToProcess = productFilter
      ? state.products.filter(p => p.id === productFilter)
      : state.products;

    const periodStart = dateRange[0].startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const periodEnd = dateRange[1].endOf('day').format('YYYY-MM-DD HH:mm:ss');

    const result = [];

    for (const store of storesToProcess) {
      for (const product of productsToProcess) {
        const storeProduct = state.storeProducts.find(
          sp => sp.storeId === store.id && sp.productId === product.id
        );

        const productLogs = state.inventoryLogs
          .filter(
            l => l.storeId === store.id && l.productId === product.id
          )
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        const logsBeforePeriod = productLogs.filter(l => l.createdAt < periodStart);
        const openingStock = logsBeforePeriod.length > 0
          ? logsBeforePeriod[logsBeforePeriod.length - 1].afterStock
          : 0;

        const logsInPeriod = productLogs.filter(
          l => l.createdAt >= periodStart && l.createdAt <= periodEnd
        );

        const inQuantity = logsInPeriod
          .filter(l => l.type === 'transfer-in' || l.type === 'hq-replenish')
          .reduce((sum, l) => sum + l.quantity, 0);

        const outQuantity = logsInPeriod
          .filter(l => l.type === 'sale' || l.type === 'transfer-out')
          .reduce((sum, l) => sum + l.quantity, 0);

        const expectedClosing = openingStock + inQuantity - outQuantity;
        const actualClosing = storeProduct?.stock ?? 0;
        const difference = actualClosing - expectedClosing;

        result.push({
          key: `${store.id}-${product.id}`,
          storeId: store.id,
          storeName: store.name,
          storeRegion: store.region,
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          productCategory: product.category,
          openingStock,
          inQuantity,
          outQuantity,
          expectedClosing,
          actualClosing,
          difference,
          hasDiff: difference !== 0,
        });
      }
    }

    return result;
  }, [state, filteredStores, approvedStores, storeFilter, productFilter, dateRange]);

  const displayedData = useMemo(() => {
    if (showDiffOnly) {
      return reconciliationData.filter(d => d.hasDiff);
    }
    return reconciliationData;
  }, [reconciliationData, showDiffOnly]);

  const summaryStats = useMemo(() => {
    const uniqueStores = new Set(reconciliationData.map(d => d.storeId));
    const uniqueProducts = new Set(reconciliationData.map(d => d.productId));
    const diffItems = reconciliationData.filter(d => d.hasDiff);
    const totalDiffQty = diffItems.reduce((sum, d) => sum + Math.abs(d.difference), 0);

    return {
      storeCount: uniqueStores.size,
      productCount: uniqueProducts.size,
      diffItemCount: diffItems.length,
      totalDiffQty,
    };
  }, [reconciliationData]);

  const productLogsForView = useMemo(() => {
    if (!viewingLogs) return [];
    return state.inventoryLogs
      .filter(
        l => l.storeId === viewingLogs.storeId && l.productId === viewingLogs.productId
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [viewingLogs, state.inventoryLogs]);

  const typeColorMap: Record<string, string> = {
    'sale': '#ff4d4f',
    'transfer-in': '#52c41a',
    'transfer-out': '#fa8c16',
    'hq-replenish': '#722ed1',
    'adjust': '#1890ff',
  };

  const typeTextMap: Record<string, string> = {
    'sale': '销售出库',
    'transfer-in': '调拨入库',
    'transfer-out': '调拨出库',
    'hq-replenish': '总部补货',
    'adjust': '库存调整',
  };

  const columns = [
    {
      title: '门店',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 180,
      fixed: 'left' as const,
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <Tag color="blue" style={{ marginTop: 4, fontSize: '11px' }}>
            {record.storeRegion}
          </Tag>
        </div>
      ),
    },
    {
      title: '商品',
      dataIndex: 'productName',
      key: 'productName',
      width: 180,
      render: (text: string, record: any) => (
        <Space>
          <span style={{ fontSize: '24px' }}>{record.productImage}</span>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ color: '#999', fontSize: '12px' }}>{record.productCategory}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '期初库存',
      dataIndex: 'openingStock',
      key: 'openingStock',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <span style={{ color: '#999' }}>{v}</span>,
    },
    {
      title: '入库数量',
      dataIndex: 'inQuantity',
      key: 'inQuantity',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 500 }}>+{v}</span>,
    },
    {
      title: '出库数量',
      dataIndex: 'outQuantity',
      key: 'outQuantity',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <span style={{ color: '#ff4d4f', fontWeight: 500 }}>-{v}</span>,
    },
    {
      title: '账面期末',
      dataIndex: 'expectedClosing',
      key: 'expectedClosing',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '实际期末',
      dataIndex: 'actualClosing',
      key: 'actualClosing',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 500, color: '#1890ff' }}>{v}</span>,
    },
    {
      title: '差异',
      dataIndex: 'difference',
      key: 'difference',
      width: 100,
      align: 'right' as const,
      render: (v: number) => {
        if (v === 0) {
          return <span style={{ color: '#52c41a' }}>0</span>;
        }
        const sign = v > 0 ? '+' : '';
        return <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{sign}{v}</span>;
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_: unknown, record: any) => {
        if (record.hasDiff) {
          return (
            <Tag icon={<ExclamationCircleOutlined />} color="red">
              存在差异
            </Tag>
          );
        }
        return (
          <Tag icon={<CheckCircleOutlined />} color="green">
            对账相符
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: any) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setViewingLogs({
            storeId: record.storeId,
            storeName: record.storeName,
            productId: record.productId,
            productName: record.productName,
            productImage: record.productImage,
          })}
        >
          查看流水
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '20px' }}>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Statistic
              title="门店数"
              value={summaryStats.storeCount}
              prefix="🏪"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="商品种类"
              value={summaryStats.productCount}
              prefix="📦"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="差异商品数"
              value={summaryStats.diffItemCount}
              prefix="⚠️"
              valueStyle={{ color: summaryStats.diffItemCount > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="差异总数量"
              value={summaryStats.totalDiffQty}
              prefix="📊"
              valueStyle={{ color: summaryStats.totalDiffQty > 0 ? '#ff4d4f' : '#52c41a' }}
              suffix="件"
            />
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <Space wrap size="large">
          <Select
            placeholder="选择区域"
            value={regionFilter || undefined}
            onChange={(v) => { setRegionFilter(v); setStoreFilter(''); }}
            style={{ width: 160 }}
            allowClear
          >
            {regions.map(r => (
              <Select.Option key={r} value={r}>{r}</Select.Option>
            ))}
          </Select>

          <Select
            placeholder="选择门店"
            value={storeFilter || undefined}
            onChange={setStoreFilter}
            style={{ width: 200 }}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {filteredStores.map(s => (
              <Select.Option key={s.id} value={s.id}>
                {s.name} ({s.region})
              </Select.Option>
            ))}
          </Select>

          <Select
            placeholder="选择商品"
            value={productFilter || undefined}
            onChange={setProductFilter}
            style={{ width: 220 }}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {state.products.map(p => (
              <Select.Option key={p.id} value={p.id}>
                {p.image} {p.name}
              </Select.Option>
            ))}
          </Select>

          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange([dates[0]!, dates[1]!])}
            style={{ width: 280 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Switch
              checked={showDiffOnly}
              onChange={setShowDiffOnly}
            />
            <span style={{ color: showDiffOnly ? '#ff4d4f' : '#666' }}>
              仅显示差异
            </span>
          </div>
        </Space>
      </Card>

      <Card>
        <Table
          dataSource={displayedData}
          columns={columns}
          rowKey="key"
          scroll={{ x: 1250, y: 520 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title={viewingLogs ? `${viewingLogs.productImage} ${viewingLogs.productName} · ${viewingLogs.storeName} 库存流水` : ''}
        open={!!viewingLogs}
        onCancel={() => setViewingLogs(null)}
        footer={[<Button key="close" onClick={() => setViewingLogs(null)}>关闭</Button>]}
        width={680}
      >
        {viewingLogs && (
          <div>
            <div style={{ padding: '12px 16px', background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{viewingLogs.productName}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>门店：{viewingLogs.storeName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#999' }}>流水记录</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                    {productLogsForView.length} 条
                  </div>
                </div>
              </div>
            </div>

            <div style={{ maxHeight: 450, overflowY: 'auto' }}>
              {productLogsForView.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无流水记录</div>
              ) : (
                productLogsForView.map((log: InventoryLog) => {
                  const isIn = log.type === 'transfer-in' || log.type === 'hq-replenish';
                  const isOut = log.type === 'sale' || log.type === 'transfer-out';
                  const qtyColor = isIn ? '#52c41a' : isOut ? '#ff4d4f' : '#1890ff';
                  const qtySign = isIn ? '+' : isOut ? '-' : log.quantity >= 0 ? '+' : '';

                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Space>
                          <Tag color={typeColorMap[log.type]} style={{ margin: 0 }}>
                            {typeTextMap[log.type]}
                          </Tag>
                          <span style={{ color: qtyColor, fontWeight: 500 }}>
                            {qtySign}{Math.abs(log.quantity)} 件
                          </span>
                        </Space>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: 6 }}>
                          {log.createdAt}
                        </div>
                        {log.remark && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                            备注：{log.remark}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', marginTop: 4 }}>
                          库存：<span style={{ color: '#999' }}>{log.beforeStock}</span> → <span style={{ fontWeight: 500 }}>{log.afterStock}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InventoryReconciliation;
