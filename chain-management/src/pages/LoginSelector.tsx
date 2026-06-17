import React from 'react';
import { useApp } from '../store/AppContext';
import { Button, Card, Typography, Space, Row, Col } from 'antd';
import { ShopOutlined, BankOutlined, TeamOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const LoginSelector: React.FC = () => {
  const { dispatch } = useApp();

  const handleHqLogin = () => {
    dispatch({ type: 'SET_USER', payload: { id: 'hq-admin', name: '总部管理员', role: 'hq' } });
    dispatch({ type: 'SET_PAGE', payload: 'hq' });
  };

  const handleStoreSelect = (storeId: string, storeName: string) => {
    dispatch({ type: 'SET_USER', payload: { id: `store-${storeId}`, name: storeName + '店长', role: 'store', storeId } });
    dispatch({ type: 'SET_CURRENT_STORE', payload: storeId });
    dispatch({ type: 'SET_PAGE', payload: 'store' });
  };

  const handleApply = () => {
    dispatch({ type: 'SET_PAGE', payload: 'hq' });
  };

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
                <Button size="large" block onClick={() => handleStoreSelect('store-001', '华东旗舰店')}>
                  华东旗舰店
                </Button>
                <Button size="large" block onClick={() => handleStoreSelect('store-002', '华北中心店')}>
                  华北中心店
                </Button>
                <Button size="large" block onClick={() => handleStoreSelect('store-003', '华南体验店')}>
                  华南体验店
                </Button>
                <Button size="large" block onClick={() => handleStoreSelect('store-004', '西南分店')}>
                  西南分店
                </Button>
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
              <Button size="large" block onClick={handleApply}>
                立即申请加盟
              </Button>
            </Card>
          </Col>
        </Row>

        <div style={{ textAlign: 'center', marginTop: '48px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          © 2025 连锁品牌管理系统 - 让品牌管理更简单
        </div>
      </div>
    </div>
  );
};

export default LoginSelector;
