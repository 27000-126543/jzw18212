import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Space, DatePicker, Select } from 'antd';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useApp } from '../../store/AppContext';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const COLORS = ['#722ed1', '#1890ff', '#52c41a', '#fa8c16', '#eb2f96', '#13c2c2'];

const StoreSales: React.FC = () => {
  const { state } = useApp();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const storeSalesData = useMemo(() => {
    return state.salesData.filter(d => d.storeId === state.currentStoreId);
  }, [state.salesData, state.currentStoreId]);

  const filteredData = useMemo(() => {
    if (!dateRange) return storeSalesData;
    return storeSalesData.filter(d => {
      const date = dayjs(d.date);
      return date.isAfter(dateRange[0].subtract(1, 'day')) && date.isBefore(dateRange[1].add(1, 'day'));
    });
  }, [storeSalesData, dateRange]);

  const totalSales = filteredData.reduce((sum, d) => sum + d.salesAmount, 0);
  const totalOrders = filteredData.reduce((sum, d) => sum + d.orderCount, 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const avgDailySales = filteredData.length > 0 ? totalSales / filteredData.length : 0;

  const storeOrders = state.orders.filter(o => o.storeId === state.currentStoreId && o.status === 'completed');
  
  const productSales = useMemo(() => {
    const productMap: Record<string, { name: string; amount: number; quantity: number }> = {};
    storeOrders.forEach(order => {
      order.items.forEach(item => {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { name: item.productName, amount: 0, quantity: 0 };
        }
        productMap[item.productId].amount += item.unitPrice * item.quantity;
        productMap[item.productId].quantity += item.quantity;
      });
    });
    return Object.values(productMap).sort((a, b) => b.amount - a.amount);
  }, [storeOrders]);

  const pieData = productSales.slice(0, 6).map(p => ({ name: p.name, value: p.amount }));

  const dailyTrendData = useMemo(() => {
    return filteredData.sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      date: d.date.slice(5),
      销售额: d.salesAmount,
      订单数: d.orderCount,
    }));
  }, [filteredData]);

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>总销售额</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ff4d4f' }}>
              ¥{totalSales.toLocaleString()}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>订单总数</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1890ff' }}>
              {totalOrders.toLocaleString()}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>客单价</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#52c41a' }}>
              ¥{avgOrderValue.toFixed(2)}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>日均销售额</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#722ed1' }}>
              ¥{avgDailySales.toFixed(0)}
            </div>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <Space wrap>
          <span style={{ color: '#666' }}>时间范围：</span>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
          />
          <Select value={period} onChange={setPeriod} style={{ width: 120 }}>
            <Option value="day">按日</Option>
            <Option value="week">按周</Option>
            <Option value="month">按月</Option>
          </Select>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} lg={16}>
          <Card title="销售趋势">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="销售额" stroke="#722ed1" fill="#722ed1" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="订单数" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="商品销售占比">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `¥${(Number(value) ?? 0).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="热销商品排行榜">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {productSales.slice(0, 8).map((product, index) => (
            <Card key={product.name} size="small" style={{ borderLeft: `4px solid ${COLORS[index % COLORS.length]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>
                    <span style={{ color: index < 3 ? '#faad14' : '#999', marginRight: 8 }}>
                      {index + 1}
                    </span>
                    {product.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                    销量: {product.quantity} 件
                  </div>
                </div>
                <div style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                  ¥{product.amount.toFixed(2)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default StoreSales;
