import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Select, DatePicker, Table, Space, Tag } from 'antd';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import type { Store } from '../../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const COLORS = ['#722ed1', '#1890ff', '#52c41a', '#fa8c16', '#eb2f96', '#13c2c2'];

const DataAnalysis: React.FC = () => {
  const { state } = useApp();
  const [dimension, setDimension] = useState<'time' | 'region' | 'store'>('time');
  const [metric, setMetric] = useState<'sales' | 'orders' | 'avgOrder'>('sales');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const approvedStores = state.stores.filter(s => s.status === 'approved');
  const storeMap = useMemo(() => {
    const map: Record<string, Store> = {};
    approvedStores.forEach(s => { map[s.id] = s; });
    return map;
  }, [approvedStores]);

  const filteredSalesData = useMemo(() => {
    if (!dateRange) return state.salesData;
    return state.salesData.filter(d => {
      const date = dayjs(d.date);
      return date.isAfter(dateRange[0].subtract(1, 'day')) && date.isBefore(dateRange[1].add(1, 'day'));
    });
  }, [state.salesData, dateRange]);

  const totalSales = filteredSalesData.reduce((sum, d) => sum + d.salesAmount, 0);
  const totalOrders = filteredSalesData.reduce((sum, d) => sum + d.orderCount, 0);
  const totalCustomers = filteredSalesData.reduce((sum, d) => sum + d.customerCount, 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const storeStats = useMemo(() => {
    const stats: Record<string, { storeId: string; storeName: string; salesAmount: number; orderCount: number; customerCount: number; region: string }> = {};
    filteredSalesData.forEach(d => {
      if (!stats[d.storeId]) {
        stats[d.storeId] = { storeId: d.storeId, storeName: d.storeName, salesAmount: 0, orderCount: 0, customerCount: 0, region: storeMap[d.storeId]?.region || '' };
      }
      stats[d.storeId].salesAmount += d.salesAmount;
      stats[d.storeId].orderCount += d.orderCount;
      stats[d.storeId].customerCount += d.customerCount;
    });
    return Object.values(stats).sort((a, b) => b.salesAmount - a.salesAmount);
  }, [filteredSalesData, storeMap]);

  const regionStats = useMemo(() => {
    const stats: Record<string, { region: string; salesAmount: number; orderCount: number; storeCount: number }> = {};
    storeStats.forEach(s => {
      if (!stats[s.region]) {
        stats[s.region] = { region: s.region, salesAmount: 0, orderCount: 0, storeCount: 0 };
      }
      stats[s.region].salesAmount += s.salesAmount;
      stats[s.region].orderCount += s.orderCount;
      stats[s.region].storeCount += 1;
    });
    return Object.values(stats).sort((a, b) => b.salesAmount - a.salesAmount);
  }, [storeStats]);

  const dailyTrendData = useMemo(() => {
    const dateMap: Record<string, { date: string; salesAmount: number; orderCount: number }> = {};
    filteredSalesData.forEach(d => {
      if (!dateMap[d.date]) {
        dateMap[d.date] = { date: d.date, salesAmount: 0, orderCount: 0 };
      }
      dateMap[d.date].salesAmount += d.salesAmount;
      dateMap[d.date].orderCount += d.orderCount;
    });
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSalesData]);

  const pieData = useMemo(() => {
    if (dimension === 'store') {
      return storeStats.slice(0, 6).map(s => ({ name: s.storeName, value: s.salesAmount }));
    }
    return regionStats.map(s => ({ name: s.region, value: s.salesAmount }));
  }, [storeStats, regionStats, dimension]);

  const storeComparisonColumns = [
    {
      title: '排名',
      key: 'rank',
      render: (_: unknown, __: unknown, index: number) => (
        <span style={{
          fontWeight: 'bold',
          color: index === 0 ? '#faad14' : index === 1 ? '#a0d911' : index === 2 ? '#1890ff' : '#999',
        }}>
          {index + 1}
        </span>
      ),
    },
    {
      title: '门店',
      dataIndex: 'storeName',
      key: 'storeName',
      render: (text: string, record: { region: string }) => (
        <Space>
          <span style={{ fontSize: '18px' }}>🏪</span>
          <span>{text}</span>
          <Tag color="blue">{record.region}</Tag>
        </Space>
      ),
    },
    {
      title: '销售额',
      dataIndex: 'salesAmount',
      key: 'salesAmount',
      render: (val: number) => <span style={{ color: '#ff4d4f', fontWeight: 500 }}>¥{val.toLocaleString()}</span>,
      sorter: (a: { salesAmount: number }, b: { salesAmount: number }) => a.salesAmount - b.salesAmount,
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      sorter: (a: { orderCount: number }, b: { orderCount: number }) => a.orderCount - b.orderCount,
    },
    {
      title: '客单价',
      key: 'avgOrder',
      render: (_: unknown, record: { salesAmount: number; orderCount: number }) => (
        <span>¥{record.orderCount > 0 ? (record.salesAmount / record.orderCount).toFixed(2) : '0'}</span>
      ),
    },
    {
      title: '复购率',
      key: 'repurchase',
      render: () => {
        const rate = (60 + Math.random() * 25).toFixed(1);
        return <span>{rate}%</span>;
      },
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>总销售额</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
              ¥{totalSales.toLocaleString()}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>订单总数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
              {totalOrders.toLocaleString()}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>客单价</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
              ¥{avgOrderValue.toFixed(2)}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>总客流</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
              {totalCustomers.toLocaleString()}
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
          <span style={{ color: '#666', marginLeft: '16px' }}>分析维度：</span>
          <Select value={dimension} onChange={setDimension} style={{ width: 140 }}>
            <Option value="time">时间趋势</Option>
            <Option value="region">区域对比</Option>
            <Option value="store">门店对比</Option>
          </Select>
          <span style={{ color: '#666', marginLeft: '16px' }}>核心指标：</span>
          <Select value={metric} onChange={setMetric} style={{ width: 140 }}>
            <Option value="sales">销售额</Option>
            <Option value="orders">订单数</Option>
            <Option value="avgOrder">客单价</Option>
          </Select>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} lg={16}>
          <Card title={dimension === 'time' ? '销售趋势' : dimension === 'region' ? '区域销售对比' : '门店销售对比'}>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                {dimension === 'time' ? (
                  <AreaChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="salesAmount" name="销售额" stroke="#722ed1" fill="#722ed1" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="orderCount" name="订单数" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
                  </AreaChart>
                ) : dimension === 'region' ? (
                  <BarChart data={regionStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="salesAmount" name="销售额" fill="#722ed1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={storeStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="storeName" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="salesAmount" name="销售额" fill="#1890ff" radius={[0, 4, 4, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={dimension === 'store' ? '门店销售占比' : '区域销售占比'}>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="门店销售排行榜">
        <Table
          dataSource={storeStats}
          columns={storeComparisonColumns}
          rowKey="storeId"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default DataAnalysis;
