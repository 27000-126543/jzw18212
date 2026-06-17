import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown, Space, Badge } from 'antd';
import {
  ShoppingCartOutlined,
  StockOutlined,
  BarChartOutlined,
  TagOutlined,
  SwapOutlined,
  BellOutlined,
  LogoutOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import StoreOrders from './StoreOrders';
import StoreInventory from './StoreInventory';
import StoreSales from './StoreSales';
import StorePricing from './StorePricing';
import StoreTransfers from './StoreTransfers';
import StoreNotifications from './StoreNotifications';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

type TabKey = 'orders' | 'inventory' | 'sales' | 'pricing' | 'transfers' | 'notifications';

const StoreDashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('orders');
  const [unreadCount, setUnreadCount] = useState(0);

  const currentStore = state.stores.find(s => s.id === state.currentStoreId);

  useEffect(() => {
    if (state.currentStoreId) {
      const unread = state.notifications.filter(n => {
        if (n.targetType === 'all') {
          return !n.readBy.includes(state.currentStoreId!);
        }
        return n.targetStoreIds.includes(state.currentStoreId!) && !n.readBy.includes(state.currentStoreId!);
      }).length;
      setUnreadCount(unread);
    }
  }, [state.notifications, state.currentStoreId]);

  const menuItems = [
    { key: 'orders', icon: <ShoppingCartOutlined />, label: '订单管理' },
    { key: 'inventory', icon: <StockOutlined />, label: '库存管理' },
    { key: 'sales', icon: <BarChartOutlined />, label: '营业数据' },
    { key: 'pricing', icon: <TagOutlined />, label: '价格优惠' },
    { key: 'transfers', icon: <SwapOutlined />, label: '调拨申请' },
    { key: 'notifications', icon: <BellOutlined />, label: '通知公告' },
  ];

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
      case 'orders':
        return <StoreOrders />;
      case 'inventory':
        return <StoreInventory />;
      case 'sales':
        return <StoreSales />;
      case 'pricing':
        return <StorePricing />;
      case 'transfers':
        return <StoreTransfers />;
      case 'notifications':
        return <StoreNotifications />;
      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={220} style={{ position: 'fixed', height: '100vh', left: 0, top: 0, borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f0f0f0' }}>
          <ShopOutlined style={{ fontSize: '26px', color: '#1890ff' }} />
          <Title level={5} style={{ margin: 0, color: '#1890ff' }}>门店运营中心</Title>
        </div>
        <div style={{ padding: '16px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <span style={{ fontSize: '24px' }}>🏪</span>
            <div>
              <div style={{ fontWeight: 500 }}>{currentStore?.name}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>{currentStore?.region}</div>
            </div>
          </Space>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={({ key }) => setActiveTab(key as TabKey)}
          items={menuItems.map(item => ({
            ...item,
            label: (
              <span>
                {item.label}
                {item.key === 'notifications' && unreadCount > 0 && (
                  <Badge
                    count={unreadCount}
                    style={{ marginLeft: 8 }}
                    size="small"
                  />
                )}
              </span>
            ),
          }))}
          style={{ borderRight: 'none' }}
        />
      </Sider>
      <Layout style={{ marginLeft: 220 }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Title level={4} style={{ margin: 0 }}>
            {menuItems.find(item => item.key === activeTab)?.label as string}
          </Title>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ background: '#1890ff' }} />
              <span>{currentStore?.manager || '门店店长'}</span>
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

export default StoreDashboard;
