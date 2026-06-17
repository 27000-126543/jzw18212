import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Input, Select, Progress, message, Modal, Form, InputNumber, Tabs } from 'antd';
import { SearchOutlined, WarningOutlined, PlusOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { TransferRequest } from '../../types';
import StoreInventoryLogs from './StoreInventoryLogs';

interface StoreInventoryProps {
  onGoToTransfers?: () => void;
}

const StoreInventory: React.FC<StoreInventoryProps> = ({ onGoToTransfers }) => {
  const { state, dispatch } = useApp();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [replenishModal, setReplenishModal] = useState<{productId: string; name: string} | null>(null);
  const [replenishForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>('list');

  const storeProducts = useMemo(() => {
    return state.storeProducts.filter(sp => sp.storeId === state.currentStoreId);
  }, [state.storeProducts, state.currentStoreId]);

  const productsWithStock = useMemo(() => {
    return storeProducts.map(sp => {
      const product = state.products.find(p => p.id === sp.productId);
      return {
        ...sp,
        product,
        name: product?.name || '',
        category: product?.category || '',
        basePrice: product?.basePrice || 0,
        image: product?.image || '',
      };
    }).filter(item => item.product);
  }, [storeProducts, state.products]);

  const filteredProducts = productsWithStock.filter(p => {
    const matchSearch = p.name.includes(searchText) || p.category.includes(searchText);
    let matchStatus = true;
    if (statusFilter === 'low') {
      matchStatus = p.stock < 30;
    } else if (statusFilter === 'normal') {
      matchStatus = p.stock >= 30 && p.stock < 80;
    } else if (statusFilter === 'sufficient') {
      matchStatus = p.stock >= 80;
    }
    return matchSearch && matchStatus;
  });

  const lowStockCount = productsWithStock.filter(p => p.stock < 30).length;
  const totalStock = productsWithStock.reduce((sum, p) => sum + p.stock, 0);

  const getStockStatus = (stock: number) => {
    if (stock < 30) return { color: '#ff4d4f', text: '库存告急', status: 'error' };
    if (stock < 80) return { color: '#faad14', text: '库存偏低', status: 'warning' };
    return { color: '#52c41a', text: '库存充足', status: 'success' };
  };

  const handleRequestTransfer = (productId: string, name: string) => {
    setReplenishModal({ productId, name });
    replenishForm.setFieldsValue({ quantity: 20 });
  };

  const handleReplenishSubmit = () => {
    replenishForm.validateFields().then(values => {
      if (!replenishModal) return;
      const transfer: TransferRequest = {
        id: `transfer-${Date.now()}`,
        fromStoreId: state.currentStoreId!,
        toStoreId: 'hq',
        productId: replenishModal.productId,
        productName: replenishModal.name,
        quantity: values.quantity,
        status: 'pending',
        type: 'to-hq',
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      };
      dispatch({ type: 'ADD_TRANSFER', payload: transfer });
      message.success('补货申请已提交，自动跳转到调拨申请页');
      setReplenishModal(null);
      replenishForm.resetFields();
      if (onGoToTransfers) {
        setTimeout(() => onGoToTransfers(), 300);
      }
    });
  };

  const columns = [
    {
      title: '商品',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          <span style={{ fontSize: '28px' }}>{record.image}</span>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ color: '#999', fontSize: '12px' }}>{record.category}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '库存数量',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: number) => {
        const status = getStockStatus(stock);
        return (
          <Space>
            <span style={{ fontWeight: 500, color: status.color }}>{stock} 件</span>
            {stock < 30 && <WarningOutlined style={{ color: '#ff4d4f' }} />}
          </Space>
        );
      },
      sorter: (a: any, b: any) => a.stock - b.stock,
    },
    {
      title: '库存状态',
      key: 'status',
      render: (_: unknown, record: any) => {
        const status = getStockStatus(record.stock);
        const percent = Math.min(record.stock, 100);
        return (
          <div style={{ width: 120 }}>
            <Progress percent={percent} size="small" status={status.status as any} showInfo={false} />
            <Tag color={status.status === 'success' ? 'green' : status.status === 'warning' ? 'orange' : 'red'} style={{ marginTop: 4 }}>
              {status.text}
            </Tag>
          </div>
        );
      },
    },
    {
      title: '标准售价',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (price: number) => <span>¥{price.toFixed(2)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: any) => (
        <Space>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleRequestTransfer(record.productId, record.name)}>
            申请补货
          </Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'list',
      label: '库存列表',
      children: (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Space size={[16, 16]} wrap>
              <Card style={{ minWidth: 200 }}>
                <div style={{ fontSize: '12px', color: '#999' }}>商品种类</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                  {productsWithStock.length}
                </div>
              </Card>
              <Card style={{ minWidth: 200 }}>
                <div style={{ fontSize: '12px', color: '#999' }}>库存总量</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  {totalStock} 件
                </div>
              </Card>
              <Card style={{ minWidth: 200 }}>
                <div style={{ fontSize: '12px', color: '#999' }}>库存告急</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: lowStockCount > 0 ? '#ff4d4f' : '#52c41a' }}>
                  {lowStockCount} 种
                </div>
              </Card>
            </Space>
          </div>

          <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
            <Space wrap>
              <Input
                placeholder="搜索商品名称、分类"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 240 }}
                allowClear
              />
              <Select
                placeholder="库存状态"
                value={statusFilter || undefined}
                onChange={setStatusFilter}
                style={{ width: 140 }}
                allowClear
              >
                <Select.Option value="low">库存告急</Select.Option>
                <Select.Option value="normal">库存偏低</Select.Option>
                <Select.Option value="sufficient">库存充足</Select.Option>
              </Select>
            </Space>
          </Card>

          <Card>
            <Table
              dataSource={filteredProducts}
              columns={columns}
              rowKey="productId"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'logs',
      label: '库存流水',
      children: <StoreInventoryLogs />,
    },
  ];

  return (
    <div>
      <Card bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarStyle={{ padding: '0 24px', margin: 0 }}
        />
      </Card>

      <Modal
        title="申请补货"
        open={!!replenishModal}
        onOk={handleReplenishSubmit}
        onCancel={() => setReplenishModal(null)}
        width={420}
        okText="提交申请"
        cancelText="取消"
      >
        {replenishModal && (
          <Form form={replenishForm} layout="vertical">
            <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ fontWeight: 500 }}>{replenishModal.name}</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                补货来源：总部仓库
              </div>
            </div>
            <Form.Item
              name="quantity"
              label="补货数量（件）"
              rules={[{ required: true, message: '请输入补货数量' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={999}
                placeholder="请输入补货数量"
              />
            </Form.Item>
            <div style={{ fontSize: '12px', color: '#999' }}>
              提交后将进入调拨申请列表，等待总部审批后自动入库
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default StoreInventory;
