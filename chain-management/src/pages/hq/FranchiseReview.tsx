import React, { useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, Select, message, Descriptions, Badge } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { Store } from '../../types';

const FranchiseReview: React.FC = () => {
  const { state, dispatch } = useApp();
  const [viewingStore, setViewingStore] = useState<Store | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const filteredStores = state.stores.filter(store => {
    const matchSearch = store.name.includes(searchText) || store.address.includes(searchText) || store.manager.includes(searchText);
    const matchStatus = !statusFilter || store.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleApprove = (id: string) => {
    dispatch({ type: 'UPDATE_STORE_STATUS', payload: { id, status: 'approved' } });
    message.success('加盟申请已通过');
  };

  const handleReject = (id: string) => {
    dispatch({ type: 'UPDATE_STORE_STATUS', payload: { id, status: 'rejected' } });
    message.info('加盟申请已拒绝');
  };

  const pendingCount = state.stores.filter(s => s.status === 'pending').length;
  const approvedCount = state.stores.filter(s => s.status === 'approved').length;
  const rejectedCount = state.stores.filter(s => s.status === 'rejected').length;

  const statusColorMap: Record<string, string> = {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
  };

  const statusTextMap: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  };

  const columns = [
    {
      title: '门店信息',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Store) => (
        <Space>
          <span style={{ fontSize: '20px' }}>🏪</span>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ color: '#999', fontSize: '12px' }}>{record.region}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: '负责人',
      dataIndex: 'manager',
      key: 'manager',
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>
          <Badge status={status === 'pending' ? 'warning' : status === 'approved' ? 'success' : 'error'} />
          {statusTextMap[status]}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Store) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => setViewingStore(record)}>
            详情
          </Button>
          {record.status === 'pending' && (
            <>
              <Button type="link" icon={<CheckOutlined />} onClick={() => handleApprove(record.id)} style={{ color: '#52c41a' }}>
                通过
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
              <div style={{ fontSize: '12px', color: '#999' }}>待审核</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>{pendingCount}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <div style={{ fontSize: '12px', color: '#999' }}>已通过</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>{approvedCount}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>❌</span>
            <div>
              <div style={{ fontSize: '12px', color: '#999' }}>已拒绝</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>{rejectedCount}</div>
            </div>
          </div>
        </Space>
      </Card>

      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <Space wrap>
          <Input
            placeholder="搜索门店名称、地址、负责人"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
          >
            <Select.Option value="">全部状态</Select.Option>
            <Select.Option value="pending">待审核</Select.Option>
            <Select.Option value="approved">已通过</Select.Option>
            <Select.Option value="rejected">已拒绝</Select.Option>
          </Select>
        </Space>
      </Card>

      <Card>
        <Table
          dataSource={filteredStores}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="加盟申请详情"
        open={!!viewingStore}
        onCancel={() => setViewingStore(null)}
        footer={viewingStore?.status === 'pending' ? [
          <Button key="reject" danger icon={<CloseOutlined />} onClick={() => { handleReject(viewingStore.id); setViewingStore(null); }}>
            拒绝申请
          </Button>,
          <Button key="approve" type="primary" icon={<CheckOutlined />} onClick={() => { handleApprove(viewingStore.id); setViewingStore(null); }}>
            通过申请
          </Button>,
        ] : [
          <Button key="close" onClick={() => setViewingStore(null)}>关闭</Button>,
        ]}
        width={600}
      >
        {viewingStore && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="门店名称">{viewingStore.name}</Descriptions.Item>
            <Descriptions.Item label="所属区域">{viewingStore.region}</Descriptions.Item>
            <Descriptions.Item label="门店地址">{viewingStore.address}</Descriptions.Item>
            <Descriptions.Item label="营业时间">{viewingStore.businessHours}</Descriptions.Item>
            <Descriptions.Item label="负责人">{viewingStore.manager}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{viewingStore.phone}</Descriptions.Item>
            <Descriptions.Item label="申请时间">{viewingStore.createdAt}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusColorMap[viewingStore.status]}>{statusTextMap[viewingStore.status]}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default FranchiseReview;
