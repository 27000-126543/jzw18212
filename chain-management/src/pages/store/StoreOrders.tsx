import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Descriptions, Select, Input, DatePicker } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { Order } from '../../types';
import dayjs from 'dayjs';

const StoreOrders: React.FC = () => {
  const { state } = useApp();
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState<dayjs.Dayjs | null>(null);

  const storeOrders = useMemo(() => {
    return state.orders.filter(o => o.storeId === state.currentStoreId);
  }, [state.orders, state.currentStoreId]);

  const filteredOrders = useMemo(() => {
    return storeOrders.filter(order => {
      const matchStatus = !statusFilter || order.status === statusFilter;
      const matchSearch = !searchText || order.id.includes(searchText) || order.customerPhone?.includes(searchText);
      const matchDate = !dateFilter || dayjs(order.createdAt).isSame(dateFilter, 'day');
      return matchStatus && matchSearch && matchDate;
    });
  }, [storeOrders, statusFilter, searchText, dateFilter]);

  const statusColorMap: Record<string, string> = {
    pending: 'orange',
    completed: 'green',
    cancelled: 'red',
  };

  const statusTextMap: Record<string, string> = {
    pending: '待处理',
    completed: '已完成',
    cancelled: '已取消',
  };

  const completedOrders = storeOrders.filter(o => o.status === 'completed');
  const totalSales = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const columns = [
    {
      title: '订单号',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <span style={{ fontFamily: 'monospace', color: '#1890ff' }}>{text}</span>,
    },
    {
      title: '商品数量',
      key: 'itemCount',
      render: (_: unknown, record: Order) => (
        <span>{record.items.reduce((sum, item) => sum + item.quantity, 0)} 件</span>
      ),
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => <span style={{ color: '#ff4d4f', fontWeight: 500 }}>¥{amount.toFixed(2)}</span>,
    },
    {
      title: '顾客手机',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
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
      title: '下单时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Order) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => setViewingOrder(record)}>
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Space size={[16, 16]} wrap>
          <Card style={{ minWidth: 200 }}>
            <div style={{ fontSize: '12px', color: '#999' }}>今日订单</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
              {storeOrders.filter(o => dayjs(o.createdAt).isSame(dayjs(), 'day')).length}
            </div>
          </Card>
          <Card style={{ minWidth: 200 }}>
            <div style={{ fontSize: '12px', color: '#999' }}>今日销售额</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
              ¥{storeOrders
                .filter(o => dayjs(o.createdAt).isSame(dayjs(), 'day') && o.status === 'completed')
                .reduce((sum, o) => sum + o.totalAmount, 0)
                .toFixed(2)}
            </div>
          </Card>
          <Card style={{ minWidth: 200 }}>
            <div style={{ fontSize: '12px', color: '#999' }}>累计订单</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
              {storeOrders.length}
            </div>
          </Card>
          <Card style={{ minWidth: 200 }}>
            <div style={{ fontSize: '12px', color: '#999' }}>累计销售额</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
              ¥{totalSales.toFixed(2)}
            </div>
          </Card>
        </Space>
      </div>

      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <Space wrap>
          <Input
            placeholder="搜索订单号、手机号"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="订单状态"
            value={statusFilter || undefined}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            allowClear
          >
            <Select.Option value="pending">待处理</Select.Option>
            <Select.Option value="completed">已完成</Select.Option>
            <Select.Option value="cancelled">已取消</Select.Option>
          </Select>
          <DatePicker
            value={dateFilter}
            onChange={setDateFilter}
            placeholder="选择日期"
          />
        </Space>
      </Card>

      <Card>
        <Table
          dataSource={filteredOrders}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="订单详情"
        open={!!viewingOrder}
        onCancel={() => setViewingOrder(null)}
        footer={[
          <Button key="close" onClick={() => setViewingOrder(null)}>关闭</Button>,
        ]}
        width={600}
      >
        {viewingOrder && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: '16px' }}>
              <Descriptions.Item label="订单号">{viewingOrder.id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColorMap[viewingOrder.status]}>{statusTextMap[viewingOrder.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="下单时间">{viewingOrder.createdAt}</Descriptions.Item>
              <Descriptions.Item label="顾客手机">{viewingOrder.customerPhone || '-'}</Descriptions.Item>
            </Descriptions>
            <Card title="商品明细" size="small">
              <Table
                dataSource={viewingOrder.items}
                rowKey="productId"
                size="small"
                pagination={false}
                columns={[
                  { title: '商品名称', dataIndex: 'productName', key: 'productName' },
                  { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', render: (p: number) => `¥${p.toFixed(2)}` },
                  { title: '数量', dataIndex: 'quantity', key: 'quantity' },
                  { title: '小计', key: 'subtotal', render: (_: unknown, r: { unitPrice: number; quantity: number }) => `¥${(r.unitPrice * r.quantity).toFixed(2)}` },
                ]}
              />
            </Card>
            <div style={{ textAlign: 'right', marginTop: '12px', fontSize: '16px' }}>
              合计：<span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{viewingOrder.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StoreOrders;
