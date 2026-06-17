import React, { useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Descriptions, Select } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { TransferRequest } from '../../types';

const TransferManagement: React.FC = () => {
  const { state, dispatch } = useApp();
  const [viewingTransfer, setViewingTransfer] = useState<TransferRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const filteredTransfers = state.transfers.filter(t => {
    const matchStatus = !statusFilter || t.status === statusFilter;
    const matchType = !typeFilter || t.type === typeFilter;
    return matchStatus && matchType;
  });

  const storeMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    state.stores.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [state.stores]);

  const handleApprove = (id: string) => {
    const transfer = state.transfers.find(t => t.id === id);
    if (!transfer) return;
    if (transfer.type === 'to-store') {
      const fromSp = state.storeProducts.find(
        sp => sp.storeId === transfer.fromStoreId && sp.productId === transfer.productId
      );
      if (!fromSp || fromSp.stock < transfer.quantity) {
        const available = fromSp?.stock || 0;
        const storeName = storeMap[transfer.fromStoreId] || transfer.fromStoreId;
        message.error(`${storeName} 库存不足（当前 ${available} 件，需调出 ${transfer.quantity} 件），无法批准`);
        return;
      }
    }
    dispatch({ type: 'UPDATE_TRANSFER_STATUS', payload: { id, status: 'approved' } });
    message.success('调拨已批准，库存已即时更新');
  };

  const handleReject = (id: string) => {
    dispatch({ type: 'UPDATE_TRANSFER_STATUS', payload: { id, status: 'rejected' } });
    message.info('调拨申请已拒绝');
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

  const pendingCount = state.transfers.filter(t => t.status === 'pending').length;
  const completedCount = state.transfers.filter(t => t.status === 'completed').length;

  const getStockChangeDesc = (record: TransferRequest) => {
    if (record.status !== 'completed') return null;
    if (record.type === 'to-hq') {
      return `${storeMap[record.fromStoreId] || record.fromStoreId} 入库 +${record.quantity}`;
    }
    return `${storeMap[record.fromStoreId] || record.fromStoreId} 出库 -${record.quantity}，${storeMap[record.toStoreId] || record.toStoreId} 入库 +${record.quantity}`;
  };

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
      title: '调出方',
      key: 'from',
      render: (_: unknown, record: TransferRequest) => {
        if (record.type === 'to-hq') return <span>总部仓库</span>;
        return <span>{storeMap[record.fromStoreId] || record.fromStoreId}</span>;
      },
    },
    {
      title: '调入方',
      key: 'to',
      render: (_: unknown, record: TransferRequest) => {
        if (record.type === 'to-hq') return <span>{storeMap[record.fromStoreId] || record.fromStoreId}</span>;
        return <span>{storeMap[record.toStoreId] || record.toStoreId}</span>;
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
      title: '库存变化',
      key: 'stockChange',
      render: (_: unknown, record: TransferRequest) => {
        const desc = getStockChangeDesc(record);
        if (!desc) return <span style={{ color: '#999' }}>—</span>;
        return <span style={{ color: '#52c41a', fontSize: '12px' }}>{desc}</span>;
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
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => setViewingTransfer(record)}>
            详情
          </Button>
          {record.status === 'pending' && (
            <>
              <Button type="link" icon={<CheckOutlined />} onClick={() => handleApprove(record.id)} style={{ color: '#52c41a' }}>
                批准入账
              </Button>
              <Button type="link" danger icon={<CloseOutlined />} onClick={() => handleReject(record.id)}>
                拒绝
              </Button>
            </>
          )}
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
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>{state.transfers.length}</div>
            </div>
          </div>
        </Space>
      </Card>

      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <Space wrap>
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
          <Select
            placeholder="类型筛选"
            value={typeFilter || undefined}
            onChange={setTypeFilter}
            style={{ width: 160 }}
            allowClear
          >
            <Select.Option value="to-hq">向总部申请</Select.Option>
            <Select.Option value="to-store">门店间调拨</Select.Option>
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
        title="调拨详情"
        open={!!viewingTransfer}
        onCancel={() => setViewingTransfer(null)}
        footer={viewingTransfer?.status === 'pending' ? [
          <Button key="reject" danger icon={<CloseOutlined />} onClick={() => { handleReject(viewingTransfer.id); setViewingTransfer(null); }}>
            拒绝
          </Button>,
          <Button key="approve" type="primary" icon={<CheckOutlined />} onClick={() => { handleApprove(viewingTransfer.id); setViewingTransfer(null); }}>
            批准入账
          </Button>,
        ] : [
          <Button key="close" onClick={() => setViewingTransfer(null)}>关闭</Button>,
        ]}
        width={600}
      >
        {viewingTransfer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="调拨单号" span={2}>{viewingTransfer.id}</Descriptions.Item>
              <Descriptions.Item label="商品名称">{viewingTransfer.productName}</Descriptions.Item>
              <Descriptions.Item label="调拨数量">{viewingTransfer.quantity} 件</Descriptions.Item>
              <Descriptions.Item label="调拨类型">
                <Tag color={viewingTransfer.type === 'to-hq' ? 'purple' : 'cyan'}>
                  {typeTextMap[viewingTransfer.type]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColorMap[viewingTransfer.status]}>{statusTextMap[viewingTransfer.status]}</Tag>
              </Descriptions.Item>
              {viewingTransfer.type === 'to-store' && (
                <Descriptions.Item label="调出门店库存" span={2}>
                  {(() => {
                    const sp = state.storeProducts.find(
                      p => p.storeId === viewingTransfer.fromStoreId && p.productId === viewingTransfer.productId
                    );
                    const stock = sp?.stock ?? 0;
                    const enough = stock >= viewingTransfer.quantity;
                    return (
                      <span style={{ color: enough ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
                        {stock} 件 {enough ? '✓ 库存充足' : '✗ 库存不足'}
                      </span>
                    );
                  })()}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ padding: '16px', border: '1px solid #f0f0f0', borderRadius: 8 }}>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>调拨流向</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>📤</div>
                  <div style={{ fontSize: '13px' }}>
                    {viewingTransfer.type === 'to-hq' ? '总部仓库' : storeMap[viewingTransfer.fromStoreId] || viewingTransfer.fromStoreId}
                  </div>
                </div>
                <div style={{ fontSize: '24px', color: '#1890ff', padding: '0 16px' }}>→</div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>📥</div>
                  <div style={{ fontSize: '13px' }}>
                    {viewingTransfer.type === 'to-hq' ? storeMap[viewingTransfer.fromStoreId] : storeMap[viewingTransfer.toStoreId] || viewingTransfer.toStoreId}
                  </div>
                </div>
              </div>
            </div>

            {viewingTransfer.status === 'completed' && (
              <div style={{ padding: '12px 16px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
                <div style={{ fontWeight: 500, color: '#52c41a', marginBottom: 4 }}>✅ 库存已入账</div>
                <div style={{ fontSize: '13px', color: '#666' }}>{getStockChangeDesc(viewingTransfer)}</div>
                {viewingTransfer.completedAt && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>完成时间：{viewingTransfer.completedAt}</div>
                )}
              </div>
            )}

            {viewingTransfer.status === 'rejected' && (
              <div style={{ padding: '12px 16px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8 }}>
                <div style={{ fontWeight: 500, color: '#ff4d4f' }}>❌ 已拒绝，库存未变动</div>
                {viewingTransfer.approvedAt && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>拒绝时间：{viewingTransfer.approvedAt}</div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TransferManagement;
