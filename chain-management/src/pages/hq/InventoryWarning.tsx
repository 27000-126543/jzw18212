import React, { useState, useMemo } from 'react';
import { Card, Table, Button, Space, Tag, Select, Row, Col, Modal, message, Badge, Tabs, Checkbox } from 'antd';
import { WarningOutlined, ExclamationCircleOutlined, ShoppingCartOutlined, SwapOutlined, CheckCircleOutlined, ShopOutlined, GlobalOutlined, InboxOutlined } from '@ant-design/icons';
import { useApp } from '../../store/AppContext';
import type { TransferRequest } from '../../types';

interface RecommendationItem {
  id: string;
  deficitStoreId: string;
  deficitStoreName: string;
  deficitStoreRegion: string;
  surplusStoreId: string;
  surplusStoreName: string;
  surplusStoreStock: number;
  productId: string;
  productName: string;
  productImage: string;
  deficitStock: number;
  recommendedQty: number;
}

const InventoryWarning: React.FC = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<string>('warnings');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [storeFilter, setStoreFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [recRegionFilter, setRecRegionFilter] = useState<string>('');
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set());
  const [actionModal, setActionModal] = useState<{
    type: 'replenish' | 'suggest';
    storeId: string;
    storeName: string;
    productId: string;
    productName: string;
    image: string;
    stock: number;
    fromStoreId?: string;
    fromStoreName?: string;
    fromStock?: number;
  } | null>(null);

  const approvedStores = useMemo(() => state.stores.filter(s => s.status === 'approved'), [state.stores]);
  const regions = useMemo(() => Array.from(new Set(approvedStores.map(s => s.region))), [approvedStores]);

  const filteredStores = useMemo(() => {
    return approvedStores.filter(s => {
      const matchRegion = !regionFilter || s.region === regionFilter;
      const matchStore = !storeFilter || s.id === storeFilter;
      return matchRegion && matchStore;
    });
  }, [approvedStores, regionFilter, storeFilter]);

  const lowStockItems = useMemo(() => {
    const items: Array<{
      storeId: string;
      storeName: string;
      region: string;
      productId: string;
      productName: string;
      image: string;
      stock: number;
      level: 'out' | 'low' | 'warning';
      inTransitIncoming: number;
      inTransitOutgoing: number;
    }> = [];

    const pendingTransfers = state.transfers.filter(t => t.status === 'pending');

    filteredStores.forEach(store => {
      state.storeProducts
        .filter(sp => sp.storeId === store.id)
        .forEach(sp => {
          if (sp.stock < 50) {
            const product = state.products.find(p => p.id === sp.productId);
            if (!product) return;
            
            const incoming = pendingTransfers
              .filter(t => t.toStoreId === store.id && t.productId === sp.productId)
              .reduce((sum, t) => sum + t.quantity, 0);
            
            const outgoing = pendingTransfers
              .filter(t => t.fromStoreId === store.id && t.productId === sp.productId)
              .reduce((sum, t) => sum + t.quantity, 0);
            
            let level: 'out' | 'low' | 'warning' = 'warning';
            if (sp.stock === 0) level = 'out';
            else if (sp.stock < 20) level = 'low';
            items.push({
              storeId: store.id,
              storeName: store.name,
              region: store.region,
              productId: sp.productId,
              productName: product.name,
              image: product.image,
              stock: sp.stock,
              level,
              inTransitIncoming: incoming,
              inTransitOutgoing: outgoing,
            });
          }
        });
    });

    items.sort((a, b) => {
      const levelOrder = { out: 0, low: 1, warning: 2 };
      if (levelOrder[a.level] !== levelOrder[b.level]) return levelOrder[a.level] - levelOrder[b.level];
      return a.stock - b.stock;
    });

    return items;
  }, [filteredStores, state.storeProducts, state.products, state.transfers]);

  const displayItems = useMemo(() => {
    if (!levelFilter) return lowStockItems;
    return lowStockItems.filter(i => i.level === levelFilter);
  }, [lowStockItems, levelFilter]);

  const outCount = lowStockItems.filter(i => i.level === 'out').length;
  const lowCount = lowStockItems.filter(i => i.level === 'low').length;
  const warningCount = lowStockItems.filter(i => i.level === 'warning').length;

  const recommendations = useMemo((): RecommendationItem[] => {
    const recs: RecommendationItem[] = [];
    const pendingTransfers = state.transfers.filter(t => t.status === 'pending');

    regions.forEach(region => {
      const regionStores = approvedStores.filter(s => s.region === region);
      
      state.products.forEach(product => {
        const deficitStores: Array<{ storeId: string; storeName: string; stock: number }> = [];
        const surplusStores: Array<{ storeId: string; storeName: string; stock: number }> = [];

        regionStores.forEach(store => {
          const sp = state.storeProducts.find(p => p.storeId === store.id && p.productId === product.id);
          if (!sp) return;

          if (sp.stock < 20) {
            deficitStores.push({ storeId: store.id, storeName: store.name, stock: sp.stock });
          } else if (sp.stock > 60) {
            surplusStores.push({ storeId: store.id, storeName: store.name, stock: sp.stock });
          }
        });

        deficitStores.sort((a, b) => a.stock - b.stock);
        surplusStores.sort((a, b) => b.stock - a.stock);

        deficitStores.forEach(deficitStore => {
          const existingIncoming = pendingTransfers
            .filter(t => t.toStoreId === deficitStore.storeId && t.productId === product.id)
            .reduce((sum, t) => sum + t.quantity, 0);
          
          const actualDeficit = Math.max(0, 50 - deficitStore.stock - existingIncoming);
          if (actualDeficit <= 0) return;

          surplusStores.forEach(surplusStore => {
            const existingOutgoing = pendingTransfers
              .filter(t => t.fromStoreId === surplusStore.storeId && t.productId === product.id)
              .reduce((sum, t) => sum + t.quantity, 0);
            
            const availableSurplus = Math.max(0, surplusStore.stock - 40 - existingOutgoing);
            if (availableSurplus <= 0) return;

            const recommendedQty = Math.min(actualDeficit, availableSurplus, 30);
            
            if (recommendedQty >= 5) {
              recs.push({
                id: `${deficitStore.storeId}-${surplusStore.storeId}-${product.id}`,
                deficitStoreId: deficitStore.storeId,
                deficitStoreName: deficitStore.storeName,
                deficitStoreRegion: region,
                surplusStoreId: surplusStore.storeId,
                surplusStoreName: surplusStore.storeName,
                surplusStoreStock: surplusStore.stock,
                productId: product.id,
                productName: product.name,
                productImage: product.image,
                deficitStock: deficitStore.stock,
                recommendedQty,
              });
            }
          });
        });
      });
    });

    return recs;
  }, [approvedStores, regions, state.products, state.storeProducts, state.transfers]);

  const filteredRecommendations = useMemo(() => {
    if (!recRegionFilter) return recommendations;
    return recommendations.filter(r => r.deficitStoreRegion === recRegionFilter);
  }, [recommendations, recRegionFilter]);

  const totalRecommendations = filteredRecommendations.length;
  const totalUnits = filteredRecommendations.reduce((sum, r) => sum + r.recommendedQty, 0);
  const benefitedStores = new Set(filteredRecommendations.map(r => r.deficitStoreId)).size;
  const regionsCovered = new Set(filteredRecommendations.map(r => r.deficitStoreRegion)).size;

  const allSelected = filteredRecommendations.length > 0 && 
    filteredRecommendations.every(r => selectedRecommendations.has(r.id));

  const nearbyStores = (storeId: string, productId: string) => {
    const store = approvedStores.find(s => s.id === storeId);
    if (!store) return [];
    const sameRegionStores = approvedStores
      .filter(s => s.id !== storeId && s.region === store.region)
      .map(s => {
        const sp = state.storeProducts.find(p => p.storeId === s.id && p.productId === productId);
        return { ...s, stock: sp?.stock || 0 };
      })
      .filter(s => s.stock > 30)
      .sort((a, b) => b.stock - a.stock);
    return sameRegionStores.slice(0, 3);
  };

  const handleReplenish = (record: any) => {
    setActionModal({
      type: 'replenish',
      storeId: record.storeId,
      storeName: record.storeName,
      productId: record.productId,
      productName: record.productName,
      image: record.image,
      stock: record.stock,
    });
  };

  const handleSuggestTransfer = (record: any, fromStore: any) => {
    setActionModal({
      type: 'suggest',
      storeId: record.storeId,
      storeName: record.storeName,
      productId: record.productId,
      productName: record.productName,
      image: record.image,
      stock: record.stock,
      fromStoreId: fromStore.id,
      fromStoreName: fromStore.name,
      fromStock: fromStore.stock,
    });
  };

  const handleConfirmAction = () => {
    if (!actionModal) return;
    const transfer: TransferRequest = {
      id: `transfer-${Date.now()}`,
      fromStoreId: '',
      toStoreId: '',
      productId: actionModal.productId,
      productName: actionModal.productName,
      quantity: actionModal.type === 'replenish' ? 50 : 20,
      status: 'pending',
      type: actionModal.type === 'replenish' ? 'to-hq' : 'to-store',
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    };
    if (actionModal.type === 'replenish') {
      transfer.fromStoreId = actionModal.storeId;
      transfer.toStoreId = 'hq';
    } else {
      transfer.fromStoreId = actionModal.fromStoreId!;
      transfer.toStoreId = actionModal.storeId;
    }
    dispatch({ type: 'ADD_TRANSFER', payload: transfer });
    message.success(`已为 ${actionModal.storeName} 创建调拨申请，请到调拨管理审批`);
    setActionModal(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredRecommendations.map(r => r.id));
      setSelectedRecommendations(allIds);
    } else {
      setSelectedRecommendations(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRecommendations);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRecommendations(newSelected);
  };

  const handleBatchCreate = () => {
    if (selectedRecommendations.size === 0) return;
    
    Modal.confirm({
      title: '确认批量生成调拨单',
      content: `确定要为选中的 ${selectedRecommendations.size} 条推荐生成调拨单吗？`,
      okText: '确认生成',
      cancelText: '取消',
      onOk: () => {
        const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
        let count = 0;
        
        filteredRecommendations
          .filter(r => selectedRecommendations.has(r.id))
          .forEach(rec => {
            const transfer: TransferRequest = {
              id: `transfer-${Date.now()}-${count}`,
              fromStoreId: rec.surplusStoreId,
              toStoreId: rec.deficitStoreId,
              productId: rec.productId,
              productName: rec.productName,
              quantity: rec.recommendedQty,
              status: 'pending',
              type: 'to-store',
              createdAt: now,
            };
            dispatch({ type: 'ADD_TRANSFER', payload: transfer });
            count++;
          });
        
        message.success(`成功创建 ${count} 条调拨申请，请到调拨管理审批`);
        setSelectedRecommendations(new Set());
      },
    });
  };

  const warningColumns = [
    {
      title: '门店',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 140,
      render: (text: string, record: any) => (
        <Space>
          <span style={{ fontSize: '16px' }}>🏪</span>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ fontSize: '11px', color: '#999' }}>{record.region}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '商品',
      key: 'product',
      render: (_: unknown, record: any) => (
        <Space>
          <span style={{ fontSize: '24px' }}>{record.image}</span>
          <span>{record.productName}</span>
        </Space>
      ),
    },
    {
      title: '库存状态',
      key: 'level',
      width: 110,
      render: (_: unknown, record: any) => {
        const colors: Record<string, string> = { out: 'red', low: 'orange', warning: 'gold' };
        const texts: Record<string, string> = { out: '已断货', low: '库存告急', warning: '库存偏低' };
        return (
          <Tag color={colors[record.level]} icon={record.level === 'out' ? <ExclamationCircleOutlined /> : <WarningOutlined />}>
            {texts[record.level]}
          </Tag>
        );
      },
    },
    {
      title: '当前库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      render: (stock: number) => (
        <span style={{ fontWeight: 500, color: stock === 0 ? '#ff4d4f' : stock < 20 ? '#fa8c16' : '#faad14' }}>
          {stock} 件
        </span>
      ),
      sorter: (a: any, b: any) => a.stock - b.stock,
    },
    {
      title: '在途数量',
      key: 'inTransit',
      width: 140,
      render: (_: unknown, record: any) => {
        const { inTransitIncoming, inTransitOutgoing } = record;
        if (inTransitIncoming === 0 && inTransitOutgoing === 0) {
          return <span style={{ color: '#999' }}>—</span>;
        }
        return (
          <Space size={4}>
            {inTransitIncoming > 0 && (
              <Badge count={`+${inTransitIncoming}`} style={{ backgroundColor: '#1890ff' }} />
            )}
            {inTransitOutgoing > 0 && (
              <Badge count={`-${inTransitOutgoing}`} style={{ backgroundColor: '#fa8c16' }} />
            )}
          </Space>
        );
      },
    },
    {
      title: '快速处理',
      key: 'action',
      width: 260,
      render: (_: unknown, record: any) => {
        const nearby = nearbyStores(record.storeId, record.productId);
        return (
          <Space direction="vertical" size={6}>
            <Button type="primary" size="small" icon={<ShoppingCartOutlined />} onClick={() => handleReplenish(record)}>
              总部补货
            </Button>
            {nearby.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: 4 }}>附近门店可调货：</div>
                <Space wrap size={[6, 6]}>
                  {nearby.map(s => (
                    <Tag
                      key={s.id}
                      color="cyan"
                      style={{ cursor: 'pointer', margin: 0 }}
                      onClick={() => handleSuggestTransfer(record, s)}
                    >
                      <SwapOutlined /> {s.name}（{s.stock}件）
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </Space>
        );
      },
    },
  ];

  const recommendationColumns = [
    {
      title: '缺口门店',
      key: 'deficitStore',
      width: 180,
      render: (_: unknown, record: RecommendationItem) => (
        <Space>
          <span style={{ fontSize: '16px' }}>🏪</span>
          <div>
            <div style={{ fontWeight: 500 }}>{record.deficitStoreName}</div>
            <div style={{ fontSize: '11px', color: '#999' }}>{record.deficitStoreRegion}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '商品',
      key: 'product',
      width: 160,
      render: (_: unknown, record: RecommendationItem) => (
        <Space>
          <span style={{ fontSize: '24px' }}>{record.productImage}</span>
          <span>{record.productName}</span>
        </Space>
      ),
    },
    {
      title: '缺口库存',
      key: 'deficitStock',
      width: 100,
      render: (_: unknown, record: RecommendationItem) => (
        <span style={{ fontWeight: 500, color: record.deficitStock < 10 ? '#ff4d4f' : '#fa8c16' }}>
          {record.deficitStock} 件
        </span>
      ),
      sorter: (a: RecommendationItem, b: RecommendationItem) => a.deficitStock - b.deficitStock,
    },
    {
      title: '富余门店',
      key: 'surplusStore',
      width: 180,
      render: (_: unknown, record: RecommendationItem) => (
        <Space>
          <span style={{ fontSize: '16px' }}>📦</span>
          <div>
            <div style={{ fontWeight: 500 }}>{record.surplusStoreName}</div>
            <div style={{ fontSize: '11px', color: '#52c41a' }}>当前库存：{record.surplusStoreStock} 件</div>
          </div>
        </Space>
      ),
    },
    {
      title: '建议调拨数量',
      key: 'recommendedQty',
      width: 120,
      render: (_: unknown, record: RecommendationItem) => (
        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
          {record.recommendedQty} 件
        </Tag>
      ),
      sorter: (a: RecommendationItem, b: RecommendationItem) => a.recommendedQty - b.recommendedQty,
    },
    {
      title: (
        <Checkbox 
          checked={allSelected} 
          onChange={(e) => handleSelectAll(e.target.checked)}
        >
          全选
        </Checkbox>
      ),
      key: 'action',
      width: 80,
      render: (_: unknown, record: RecommendationItem) => (
        <Checkbox
          checked={selectedRecommendations.has(record.id)}
          onChange={(e) => handleSelectOne(record.id, e.target.checked)}
        />
      ),
    },
  ];

  const renderWarningsTab = () => (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>🚨</span>
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>已断货</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#ff4d4f' }}>{outCount}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>库存告急</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#fa8c16' }}>{lowCount}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>⚡</span>
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>库存偏低</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#faad14' }}>{warningCount}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>📦</span>
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>涉及门店</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1890ff' }}>{filteredStores.length}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
        <Space wrap>
          <Select
            placeholder="选择区域"
            value={regionFilter || undefined}
            onChange={(v) => { setRegionFilter(v); setStoreFilter(''); }}
            style={{ width: 140 }}
            allowClear
          >
            {regions.map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}
          </Select>
          <Select
            placeholder="选择门店"
            value={storeFilter || undefined}
            onChange={setStoreFilter}
            style={{ width: 180 }}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {filteredStores.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
          </Select>
          <Select
            placeholder="预警级别"
            value={levelFilter || undefined}
            onChange={setLevelFilter}
            style={{ width: 140 }}
            allowClear
          >
            <Select.Option value="out">已断货</Select.Option>
            <Select.Option value="low">库存告急</Select.Option>
            <Select.Option value="warning">库存偏低</Select.Option>
          </Select>
        </Space>
      </Card>

      <Card title={`低库存预警商品（${displayItems.length}）`}>
        <Table
          dataSource={displayItems}
          columns={warningColumns}
          rowKey={record => `${record.storeId}-${record.productId}`}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </>
  );

  const renderRecommendationsTab = () => (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircleOutlined style={{ fontSize: 28, color: '#52c41a' }} />
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>推荐总数</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#52c41a' }}>{totalRecommendations}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <InboxOutlined style={{ fontSize: 28, color: '#1890ff' }} />
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>调拨总数量</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1890ff' }}>{totalUnits}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShopOutlined style={{ fontSize: 28, color: '#722ed1' }} />
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>受益门店</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#722ed1' }}>{benefitedStores}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GlobalOutlined style={{ fontSize: 28, color: '#13c2c2' }} />
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>覆盖区域</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: '#13c2c2' }}>{regionsCovered}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Select
            placeholder="选择区域"
            value={recRegionFilter || undefined}
            onChange={setRecRegionFilter}
            style={{ width: 140 }}
            allowClear
          >
            {regions.map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}
          </Select>
          <Button
            type="primary"
            icon={<SwapOutlined />}
            onClick={handleBatchCreate}
            disabled={selectedRecommendations.size === 0}
          >
            一键批量生成调拨单（{selectedRecommendations.size}）
          </Button>
        </Space>
      </Card>

      <Card title={`调拨推荐（${filteredRecommendations.length}）`}>
        <Table
          dataSource={filteredRecommendations}
          columns={recommendationColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </>
  );

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'warnings', label: '低库存预警', children: renderWarningsTab() },
          { key: 'recommendations', label: '调拨推荐池', children: renderRecommendationsTab() },
        ]}
      />

      <Modal
        title={actionModal?.type === 'replenish' ? '总部补货' : '门店间调货建议'}
        open={!!actionModal}
        onOk={handleConfirmAction}
        onCancel={() => setActionModal(null)}
        width={460}
        okText="创建调拨申请"
        cancelText="取消"
      >
        {actionModal && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 32 }}>{actionModal.image}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{actionModal.productName}</div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {actionModal.storeName} 当前库存：
                  <span style={{ color: actionModal.stock < 20 ? '#ff4d4f' : '#faad14', fontWeight: 500 }}>
                    {actionModal.stock} 件
                  </span>
                </div>
              </div>
            </div>
            {actionModal.type === 'replenish' ? (
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8 }}>
                <p>📦 由总部仓库向 <strong>{actionModal.storeName}</strong> 补货 50 件。</p>
                <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                  创建后调拨单进入待审批状态，总部批准后库存自动入库。
                </p>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8 }}>
                <p>📤 调出门店：<strong>{actionModal.fromStoreName}</strong>（库存 {actionModal.fromStock} 件）</p>
                <p>📥 调入门店：<strong>{actionModal.storeName}</strong>（库存 {actionModal.stock} 件）</p>
                <p>数量：20 件</p>
                <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                  创建后调拨单进入待审批状态，总部批准后自动完成调拨。
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InventoryWarning;
