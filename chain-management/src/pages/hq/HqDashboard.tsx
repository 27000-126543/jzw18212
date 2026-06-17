import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown, Space } from 'antd';
import {
  ShopOutlined,
  PlusCircleOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  SwapOutlined,
  BellOutlined,
  LogoutOutlined,
  BankOutlined,
  UserOutlined,
  WarningOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import StoreManagement from './StoreManagement';
import FranchiseReview from './FranchiseReview';
import ProductManagement from './ProductManagement';
import DataAnalysis from './DataAnalysis';
import TransferManagement from './TransferManagement';
import NotificationManagement from './NotificationManagement';
import InventoryWarning from './InventoryWarning';
import InventoryReconciliation from './InventoryReconciliation';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

type TabKey = 'stores' | 'franchise' | 'products' | 'analysis' | 'transfers' | 'reconciliation' | 'notifications' | 'warnings';

const HqDashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('stores');

  const menuItems = [
    { key: 'stores', icon: <ShopOutlined />, label: '门店管理' },
    { key: 'franchise', icon: <PlusCircleOutlined />, label: '加盟审核' },
    { key: 'products', icon: <ShoppingOutlined />, label: '商品管理' },
    { key: 'analysis', icon: <BarChartOutlined />, label: '数据分析' },
    { key: 'transfers', icon: <SwapOutlined />, label: '调拨管理' },
    { key: 'reconciliation', icon: <FileSearchOutlined />, label: '库存对账' },
    { key: 'warnings', icon: <WarningOutlined />, label: '库存预警' },
    { key: 'notifications', icon: <BellOutlined />, label: '通知公告' },
  ];

  const pendingCount = state.stores.filter(s => s.status === 'pending').length;
  const transferPendingCount = state.transfers.filter(t => t.status === 'pending').length;

  const handleLogout = () => {
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_PAGE', payload: null });
    dispatch({ type: 'SET_CURRENT_STORE', payload: null });
  };

  const userMenu = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
    ],
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'stores':
        return <StoreManagement />;
      case 'franchise':
        return <FranchiseReview />;
      case 'products':
        return <ProductManagement />;
      case 'analysis':
        return <DataAnalysis />;
      case 'transfers':
        return <TransferManagement />;
      case 'reconciliation':
        return <InventoryReconciliation />;
      case 'warnings':
        return <InventoryWarning />;
      case 'notifications':
        return <NotificationManagement />;
      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={240} style={{ position: 'fixed', height: '100vh', left: 0, top: 0 }}>
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BankOutlined style={{ fontSize: '28px', color: '#fff' }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>总部管理中心</Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={({ key }) => setActiveTab(key as TabKey)}
          items={menuItems.map(item => ({
            ...item,
            label: (
              <span>
                {item.label}
                {item.key === 'franchise' && pendingCount > 0 && (
                  <span style={{
                    float: 'right',
                    background: '#ff4d4f',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '0 8px',
                    fontSize: '12px',
                    marginTop: '4px',
                  }}>
                    {pendingCount}
                  </span>
                )}
                {item.key === 'transfers' && transferPendingCount > 0 && (
                  <span style={{
                    float: 'right',
                    background: '#ff4d4f',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '0 8px',
                    fontSize: '12px',
                    marginTop: '4px',
                  }}>
                    {transferPendingCount}
                  </span>
                )}
              </span>
            ),
          }))}
        />
      </Sider>
      <Layout style={{ marginLeft: 240 }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Title level={3} style={{ margin: 0 }}>
            {menuItems.find(item => item.key === activeTab)?.label as string}
          </Title>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ background: '#722ed1' }} />
              <span>总部管理员</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', minHeight: 'calc(100vh - 64px - 48px)', background: '#f0f2f5' }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default HqDashboard;
