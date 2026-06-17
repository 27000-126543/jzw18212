import React from 'react';
import { AppProvider, useApp } from './store/AppContext';
import LoginSelector from './pages/LoginSelector';
import HqDashboard from './pages/hq/HqDashboard';
import StoreDashboard from './pages/store/StoreDashboard';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';

const AppContent: React.FC = () => {
  const { state } = useApp();

  if (!state.currentPage) {
    return <LoginSelector />;
  }

  if (state.currentPage === 'hq') {
    return <HqDashboard />;
  }

  if (state.currentPage === 'store') {
    return <StoreDashboard />;
  }

  return <LoginSelector />;
};

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{
      token: {
        colorPrimary: '#722ed1',
        borderRadius: 8,
      },
    }}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ConfigProvider>
  );
}

export default App;
