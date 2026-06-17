import React, { useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, Select, InputNumber, message, Popconfirm, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { Product } from '../../types';

const ProductManagement: React.FC = () => {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [form] = Form.useForm();

  const filteredProducts = state.products.filter(product => {
    const matchSearch = product.name.includes(searchText) || product.description.includes(searchText);
    const matchCategory = !categoryFilter || product.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const categories = [...new Set(state.products.map(p => p.category))];
  const emojiList = ['☕', '🍵', '🧊', '🍰', '🍮', '🥪', '🥗', '🍩', '🧁', '🍪'];

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.setFieldsValue(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_PRODUCT', payload: id });
    message.success('商品已删除');
  };

  const handleStatusChange = (product: Product, checked: boolean) => {
    dispatch({
      type: 'UPDATE_PRODUCT',
      payload: { ...product, status: checked ? 'active' : 'inactive' },
    });
    message.success(`商品已${checked ? '上架' : '下架'}`);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (editingProduct) {
        dispatch({
          type: 'UPDATE_PRODUCT',
          payload: { ...editingProduct, ...values },
        });
        message.success('商品已更新');
      } else {
        const newProduct: Product = {
          id: `prod-${Date.now()}`,
          ...values,
          image: emojiList[Math.floor(Math.random() * emojiList.length)],
          createdAt: new Date().toISOString().split('T')[0],
        };
        dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
        message.success('商品已添加，已同步至所有门店');
      }
      setIsModalOpen(false);
    });
  };

  const columns = [
    {
      title: '商品信息',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Product) => (
        <Space>
          <span style={{ fontSize: '32px' }}>{record.image}</span>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ color: '#999', fontSize: '12px' }}>{record.description}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '标准售价',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (price: number) => <span style={{ color: '#ff4d4f', fontWeight: 500 }}>¥{price.toFixed(2)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (_: unknown, record: Product) => (
        <Switch
          checked={record.status === 'active'}
          onChange={checked => handleStatusChange(record, checked)}
          checkedChildren="上架"
          unCheckedChildren="下架"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Product) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该商品吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <Space wrap>
          <Input
            placeholder="搜索商品名称、描述"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder="选择分类"
            value={categoryFilter || undefined}
            onChange={setCategoryFilter}
            style={{ width: 160 }}
            allowClear
          >
            {categories.map(c => (
              <Select.Option key={c} value={c}>{c}</Select.Option>
            ))}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加商品
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          dataSource={filteredProducts}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingProduct ? '编辑商品' : '添加商品'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={500}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="商品名称"
            rules={[{ required: true, message: '请输入商品名称' }]}
          >
            <Input placeholder="请输入商品名称" />
          </Form.Item>
          <Form.Item
            name="category"
            label="商品分类"
            rules={[{ required: true, message: '请选择商品分类' }]}
          >
            <Select placeholder="请选择分类">
              {categories.map(c => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="basePrice"
            label="标准售价（元）"
            rules={[{ required: true, message: '请输入标准售价' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={0.5}
              placeholder="请输入标准售价"
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="商品描述"
            rules={[{ required: true, message: '请输入商品描述' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入商品描述" />
          </Form.Item>
          <Form.Item
            name="status"
            label="商品状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductManagement;
