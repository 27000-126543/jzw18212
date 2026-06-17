import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Input, Select, Progress, message } from 'antd';
import { SearchOutlined, WarningOutlined, PlusOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';

const StoreInventory: React.FC = () => {
  const { state, dispatch } = useApp();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

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

  const handleRequestTransfer = (productId: string, productName: string) => {
    const confirm = window.confirm(`确定申请调拨 ${productName} 吗？`);
    if (confirm) {
      message.info('请前往调拨申请页面提交申请');
    }
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
          {record.stock < 30 && (
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleRequestTransfer(record.productId, record.name)}>
              申请补货
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
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
  );
};

export default StoreInventory;
