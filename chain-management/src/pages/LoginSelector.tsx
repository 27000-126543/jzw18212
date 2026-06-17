import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Button, Card, Typography, Space, Row, Col, Modal, Form, Input, Select } from 'antd';
import { ShopOutlined, BankOutlined, TeamOutlined } from '@ant-design/icons';
import type { Store } from '../types';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const regionOptions = ['华东区', '华北区', '华南区', '西南区', '华中区', '东北区', '西北区'];

const LoginSelector: React.FC = () => {
  const { state, dispatch } = useApp();
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applySuccessOpen, setApplySuccessOpen] = useState(false);
  const [applyForm] = Form.useForm();

  const handleHqLogin = () => {
    dispatch({ type: 'SET_USER', payload: { id: 'hq-admin', name: '总部管理员', role: 'hq' } });
    dispatch({ type: 'SET_PAGE', payload: 'hq' });
  };

  const handleStoreSelect = (storeId: string, storeName: string) => {
    dispatch({ type: 'SET_USER', payload: { id: `store-${storeId}`, name: storeName + '店长', role: 'store', storeId } });
    dispatch({ type: 'SET_CURRENT_STORE', payload: storeId });
    dispatch({ type: 'SET_PAGE', payload: 'store' });
  };

  const handleApplySubmit = () => {
    applyForm.validateFields().then(values => {
      const newStore: Store = {
        id: `store-${Date.now()}`,
        name: values.name,
        address: values.address,
        region: values.region,
        businessHours: values.businessHours,
        manager: values.manager,
        phone: values.phone,
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0],
      };
      dispatch({ type: 'ADD_STORE', payload: newStore });
      applyForm.resetFields();
      setApplyModalOpen(false);
      setApplySuccessOpen(true);
    });
  };

  const approvedStores = state.stores.filter(s => s.status === 'approved');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <Title style={{ color: '#fff', fontSize: '42px', marginBottom: '12px' }}>
            连锁品牌管理系统
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.85)', fontSize: '16px' }}>
            总部统一管理 · 门店独立运营 · 数据实时同步
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={8}>
            <Card
              hoverable
              style={{ height: '100%', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              bodyStyle={{ padding: '32px', textAlign: 'center' }}
            >
              <div style={{ fontSize: '64px', marginBottom: '20px', color: '#722ed1' }}>
                <BankOutlined />
              </div>
              <Title level={3} style={{ marginBottom: '12px' }}>总部管理后台</Title>
              <Paragraph type="secondary" style={{ marginBottom: '24px', minHeight: '48px' }}>
                门店管理 · 商品定价 · 数据分析 · 库存调拨
              </Paragraph>
              <Button type="primary" size="large" block onClick={handleHqLogin}>
                进入总部后台
              </Button>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              hoverable
              style={{ height: '100%', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              bodyStyle={{ padding: '32px', textAlign: 'center' }}
            >
              <div style={{ fontSize: '64px', marginBottom: '20px', color: '#1890ff' }}>
                <ShopOutlined />
              </div>
              <Title level={3} style={{ marginBottom: '12px' }}>门店运营后台</Title>
              <Paragraph type="secondary" style={{ marginBottom: '24px', minHeight: '48px' }}>
                订单管理 · 库存查询 · 营业数据 · 价格优惠
              </Paragraph>
              <Space direction="vertical" style={{ width: '100%' }}>
                {approvedStores.map(store => (
                  <Button key={store.id} size="large" block onClick={() => handleStoreSelect(store.id, store.name)}>
                    {store.name}
                  </Button>
                ))}
                {approvedStores.length === 0 && (
                  <Paragraph type="secondary" style={{ fontSize: '13px' }}>
                    暂无已审核通过的门店
                  </Paragraph>
                )}
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              hoverable
              style={{ height: '100%', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              bodyStyle={{ padding: '32px', textAlign: 'center' }}
            >
              <div style={{ fontSize: '64px', marginBottom: '20px', color: '#52c41a' }}>
                <TeamOutlined />
              </div>
              <Title level={3} style={{ marginBottom: '12px' }}>申请加盟</Title>
              <Paragraph type="secondary" style={{ marginBottom: '24px', minHeight: '48px' }}>
                提交加盟申请，等待总部审核，开启您的创业之旅
              </Paragraph>
              <Button size="large" type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} block onClick={() => setApplyModalOpen(true)}>
                立即申请加盟
              </Button>
            </Card>
          </Col>
        </Row>

        <div style={{ textAlign: 'center', marginTop: '48px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          © 2025 连锁品牌管理系统 - 让品牌管理更简单
        </div>
      </div>

      <Modal
        title="加盟申请"
        open={applyModalOpen}
        onCancel={() => setApplyModalOpen(false)}
        onOk={handleApplySubmit}
        okText="提交申请"
        cancelText="取消"
        width={520}
        maskClosable={false}
      >
        <Paragraph type="secondary" style={{ marginTop: '-8px', marginBottom: '16px', fontSize: '13px' }}>
          请填写以下信息，总部将在 1-3 个工作日内审核您的申请
        </Paragraph>
        <Form form={applyForm} layout="vertical">
          <Form.Item name="name" label="门店名称" rules={[{ required: true, message: '请输入门店名称' }]}>
            <Input placeholder="如：上海浦东新区加盟店" maxLength={30} />
          </Form.Item>
          <Form.Item name="region" label="所属区域" rules={[{ required: true, message: '请选择所属区域' }]}>
            <Select placeholder="请选择区域">
              {regionOptions.map(r => <Option key={r} value={r}>{r}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="address" label="门店地址" rules={[{ required: true, message: '请输入门店详细地址' }]}>
            <Input placeholder="请输入详细地址，如：XX市XX区XX路XX号" maxLength={100} />
          </Form.Item>
          <Form.Item name="businessHours" label="营业时间" rules={[{ required: true, message: '请输入营业时间' }]}>
            <Input placeholder="如：09:00 - 22:00" maxLength={30} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="manager" label="负责人姓名" rules={[{ required: true, message: '请输入负责人姓名' }]}>
                <Input placeholder="请输入负责人姓名" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="联系电话"
                rules={[
                  { required: true, message: '请输入联系电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' },
                ]}
              >
                <Input placeholder="请输入11位手机号" maxLength={11} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="申请已提交"
        open={applySuccessOpen}
        onCancel={() => setApplySuccessOpen(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setApplySuccessOpen(false)}>
            我知道了
          </Button>,
        ]}
        width={480}
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <Title level={4} style={{ marginBottom: '12px' }}>加盟申请已提交成功！</Title>
          <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
            您的申请已进入总部审核队列，请耐心等待<br />
            审核结果将通过短信通知您的联系电话
          </Paragraph>
          <Card size="small" style={{ background: '#fafafa', textAlign: 'left' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              💡 提示：您也可以让负责人直接进入「总部管理后台」→「加盟审核」页面，查看申请并手动审核通过。
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
};

export default LoginSelector;
