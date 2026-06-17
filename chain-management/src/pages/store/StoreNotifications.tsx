import React, { useState, useMemo } from 'react';
import { Card, List, Tag, Button, Modal, Empty, Badge } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { Notice } from '../../types';

const StoreNotifications: React.FC = () => {
  const { state, dispatch } = useApp();
  const [viewingNotif, setViewingNotif] = useState<Notice | null>(null);

  const storeNotifications = useMemo(() => {
    return state.notifications.filter(n => {
      if (n.targetType === 'all') return true;
      return n.targetStoreIds.includes(state.currentStoreId!);
    });
  }, [state.notifications, state.currentStoreId]);

  const isRead = (notif: Notice) => {
    return notif.readBy.includes(state.currentStoreId!);
  };

  const handleView = (notif: Notice) => {
    setViewingNotif(notif);
    if (!isRead(notif)) {
      dispatch({
        type: 'MARK_NOTIFICATION_READ',
        payload: { notificationId: notif.id, storeId: state.currentStoreId! },
      });
    }
  };

  const unreadCount = storeNotifications.filter(n => !isRead(n)).length;

  return (
    <div>
      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Badge count={unreadCount}>
            <BellOutlined style={{ fontSize: '36px', color: '#1890ff' }} />
          </Badge>
          <div>
            <div style={{ fontSize: '12px', color: '#999' }}>未读通知</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: unreadCount > 0 ? '#ff4d4f' : '#52c41a' }}>
              {unreadCount} 条
            </div>
          </div>
          <div style={{ marginLeft: '40px' }}>
            <div style={{ fontSize: '12px', color: '#999' }}>全部通知</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
              {storeNotifications.length} 条
            </div>
          </div>
        </div>
      </Card>

      <Card title="通知列表">
        {storeNotifications.length === 0 ? (
          <Empty description="暂无通知" />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={storeNotifications}
            renderItem={item => (
              <List.Item
                key={item.id}
                onClick={() => handleView(item)}
                style={{
                  cursor: 'pointer',
                  background: isRead(item) ? '#fff' : '#f0f7ff',
                  borderRadius: 8,
                  marginBottom: 8,
                  padding: '12px 16px',
                  border: '1px solid #f0f0f0',
                }}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!isRead(item) && <Badge status="processing" color="#1890ff" />}
                      <span style={{ fontWeight: 500 }}>{item.title}</span>
                      <Tag color={item.targetType === 'all' ? 'blue' : 'purple'} style={{ marginLeft: 'auto' }}>
                        {item.targetType === 'all' ? '全员通知' : '定向通知'}
                      </Tag>
                    </div>
                  }
                  description={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#666', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                        {item.content}
                      </span>
                      <span style={{ color: '#999', fontSize: '12px', marginLeft: '16px', whiteSpace: 'nowrap' }}>
                        {item.createdAt}
                      </span>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title="通知详情"
        open={!!viewingNotif}
        onCancel={() => setViewingNotif(null)}
        footer={[
          <Button key="confirm" type="primary" icon={<CheckOutlined />} onClick={() => setViewingNotif(null)}>
            我知道了
          </Button>,
        ]}
        width={600}
      >
        {viewingNotif && (
          <div>
            <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>{viewingNotif.title}</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Tag color={viewingNotif.targetType === 'all' ? 'blue' : 'purple'}>
                  {viewingNotif.targetType === 'all' ? '全员通知' : '定向通知'}
                </Tag>
                <span style={{ color: '#999', fontSize: '13px' }}>{viewingNotif.createdAt}</span>
              </div>
            </div>
            <div style={{ lineHeight: 1.8, color: '#333', whiteSpace: 'pre-wrap' }}>
              {viewingNotif.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StoreNotifications;
