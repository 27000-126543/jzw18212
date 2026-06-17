import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Select, InputNumber, message } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { TransferRequest } from '../../types';

const StoreTransfers: React.FC = () => {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState<TransferRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [form] = Form.useForm();

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
        fromStoreId: values.type === 'to-hq' ? 'hq' : values.toStoreId,
        toStoreId: values.type === 'to-hq' ? state.currentStoreId! : state.currentStoreId!,
        productId: values.productId,
        productName: product?.name || '',
        quantity: values.quantity,
        status: 'pending',
        type: values.type === 'to-hq' ? 'to-hq' : 'to-store',
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      };
      
      if (values.type === 'to-store') {
        newTransfer.fromStoreId = values.toStoreId;
        newTransfer.toStoreId = state.currentStoreId!;
      } else {
        newTransfer.fromStoreId = state.currentStoreId!;
        newTransfer.toStoreId = 'hq';
      }
      
      dispatch({ type: 'ADD_TRANSFER', payload: newTransfer });
      message.success('调拨申请已提交，等待总部审批');
      setIsModalOpen(false);
    });
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

  const columns = [
    {
      title: '调拨单号',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
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
      title: '方向',
      key: 'direction',
      render: (_: unknown, record: TransferRequest) => {
        const isOutgoing = record.fromStoreId === state.currentStoreId;
        return (
          <Tag color={isOutgoing ? 'orange' : 'green'}>
            {isOutgoing ? '调出' : '调入'}
          </Tag>
        );
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>{statusTextMap[status]}</Tag>
      ),
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: TransferRequest) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => setViewingTransfer(record)}>
            详情
          </Button>
        </Space>
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
            <Select.Option value="approved">已批准</Select.Option>
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
            rules={[{ required: true, message: '请输入调拨数量' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
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
        width={500}
      >
        {viewingTransfer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', background: '#fafafa', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>调拨单号</div>
                <div style={{ fontFamily: 'monospace' }}>{viewingTransfer.id}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>状态</div>
                <Tag color={statusColorMap[viewingTransfer.status]}>{statusTextMap[viewingTransfer.status]}</Tag>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>商品名称</div>
                <div style={{ fontWeight: 500 }}>{viewingTransfer.productName}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>数量</div>
                <div style={{ fontWeight: 500 }}>{viewingTransfer.quantity} 件</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>类型</div>
                <Tag color={viewingTransfer.type === 'to-hq' ? 'purple' : 'cyan'}>{typeTextMap[viewingTransfer.type]}</Tag>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>申请时间</div>
                <div>{viewingTransfer.createdAt}</div>
              </div>
            </div>
            <div style={{ padding: '16px', border: '1px solid #f0f0f0', borderRadius: 8 }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>调拨流向</div>
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
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StoreTransfers;
