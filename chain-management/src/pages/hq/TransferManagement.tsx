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
    dispatch({ type: 'UPDATE_TRANSFER_STATUS', payload: { id, status: 'approved' } });
    message.success('调拨申请已批准');
  };

  const handleReject = (id: string) => {
    dispatch({ type: 'UPDATE_TRANSFER_STATUS', payload: { id, status: 'rejected' } });
    message.info('调拨申请已拒绝');
  };

  const handleComplete = (id: string) => {
    dispatch({ type: 'UPDATE_TRANSFER_STATUS', payload: { id, status: 'completed' } });
    message.success('调拨已完成，库存已更新');
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
  const totalCount = state.transfers.length;

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
      title: '调出方',
      dataIndex: 'fromStoreId',
      key: 'fromStoreId',
      render: (id: string, record: TransferRequest) => (
        <span>{record.type === 'to-hq' ? '总部仓库' : storeMap[id] || id}</span>
      ),
    },
    {
      title: '调入方',
      dataIndex: 'toStoreId',
      key: 'toStoreId',
      render: (id: string, record: TransferRequest) => (
        <span>{record.type === 'to-hq' ? storeMap[record.fromStoreId] : storeMap[id] || id}</span>
      ),
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
          {record.status === 'pending' && (
            <>
              <Button type="link" icon={<CheckOutlined />} onClick={() => handleApprove(record.id)} style={{ color: '#52c41a' }}>
                批准
              </Button>
              <Button type="link" danger icon={<CloseOutlined />} onClick={() => handleReject(record.id)}>
                拒绝
              </Button>
            </>
          )}
          {record.status === 'approved' && (
            <Button type="link" onClick={() => handleComplete(record.id)}>
              确认完成
            </Button>
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
            <span style={{ fontSize: '28px' }}>📋</span>
            <div>
              <div style={{ fontSize: '12px', color: '#999' }}>总调拨单</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>{totalCount}</div>
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
            <Select.Option value="approved">已批准</Select.Option>
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
            批准
          </Button>,
        ] : viewingTransfer?.status === 'approved' ? [
          <Button key="complete" type="primary" onClick={() => { handleComplete(viewingTransfer.id); setViewingTransfer(null); }}>
            确认完成
          </Button>,
        ] : [
          <Button key="close" onClick={() => setViewingTransfer(null)}>关闭</Button>,
        ]}
        width={600}
      >
        {viewingTransfer && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="调拨单号">{viewingTransfer.id}</Descriptions.Item>
            <Descriptions.Item label="商品名称">{viewingTransfer.productName}</Descriptions.Item>
            <Descriptions.Item label="调拨数量">{viewingTransfer.quantity} 件</Descriptions.Item>
            <Descriptions.Item label="调拨类型">
              <Tag color={viewingTransfer.type === 'to-hq' ? 'purple' : 'cyan'}>
                {typeTextMap[viewingTransfer.type]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="调出方">
              {viewingTransfer.type === 'to-hq' ? '总部仓库' : storeMap[viewingTransfer.fromStoreId]}
            </Descriptions.Item>
            <Descriptions.Item label="调入方">
              {viewingTransfer.type === 'to-hq' ? storeMap[viewingTransfer.fromStoreId] : storeMap[viewingTransfer.toStoreId]}
            </Descriptions.Item>
            <Descriptions.Item label="申请时间">{viewingTransfer.createdAt}</Descriptions.Item>
            {viewingTransfer.approvedAt && (
              <Descriptions.Item label="审批时间">{viewingTransfer.approvedAt}</Descriptions.Item>
            )}
            <Descriptions.Item label="状态">
              <Tag color={statusColorMap[viewingTransfer.status]}>{statusTextMap[viewingTransfer.status]}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default TransferManagement;
