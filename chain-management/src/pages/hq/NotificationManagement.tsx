import React, { useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, Select, message, Descriptions, Switch } from 'antd';
import { PlusOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { Notice } from '../../types';

const { TextArea } = Input;
const { Option } = Select;

const NotificationManagement: React.FC = () => {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingNotif, setViewingNotif] = useState<Notice | null>(null);
  const [form] = Form.useForm();

  const approvedStores = state.stores.filter(s => s.status === 'approved');

  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({ targetType: 'all', targetStoreIds: [] });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const newNotif: Notice = {
        id: `notif-${Date.now()}`,
        title: values.title,
        content: values.content,
        targetType: values.targetType,
        targetStoreIds: values.targetType === 'all' ? [] : values.targetStoreIds || [],
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        readBy: [],
      };
      dispatch({ type: 'ADD_NOTIFICATION', payload: newNotif });
      message.success('通知已发布');
      setIsModalOpen(false);
    });
  };

  const readCount = (notif: Notice) => {
    if (notif.targetType === 'all') {
      return notif.readBy.length;
    }
    return notif.readBy.filter(id => notif.targetStoreIds.includes(id)).length;
  };

  const targetCount = (notif: Notice) => {
    if (notif.targetType === 'all') {
      return approvedStores.length;
    }
    return notif.targetStoreIds.length;
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '发送范围',
      dataIndex: 'targetType',
      key: 'targetType',
      render: (type: string, record: Notice) => (
        <Tag color={type === 'all' ? 'blue' : 'purple'}>
          {type === 'all' ? '全部门店' : `指定门店 (${record.targetStoreIds.length}家)`}
        </Tag>
      ),
    },
    {
      title: '已读情况',
      key: 'readStatus',
      render: (_: unknown, record: Notice) => {
        const total = targetCount(record);
        const read = readCount(record);
        const percent = total > 0 ? (read / total) * 100 : 0;
        return (
          <Space>
            <div style={{ width: 100, height: 8, background: '#e8e8e8', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${percent}%`, height: '100%', background: percent === 100 ? '#52c41a' : '#1890ff', borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: '12px', color: '#666' }}>{read}/{total}</span>
          </Space>
        );
      },
    },
    {
      title: '发布时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Notice) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => setViewingNotif(record)}>
            查看
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            发布新通知
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          dataSource={state.notifications}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="发布新通知"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={600}
        okText="发布"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="通知标题"
            rules={[{ required: true, message: '请输入通知标题' }]}
          >
            <Input placeholder="请输入通知标题" maxLength={50} showCount />
          </Form.Item>
          <Form.Item
            name="targetType"
            label="发送范围"
            rules={[{ required: true, message: '请选择发送范围' }]}
          >
            <Select>
              <Option value="all">全部门店</Option>
              <Option value="specific">指定门店</Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.targetType !== curr.targetType}
          >
            {({ getFieldValue }) =>
              getFieldValue('targetType') === 'specific' ? (
                <Form.Item
                  name="targetStoreIds"
                  label="选择门店"
                  rules={[{ required: true, message: '请选择门店' }]}
                >
                  <Select mode="multiple" placeholder="请选择门店" style={{ width: '100%' }}>
                    {approvedStores.map(s => (
                      <Option key={s.id} value={s.id}>{s.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item
            name="content"
            label="通知内容"
            rules={[{ required: true, message: '请输入通知内容' }]}
          >
            <TextArea rows={6} placeholder="请输入通知内容" maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="通知详情"
        open={!!viewingNotif}
        onCancel={() => setViewingNotif(null)}
        footer={[
          <Button key="close" onClick={() => setViewingNotif(null)}>关闭</Button>,
        ]}
        width={600}
      >
        {viewingNotif && (
          <div>
            <Descriptions column={1} bordered style={{ marginBottom: '16px' }}>
              <Descriptions.Item label="通知标题">{viewingNotif.title}</Descriptions.Item>
              <Descriptions.Item label="发送范围">
                <Tag color={viewingNotif.targetType === 'all' ? 'blue' : 'purple'}>
                  {viewingNotif.targetType === 'all' ? '全部门店' : `指定门店 (${viewingNotif.targetStoreIds.length}家)`}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="发布时间">{viewingNotif.createdAt}</Descriptions.Item>
              <Descriptions.Item label="已读情况">
                {readCount(viewingNotif)} / {targetCount(viewingNotif)} 家门店已读
              </Descriptions.Item>
            </Descriptions>
            <Card title="通知内容" size="small">
              <p style={{ lineHeight: 1.8, margin: 0 }}>{viewingNotif.content}</p>
            </Card>
            {viewingNotif.targetType === 'specific' && viewingNotif.targetStoreIds.length > 0 && (
              <Card title="接收门店" size="small" style={{ marginTop: '16px' }}>
                <Space wrap>
                  {viewingNotif.targetStoreIds.map(id => {
                    const store = state.stores.find(s => s.id === id);
                    const isRead = viewingNotif.readBy.includes(id);
                    return (
                      <Tag key={id} color={isRead ? 'green' : 'default'} icon={isRead ? <CheckOutlined /> : undefined}>
                        {store?.name || id}
                      </Tag>
                    );
                  })}
                </Space>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NotificationManagement;
