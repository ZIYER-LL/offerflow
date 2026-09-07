'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Target,
  Award,
  Briefcase,
  Globe,
  Building2,
} from 'lucide-react';
import Link from 'next/link';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

// 模拟数据
const MOCK_DATA = {
  funnel: { applied: 13, written_test: 4, interview: 3, offer: 1 },
  timeSeries_week: [
    { label: '周一', applied: 2, written_test: 1, interview: 0, offer: 0, total: 3 },
    { label: '周二', applied: 1, written_test: 0, interview: 1, offer: 0, total: 2 },
    { label: '周三', applied: 3, written_test: 1, interview: 0, offer: 0, total: 4 },
    { label: '周四', applied: 2, written_test: 1, interview: 1, offer: 0, total: 4 },
    { label: '周五', applied: 2, written_test: 0, interview: 1, offer: 0, total: 3 },
    { label: '周六', applied: 1, written_test: 0, interview: 0, offer: 0, total: 1 },
    { label: '周日', applied: 2, written_test: 1, interview: 0, offer: 1, total: 4 },
  ],
  timeSeries_month: [
    { label: '第1周', applied: 5, written_test: 1, interview: 0, offer: 0, total: 6 },
    { label: '第2周', applied: 4, written_test: 2, interview: 1, offer: 0, total: 7 },
    { label: '第3周', applied: 3, written_test: 1, interview: 2, offer: 1, total: 7 },
  ],
  conversionRates: { appliedRate: 65, testRate: 30, interviewRate: 23, overallRate: 8 },
  statusDistribution: [
    { name: '待投递', value: 7 },
    { name: '已投递', value: 4 },
    { name: '笔试', value: 2 },
    { name: '面试', value: 3 },
    { name: 'Offer', value: 1 },
    { name: '已拒绝', value: 2 },
    { name: '已归档', value: 1 },
  ],
  topCompanies: [
    { name: '字节跳动', value: 3 },
    { name: '腾讯', value: 3 },
    { name: '阿里巴巴', value: 2 },
    { name: '百度', value: 2 },
    { name: '美团', value: 2 },
    { name: '京东', value: 1 },
    { name: '快手', value: 1 },
    { name: '小米', value: 1 },
    { name: '滴滴', value: 1 },
    { name: '智谱 AI', value: 1 },
  ],
  sourceStats: [
    { name: 'BOSS直聘', value: 9 },
    { name: '牛客', value: 4 },
    { name: '拉勾', value: 2 },
    { name: '猎聘', value: 2 },
    { name: '前程无忧', value: 1 },
    { name: '站酷', value: 1 },
    { name: '小红书', value: 1 },
  ],
  totalJobs: 20,
};

export default function DemoAnalyticsPage() {
  const [range, setRange] = useState<'week' | 'month'>('week');
  const data = MOCK_DATA;
  const timeSeries = range === 'week' ? data.timeSeries_week : data.timeSeries_month;

  // 漏斗图配置
  const funnelOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#1e293b', fontSize: 13 },
    },
    series: [{
      type: 'funnel',
      left: '10%',
      right: '10%',
      top: 20,
      bottom: 20,
      width: '80%',
      min: 0,
      max: data.funnel.applied,
      minSize: '20%',
      maxSize: '100%',
      sort: 'descending',
      gap: 4,
      label: { show: true, position: 'inside', formatter: '{b}\n{c}', fontSize: 13, fontWeight: 600, color: '#fff' },
      labelLine: { length: 10, lineStyle: { width: 1, type: 'solid' } },
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      emphasis: { label: { fontSize: 16 } },
      data: [
        { value: data.funnel.applied, name: '已投递', itemStyle: { color: '#3b82f6' } },
        { value: data.funnel.written_test, name: '笔试', itemStyle: { color: '#f59e0b' } },
        { value: data.funnel.interview, name: '面试', itemStyle: { color: '#8b5cf6' } },
        { value: data.funnel.offer, name: 'Offer', itemStyle: { color: '#10b981' } },
      ],
    }],
  }), [data.funnel]);

  // 趋势图配置
  const trendOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#1e293b', fontSize: 13 },
    },
    legend: {
      data: ['投递', '笔试', '面试', 'Offer'],
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 12, color: '#64748b' },
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timeSeries.map(d => d.label),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 12 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 12 },
    },
    series: [
      {
        name: '投递', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
        data: timeSeries.map(d => d.applied),
        itemStyle: { color: '#3b82f6' },
        lineStyle: { width: 2.5 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
          { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
        ]}},
      },
      {
        name: '笔试', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
        data: timeSeries.map(d => d.written_test),
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 2.5 },
      },
      {
        name: '面试', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
        data: timeSeries.map(d => d.interview),
        itemStyle: { color: '#8b5cf6' },
        lineStyle: { width: 2.5 },
      },
      {
        name: 'Offer', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
        data: timeSeries.map(d => d.offer),
        itemStyle: { color: '#10b981' },
        lineStyle: { width: 2.5 },
      },
    ],
  }), [timeSeries]);

  // 转化率柱状图配置
  const barOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b}: {c}%',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#1e293b', fontSize: 13 },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['投递率', '笔试率', '面试率', '整体转化率'],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#475569', fontSize: 12 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { formatter: '{value}%', color: '#94a3b8', fontSize: 12 },
    },
    series: [{
      type: 'bar',
      barWidth: '45%',
      data: [
        { value: data.conversionRates.appliedRate, itemStyle: { color: '#3b82f6', borderRadius: [6, 6, 0, 0] } },
        { value: data.conversionRates.testRate, itemStyle: { color: '#f59e0b', borderRadius: [6, 6, 0, 0] } },
        { value: data.conversionRates.interviewRate, itemStyle: { color: '#8b5cf6', borderRadius: [6, 6, 0, 0] } },
        { value: data.conversionRates.overallRate, itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0] } },
      ],
      label: { show: true, position: 'top', formatter: '{c}%', fontSize: 12, fontWeight: 600, color: '#334155' },
    }],
  }), [data.conversionRates]);

  // 状态分布饼图
  const pieOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, left: 'center', icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 12, color: '#64748b' } },
    series: [{
      type: 'pie',
      radius: ['38%', '65%'],
      center: ['50%', '42%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 12, color: '#475569' },
      labelLine: { length: 10, length2: 8 },
      data: data.statusDistribution.map((item, i) => ({
        ...item,
        itemStyle: { color: ['#94a3b8', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#64748b'][i % 7] },
      })),
    }],
  }), [data.statusDistribution]);

  // 公司分布柱状图
  const companyBarOption = useMemo(() => {
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: {c} 个岗位' },
      grid: { left: '3%', right: '8%', bottom: '3%', top: '5%', containLabel: true },
      xAxis: { type: 'value', minInterval: 1, axisLine: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 12 }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisTick: { show: false } },
      yAxis: { type: 'category', data: data.topCompanies.map(c => c.name).reverse(), axisLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#475569', fontSize: 12 }, axisTick: { show: false } },
      series: [{
        type: 'bar',
        barWidth: '55%',
        data: data.topCompanies.map((c, i) => ({
          value: c.value,
          itemStyle: { color: colors[i % colors.length], borderRadius: [0, 4, 4, 0] },
        })).reverse(),
        label: { show: true, position: 'right', formatter: '{c}', fontSize: 12, color: '#64748b' },
      }],
    };
  }, [data.topCompanies]);

  // 来源平台饼图
  const sourcePieOption = useMemo(() => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, left: 'center', icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 12, color: '#64748b' } },
      series: [{
        type: 'pie',
        radius: ['38%', '65%'],
        center: ['50%', '42%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12, color: '#475569' },
        labelLine: { length: 10, length2: 8 },
        data: data.sourceStats.map((item, i) => ({ ...item, itemStyle: { color: colors[i % colors.length] } })),
      }],
    };
  }, [data.sourceStats]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/demo" className="text-slate-400 hover:text-slate-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">投递数据分析</h1>
                <p className="text-xs text-amber-600 font-medium">演示模式（免登录）</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 核心指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{data.totalJobs}</div>
            <div className="text-xs text-slate-500 mt-0.5">总岗位数</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{data.funnel.applied}</div>
            <div className="text-xs text-slate-500 mt-0.5">已投递</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{data.funnel.written_test}</div>
            <div className="text-xs text-slate-500 mt-0.5">笔试次数</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{data.funnel.interview}</div>
            <div className="text-xs text-slate-500 mt-0.5">面试次数</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{data.funnel.offer}</div>
            <div className="text-xs text-slate-500 mt-0.5">Offer 数</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-rose-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{data.conversionRates.overallRate}%</div>
            <div className="text-xs text-slate-500 mt-0.5">整体转化率</div>
          </div>
        </div>

        {/* 投递漏斗 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              投递转化漏斗
            </h2>
            <span className="text-xs text-slate-400">全流程追踪</span>
          </div>
          <ReactECharts option={funnelOption} style={{ height: '260px' }} />
        </div>

        {/* 趋势图 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              投递趋势
            </h2>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setRange('week')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  range === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                本周
              </button>
              <button
                onClick={() => setRange('month')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  range === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                本月
              </button>
            </div>
          </div>
          <ReactECharts option={trendOption} style={{ height: '280px' }} />
        </div>

        {/* 转化率 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              阶段转化率
            </h2>
            <span className="text-xs text-slate-400">各环节转化情况</span>
          </div>
          <ReactECharts option={barOption} style={{ height: '260px' }} />
        </div>

        {/* 状态分布 + 来源平台 */}
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                岗位状态分布
              </h2>
              <span className="text-xs text-slate-400">当前状态</span>
            </div>
            <ReactECharts option={pieOption} style={{ height: '300px' }} />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-500" />
                来源平台分布
              </h2>
              <span className="text-xs text-slate-400">渠道构成</span>
            </div>
            <ReactECharts option={sourcePieOption} style={{ height: '300px' }} />
          </div>
        </div>

        {/* 公司分布 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              投递公司 Top 10
            </h2>
            <span className="text-xs text-slate-400">按岗位数排序</span>
          </div>
          <ReactECharts option={companyBarOption} style={{ height: '340px' }} />
        </div>
      </main>
    </div>
  );
}
