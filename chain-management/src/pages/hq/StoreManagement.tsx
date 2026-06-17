import React, { useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { Store } from '../../types';

const { Option } = Select;

const StoreManagement: React.FC = () => {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [searchText, setSearchText] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [form] = Form.useForm();

  const approvedStores = state.stores.filter(s => s.status === 'approved');
  
  const filteredStores = approvedStores.filter(store => {
    const matchSearch = store.name.includes(searchText) || store.address.includes(searchText) || store.manager.includes(searchText);
    const matchRegion = !regionFilter || store.region === regionFilter;
    return matchSearch && matchRegion;
  });

  const handleAdd = () => {
    setEditingStore(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    form.setFieldsValue(store);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_STORE', payload: id });
    message.success('门店已删除');
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (editingStore) {
        dispatch({
          type: 'UPDATE_STORE',
          payload: { ...editingStore, ...values },
        });
        message.success('门店信息已更新');
      } else {
        const newStore: Store = {
          id: `store-${Date.now()}`,
          ...values,
          status: 'approved',
          createdAt: new Date().toISOString().split('T')[0],
        };
        dispatch({ type: 'ADD_STORE', payload: newStore });
        message.success('门店添加成功');
      }
      setIsModalOpen(false);
    });
  };

  const regions = [...new Set(state.stores.map(s => s.region))];

  const columns = [
    {
      title: '门店名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Store) => (
        <Space>
          <span style={{ fontSize: '18px' }}>🏪</span>
          <span style={{ fontWeight: 500 }}>{text}</span>
          <Tag color="blue">{record.region}</Tag>
        </Space>
      ),
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: '营业时间',
      dataIndex: 'businessHours',
      key: 'businessHours',
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'approved' ? 'green' : 'orange'}>
          {status === 'approved' ? '正常营业' : '待审核'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Store) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该门店吗？" onConfirm={() => handleDelete(record.id)}>
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
      <Card
        style={{ marginBottom: '16px' }}
        bodyStyle={{ padding: '16px' }}
      >
        <Space style={{ width: '100%' }} direction="vertical" size="middle">
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
              placeholder="选择区域"
              value={regionFilter || undefined}
              onChange={setRegionFilter}
              style={{ width: 160 }}
              allowClear
            >
              {regions.map(r => (
                <Option key={r} value={r}>{r}</Option>
              ))}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加门店
            </Button>
          </Space>
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
        title={editingStore ? '编辑门店' : '添加门店'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="门店名称"
            rules={[{ required: true, message: '请输入门店名称' }]}
          >
            <Input placeholder="请输入门店名称" />
          </Form.Item>
          <Form.Item
            name="region"
            label="所属区域"
            rules={[{ required: true, message: '请选择所属区域' }]}
          >
            <Select placeholder="请选择区域">
              {regions.map(r => (
                <Option key={r} value={r}>{r}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="address"
            label="门店地址"
            rules={[{ required: true, message: '请输入门店地址' }]}
          >
            <Input placeholder="请输入门店地址" />
          </Form.Item>
          <Form.Item
            name="businessHours"
            label="营业时间"
            rules={[{ required: true, message: '请输入营业时间' }]}
          >
            <Input placeholder="例如：09:00 - 22:00" />
          </Form.Item>
          <Form.Item
            name="manager"
            label="负责人"
            rules={[{ required: true, message: '请输入负责人姓名' }]}
          >
            <Input placeholder="请输入负责人姓名" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="联系电话"
            rules={[{ required: true, message: '请输入联系电话' }]}
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StoreManagement;
