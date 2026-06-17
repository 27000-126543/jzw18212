import React, { useState, useMemo, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Select, InputNumber, message, Descriptions } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { TransferRequest } from '../../types';

const StoreTransfers: React.FC = () => {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState<TransferRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [form] = Form.useForm();

  const type = Form.useWatch('type', form);
  const toStoreId = Form.useWatch('toStoreId', form);
  const productId = Form.useWatch('productId', form);

  const sourceStoreStock = useMemo(() => {
    if (type === 'to-store' && toStoreId && productId) {
      const storeProduct = state.storeProducts.find(
        sp => sp.storeId === toStoreId && sp.productId === productId
      );
      return storeProduct?.stock ?? 0;
    }
    return 0;
  }, [type, toStoreId, productId, state.storeProducts]);

  useEffect(() => {
    if (type === 'to-store' && toStoreId && productId) {
      const currentQuantity = form.getFieldValue('quantity');
      if (currentQuantity && currentQuantity > sourceStoreStock && sourceStoreStock > 0) {
        form.setFieldsValue({ quantity: sourceStoreStock });
      }
    }
  }, [type, toStoreId, productId, sourceStoreStock, form]);

  const storeTransfers = useMemo(() => {
    return state.transfers.filter(t => t.fromStoreId === state.currentStoreId || t.toStoreId === state.currentStoreId);
  }, [state.transfers, state.currentStoreId]);

  const filteredTransfers = storeTransfers.filter(t => {
    return !statusFilter || t.status === statusFilter;
  });

  const storeMap = useMemo(() => {
    const map: Record<string, string> = {};
    state.stores.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [state.stores]);

  const storeProducts = state.storeProducts.filter(sp => sp.storeId === state.currentStoreId);
  const productsWithStock = storeProducts.map(sp => {
    const product = state.products.find(p => p.id === sp.productId);
    return { ...sp, name: product?.name || '', image: product?.image || '' };
  }).filter(p => p.name);

  const otherStores = state.stores.filter(s => s.id !== state.currentStoreId && s.status === 'approved');

  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({ type: 'to-hq', quantity: 10 });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const product = state.products.find(p => p.id === values.productId);
      const newTransfer: TransferRequest = {
        id: `transfer-${Date.now()}`,
        fromStoreId: '',
        toStoreId: '',
        productId: values.productId,
        productName: product?.name || '',
        quantity: values.quantity,
        status: 'pending',
        type: values.type === 'to-hq' ? 'to-hq' : 'to-store',
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      };

      if (values.type === 'to-hq') {
        newTransfer.fromStoreId = state.currentStoreId!;
        newTransfer.toStoreId = 'hq';
      } else {
        newTransfer.fromStoreId = values.toStoreId;
        newTransfer.toStoreId = state.currentStoreId!;
      }

      dispatch({ type: 'ADD_TRANSFER', payload: newTransfer });
      message.success('调拨申请已提交，等待总部审批');
      setIsModalOpen(false);
    });
  };

  const getStockImpact = (record: TransferRequest) => {
    if (record.status === 'rejected') return null;
    if (record.type === 'to-hq') {
      if (record.fromStoreId === state.currentStoreId) {
        return { direction: 'inbound' as const, quantity: record.quantity };
      }
    } else if (record.type === 'to-store') {
      if (record.toStoreId === state.currentStoreId) {
        return { direction: 'inbound' as const, quantity: record.quantity };
      }
      if (record.fromStoreId === state.currentStoreId) {
        return { direction: 'outbound' as const, quantity: record.quantity };
      }
    }
    return null;
  };

  const statusColorMap: Record<string, string> = {
    pending: 'orange',
    approved: 'blue',
    rejected: 'red',
    completed: 'green',
  };

  const statusTextMap: Record<string, string> = {
    pending: '待审批',
    approved: '已批准',
    rejected: '已拒绝',
    completed: '已完成',
  };

  const typeTextMap: Record<string, string> = {
    'to-hq': '向总部申请',
    'to-store': '门店间调拨',
  };

  const pendingCount = storeTransfers.filter(t => t.status === 'pending').length;
  const completedCount = storeTransfers.filter(t => t.status === 'completed').length;

  const columns = [
    {
      title: '调拨单号',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{text}</span>,
    },
    {
      title: '商品',
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number) => <span style={{ fontWeight: 500 }}>{qty} 件</span>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color={type === 'to-hq' ? 'purple' : 'cyan'}>{typeTextMap[type]}</Tag>,
    },
    {
      title: '审批结果',
      key: 'approvalResult',
      render: (_: unknown, record: TransferRequest) => {
        if (record.status === 'pending') return <Tag color="orange">待审批</Tag>;
        if (record.status === 'completed') return <Tag color="green">已批准入账</Tag>;
        if (record.status === 'rejected') return <Tag color="red">已拒绝</Tag>;
        return <Tag>{statusTextMap[record.status]}</Tag>;
      },
    },
    {
      title: '库存影响',
      key: 'stockImpact',
      render: (_: unknown, record: TransferRequest) => {
        const impact = getStockImpact(record);
        if (!impact) {
          if (record.status === 'pending') return <span style={{ color: '#999' }}>待审批</span>;
          return <span style={{ color: '#999' }}>—</span>;
        }
        if (record.status === 'pending') {
          return (
            <span style={{ color: '#999' }}>
              {impact.direction === 'inbound' ? '+' : '-'}{impact.quantity} 件（待生效）
            </span>
          );
        }
        if (record.status === 'completed') {
          return (
            <Tag color={impact.direction === 'inbound' ? 'green' : 'orange'}>
              {impact.direction === 'inbound' ? '入库' : '出库'} {impact.direction === 'inbound' ? '+' : '-'}{impact.quantity} 件
            </Tag>
          );
        }
        return <span style={{ color: '#999' }}>未生效</span>;
      },
    },
    {
      title: '对方',
      key: 'counterparty',
      render: (_: unknown, record: TransferRequest) => {
        const counterpartyId = record.fromStoreId === state.currentStoreId ? record.toStoreId : record.fromStoreId;
        return counterpartyId === 'hq' ? '总部仓库' : storeMap[counterpartyId] || counterpartyId;
      },
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => <span style={{ fontSize: '12px' }}>{text}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: TransferRequest) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => setViewingTransfer(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '20px' }}>
        <Space wrap size="large">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>⏳</span>
            <div>
              <div style={{ fontSize: '12px', color: '#999' }}>待审批</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>{pendingCount}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <div style={{ fontSize: '12px', color: '#999' }}>已完成</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>{completedCount}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>📋</span>
            <div>
              <div style={{ fontSize: '12px', color: '#999' }}>总调拨单</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>{storeTransfers.length}</div>
            </div>
          </div>
        </Space>
      </Card>

      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            发起调拨申请
          </Button>
          <Select
            placeholder="状态筛选"
            value={statusFilter || undefined}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            allowClear
          >
            <Select.Option value="pending">待审批</Select.Option>
            <Select.Option value="rejected">已拒绝</Select.Option>
            <Select.Option value="completed">已完成</Select.Option>
          </Select>
        </Space>
      </Card>

      <Card>
        <Table
          dataSource={filteredTransfers}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="发起调拨申请"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={480}
        okText="提交申请"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="type"
            label="调拨类型"
            rules={[{ required: true, message: '请选择调拨类型' }]}
          >
            <Select>
              <Select.Option value="to-hq">向总部申请补货</Select.Option>
              <Select.Option value="to-store">向其他门店调货</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.type !== curr.type}
          >
            {({ getFieldValue }) =>
              getFieldValue('type') === 'to-store' ? (
                <Form.Item
                  name="toStoreId"
                  label="调出门店"
                  rules={[{ required: true, message: '请选择调出门店' }]}
                >
                  <Select placeholder="请选择调出门店">
                    {otherStores.map(s => (
                      <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item
            name="productId"
            label="调拨商品"
            rules={[{ required: true, message: '请选择商品' }]}
          >
            <Select placeholder="请选择商品">
              {productsWithStock.map(p => (
                <Select.Option key={p.productId} value={p.productId}>
                  {p.image} {p.name} (库存: {p.stock})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="quantity"
            label="调拨数量"
            rules={[
              { required: true, message: '请输入调拨数量' },
              {
                validator: (_, value) => {
                  if (type === 'to-store' && toStoreId && productId && value && value > sourceStoreStock) {
                    return Promise.reject(new Error(`调拨数量不能超过调出门店库存（${sourceStoreStock} 件）`));
                  }
                  return Promise.resolve();
                }
              }
            ]}
            help={type === 'to-store' && toStoreId && productId ? `调出门店当前库存：${sourceStoreStock} 件` : undefined}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={type === 'to-store' && toStoreId && productId ? sourceStoreStock : undefined}
              placeholder="请输入调拨数量"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="调拨详情"
        open={!!viewingTransfer}
        onCancel={() => setViewingTransfer(null)}
        footer={[
          <Button key="close" onClick={() => setViewingTransfer(null)}>关闭</Button>,
        ]}
        width={560}
      >
        {viewingTransfer && (() => {
          const impact = getStockImpact(viewingTransfer);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="调拨单号" span={2}>{viewingTransfer.id}</Descriptions.Item>
                <Descriptions.Item label="商品名称">{viewingTransfer.productName}</Descriptions.Item>
                <Descriptions.Item label="调拨数量">{viewingTransfer.quantity} 件</Descriptions.Item>
                <Descriptions.Item label="调拨类型">
                  <Tag color={viewingTransfer.type === 'to-hq' ? 'purple' : 'cyan'}>{typeTextMap[viewingTransfer.type]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="审批结果">
                  <Tag color={statusColorMap[viewingTransfer.status]}>
                    {viewingTransfer.status === 'completed' ? '已批准入账' : statusTextMap[viewingTransfer.status]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="申请时间">{viewingTransfer.createdAt}</Descriptions.Item>
                <Descriptions.Item label="审批时间">{viewingTransfer.approvedAt || '—'}</Descriptions.Item>
              </Descriptions>

              <div style={{ padding: '16px', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <div style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>调拨流向</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>📤</div>
                    <div style={{ fontSize: '13px' }}>{viewingTransfer.fromStoreId === 'hq' ? '总部仓库' : storeMap[viewingTransfer.fromStoreId]}</div>
                  </div>
                  <div style={{ fontSize: '24px', color: '#1890ff', padding: '0 16px' }}>→</div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>📥</div>
                    <div style={{ fontSize: '13px' }}>{viewingTransfer.toStoreId === 'hq' ? '总部仓库' : storeMap[viewingTransfer.toStoreId]}</div>
                  </div>
                </div>
              </div>

              {impact && viewingTransfer.status === 'completed' && (
                <div style={{
                  padding: '12px 16px',
                  background: impact.direction === 'inbound' ? '#f6ffed' : '#fff7e6',
                  border: `1px solid ${impact.direction === 'inbound' ? '#b7eb8f' : '#ffd591'}`,
                  borderRadius: 8,
                }}>
                  <div style={{ fontWeight: 500, color: impact.direction === 'inbound' ? '#52c41a' : '#fa8c16' }}>
                    {impact.direction === 'inbound' ? '📥 本店入库' : '📤 本店出库'}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: impact.direction === 'inbound' ? '#52c41a' : '#fa8c16', marginTop: 4 }}>
                    {impact.direction === 'inbound' ? '+' : '-'}{impact.quantity} 件 {viewingTransfer.productName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                    库存已更新 · {viewingTransfer.completedAt}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default StoreTransfers;
