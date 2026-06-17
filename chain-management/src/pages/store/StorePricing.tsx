import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, InputNumber, Switch, message, Input, Select } from 'antd';
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
      const basePrice = product?.basePrice || 0;
      const hasValidDiscount = sp.discountEnabled && sp.discountPrice != null && sp.discountPrice > 0 && sp.discountPrice < basePrice;
      const actualPrice = hasValidDiscount ? sp.discountPrice! : basePrice;
      const discountPercent = hasValidDiscount && basePrice > 0
        ? Math.round((1 - sp.discountPrice! / basePrice) * 100)
        : 0;
      return {
        ...sp,
        product,
        name: product?.name || '',
        category: product?.category || '',
        basePrice,
        image: product?.image || '',
        actualPrice,
        discountPercent,
        discountEnabled: hasValidDiscount,
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
      discountPrice: record.discountEnabled && record.discountPrice != null ? record.discountPrice : null,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (editingProduct) {
        const basePrice = editingProduct.basePrice;
        const discountEnabled = !!values.discountEnabled;
        const discountPrice = discountEnabled && values.discountPrice != null
          ? Math.min(values.discountPrice, basePrice)
          : null;

        dispatch({
          type: 'UPDATE_STORE_PRODUCT',
          payload: {
            storeId: state.currentStoreId!,
            productId: editingProduct.productId,
            stock: editingProduct.stock,
            discountPrice,
            discountEnabled: discountEnabled && discountPrice != null && discountPrice < basePrice,
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
      render: (price: number, record: any) => (
        <span style={{
          textDecoration: record.discountEnabled ? 'line-through' : 'none',
          color: record.discountEnabled ? '#999' : '#333',
        }}>
          ¥{price.toFixed(2)}
        </span>
      ),
    },
    {
      title: '本店售价',
      key: 'actualPrice',
      render: (_: unknown, record: any) => (
        <Space direction="vertical" size={2}>
          <span style={{
            color: record.discountEnabled ? '#ff4d4f' : '#333',
            fontWeight: 'bold',
            fontSize: '16px',
          }}>
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
                <div style={{ color: '#999', fontSize: '13px' }}>
                  总部标准售价：<span style={{ fontWeight: 500, color: '#333' }}>¥{editingProduct.basePrice.toFixed(2)}</span>
                </div>
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
                  label={`优惠价格（元，最高 ¥${editingProduct ? (editingProduct.basePrice - 0.5).toFixed(2) : '0.00'}）`}
                  rules={[
                    { required: true, message: '请输入优惠价格' },
                    {
                      validator: (_, value) => {
                        if (editingProduct && value != null && value >= editingProduct.basePrice) {
                          return Promise.reject(new Error(`优惠价格必须低于标准售价 ¥${editingProduct.basePrice.toFixed(2)}`));
                        }
                        if (value != null && value <= 0) {
                          return Promise.reject(new Error('优惠价格必须大于0'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0.5}
                    max={editingProduct ? editingProduct.basePrice - 0.01 : undefined}
                    step={0.5}
                    placeholder="请输入优惠价格（需低于标准售价）"
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <div style={{
            color: '#666',
            fontSize: '12px',
            padding: '10px 12px',
            background: '#e6f7ff',
            borderRadius: 4,
            border: '1px solid #91d5ff',
          }}>
            <strong>价格规则说明：</strong>
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              <li>优惠价格必须<strong style={{ color: '#ff4d4f' }}>低于</strong>总部标准售价</li>
              <li>关闭优惠后，本店将自动使用总部标准价</li>
              <li>价格最低单位为 0.5 元</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default StorePricing;
