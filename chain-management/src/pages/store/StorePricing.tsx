import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, InputNumber, Switch, message, Input } from 'antd';
import { EditOutlined, SearchOutlined, TagOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';

const StorePricing: React.FC = () => {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [form] = Form.useForm();

  const storeProducts = useMemo(() => {
    return state.storeProducts.filter(sp => sp.storeId === state.currentStoreId);
  }, [state.storeProducts, state.currentStoreId]);

  const productsWithInfo = useMemo(() => {
    return storeProducts.map(sp => {
      const product = state.products.find(p => p.id === sp.productId);
      const actualPrice = sp.discountEnabled && sp.discountPrice ? sp.discountPrice : product?.basePrice || 0;
      const discountPercent = product?.basePrice && sp.discountPrice
        ? Math.round((1 - sp.discountPrice / product.basePrice) * 100)
        : 0;
      return {
        ...sp,
        product,
        name: product?.name || '',
        category: product?.category || '',
        basePrice: product?.basePrice || 0,
        image: product?.image || '',
        actualPrice,
        discountPercent,
      };
    }).filter(item => item.product);
  }, [storeProducts, state.products]);

  const filteredProducts = productsWithInfo.filter(p => {
    const matchSearch = p.name.includes(searchText) || p.category.includes(searchText);
    const matchStatus = !statusFilter || 
      (statusFilter === 'discount' && p.discountEnabled) ||
      (statusFilter === 'normal' && !p.discountEnabled);
    return matchSearch && matchStatus;
  });

  const discountCount = productsWithInfo.filter(p => p.discountEnabled).length;

  const handleEdit = (record: any) => {
    setEditingProduct(record);
    form.setFieldsValue({
      discountEnabled: record.discountEnabled,
      discountPrice: record.discountPrice,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (editingProduct) {
        dispatch({
          type: 'UPDATE_STORE_PRODUCT',
          payload: {
            storeId: state.currentStoreId!,
            productId: editingProduct.productId,
            stock: editingProduct.stock,
            discountPrice: values.discountEnabled ? values.discountPrice : null,
            discountEnabled: values.discountEnabled,
          },
        });
        message.success('价格优惠已更新');
      }
      setIsModalOpen(false);
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
      title: '标准售价',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (price: number) => <span style={{ textDecoration: 'line-through', color: '#999' }}>¥{price.toFixed(2)}</span>,
    },
    {
      title: '本店售价',
      key: 'actualPrice',
      render: (_: unknown, record: any) => (
        <Space direction="vertical" size={0}>
          <span style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: '16px' }}>
            ¥{record.actualPrice.toFixed(2)}
          </span>
          {record.discountEnabled && record.discountPercent > 0 && (
            <Tag color="red" style={{ margin: 0 }}>
              省{record.discountPercent}%
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '优惠状态',
      dataIndex: 'discountEnabled',
      key: 'discountEnabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'red' : 'default'} icon={enabled ? <TagOutlined /> : undefined}>
          {enabled ? '优惠中' : '标准价'}
        </Tag>
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: number) => (
        <span style={{ color: stock < 30 ? '#ff4d4f' : undefined }}>{stock} 件</span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            设置价格
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
            <div style={{ fontSize: '12px', color: '#999' }}>商品总数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
              {productsWithInfo.length}
            </div>
          </Card>
          <Card style={{ minWidth: 200 }}>
            <div style={{ fontSize: '12px', color: '#999' }}>优惠商品</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
              {discountCount} 种
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
          <Select placeholder="优惠状态" value={statusFilter || undefined} onChange={setStatusFilter} style={{ width: 140 }} allowClear>
            <Select.Option value="discount">优惠中</Select.Option>
            <Select.Option value="normal">标准价</Select.Option>
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

      <Modal
        title="设置商品价格优惠"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={480}
        okText="保存"
        cancelText="取消"
      >
        {editingProduct && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', borderRadius: 8 }}>
            <Space>
              <span style={{ fontSize: '32px' }}>{editingProduct.image}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{editingProduct.name}</div>
                <div style={{ color: '#999', fontSize: '13px' }}>标准售价：¥{editingProduct.basePrice.toFixed(2)}</div>
              </div>
            </Space>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="discountEnabled"
            label="开启价格优惠"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.discountEnabled !== curr.discountEnabled}
          >
            {({ getFieldValue }) =>
              getFieldValue('discountEnabled') ? (
                <Form.Item
                  name="discountPrice"
                  label="优惠价格（元）"
                  rules={[
                    { required: true, message: '请输入优惠价格' },
                    { type: 'number', min: 0, message: '价格不能为负数' },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={0.5}
                    placeholder="请输入优惠价格"
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <div style={{ color: '#999', fontSize: '12px', padding: '8px', background: '#fffbe6', borderRadius: 4 }}>
            💡 提示：优惠价格不得高于标准售价，折扣需在总部授权范围内设置
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default StorePricing;
