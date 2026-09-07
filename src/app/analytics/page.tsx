'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Loader2,
  Target,
  Award,
  FileText,
  Users,
  Inbox,
  Briefcase,
  Calendar,
  ChevronRight,
  Globe,
  Building2,
} from 'lucide-react';

// 动态导入 ECharts，避免 SSR 问题
const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
    </div>
  ),
});

interface AnalyticsData {
  funnel: { applied: number; written_test: number; interview: number; offer: number };
  timeSeries: Array<{
    label: string;
    applied: number;
    written_test: number;
    interview: number;
    offer: number;
    total: number;
  }>;
  conversionRates: {
    appliedRate: number;
    testRate: number;
    interviewRate: number;
    overallRate: number;
  };
  statusDistribution: Array<{ name: string; value: number }>;
  statusCounts: Record<string, number>;
  totalJobs: number;
  topCompanies: Array<{ name: string; value: number }>;
  sourceStats: Array<{ name: string; value: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/jobs/analytics?period=${period}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '获取数据失败');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 漏斗图配置
  const funnelOption = useMemo(() => {
    if (!data) return {};
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 个',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b', fontSize: 13 },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px;',
      },
      series: [
        {
          type: 'funnel',
          left: '15%',
          top: 10,
          bottom: 10,
          width: '70%',
          min: 0,
          max: Math.max(data.funnel.applied, 1),
          minSize: '20%',
          maxSize: '100%',
          sort: 'descending',
          gap: 4,
          label: {
            show: true,
            position: 'inside',
            fontSize: 15,
            fontWeight: 'bold',
            color: '#fff',
            formatter: '{b}\n{c}',
          },
          labelLine: { show: false },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
          },
          emphasis: {
            label: { fontSize: 16 },
          },
          data: [
            { value: data.funnel.applied, name: '投递', itemStyle: { color: '#3b82f6' } },
            { value: data.funnel.written_test, name: '笔试', itemStyle: { color: '#f59e0b' } },
            { value: data.funnel.interview, name: '面试', itemStyle: { color: '#8b5cf6' } },
            { value: data.funnel.offer, name: 'Offer', itemStyle: { color: '#10b981' } },
          ],
        },
      ],
    };
  }, [data]);

  // 趋势折线图配置
  const trendOption = useMemo(() => {
    if (!data) return {};
    const labels = data.timeSeries.map((d) => d.label);
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b', fontSize: 13 },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px;',
      },
      legend: {
        data: ['投递', '笔试', '面试', 'Offer'],
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 12, color: '#64748b' },
      },
      grid: { left: '3%', right: '4%', bottom: '12%', top: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#94a3b8', fontSize: 12 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 12 },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisTick: { show: false },
      },
      series: [
        {
          name: '投递',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: data.timeSeries.map((d) => d.applied),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59,130,246,0.15)' },
                { offset: 1, color: 'rgba(59,130,246,0)' },
              ],
            },
          },
        },
        {
          name: '笔试',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: data.timeSeries.map((d) => d.written_test),
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 2.5 },
        },
        {
          name: '面试',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: data.timeSeries.map((d) => d.interview),
          itemStyle: { color: '#8b5cf6' },
          lineStyle: { width: 2.5 },
        },
        {
          name: 'Offer',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: data.timeSeries.map((d) => d.offer),
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2.5 },
        },
      ],
    };
  }, [data]);

  // 状态分布饼图配置
  const pieOption = useMemo(() => {
    if (!data) return {};
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b', fontSize: 13 },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px;',
      },
      legend: {
        bottom: 0,
        left: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 12, color: '#64748b' },
      },
      series: [
        {
          type: 'pie',
          radius: ['38%', '65%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 12,
            color: '#475569',
          },
          labelLine: { length: 10, length2: 8 },
          emphasis: {
            label: { fontSize: 14, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)' },
          },
          data: data.statusDistribution.map((item, i) => ({
            ...item,
            itemStyle: {
              color: ['#94a3b8', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#64748b'][i % 7],
            },
          })),
        },
      ],
    };
  }, [data]);

  // 公司分布柱状图配置
  const companyBarOption = useMemo(() => {
    if (!data || data.topCompanies.length === 0) return {};
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: '{b}: {c} 个岗位',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b', fontSize: 13 },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px;',
      },
      grid: { left: '3%', right: '8%', bottom: '3%', top: '5%', containLabel: true },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 12 },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: data.topCompanies.map((c) => c.name).reverse(),
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#475569', fontSize: 12 },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          barWidth: '55%',
          data: data.topCompanies.map((c, i) => ({
            value: c.value,
            itemStyle: { color: colors[i % colors.length], borderRadius: [0, 4, 4, 0] },
          })).reverse(),
          label: {
            show: true,
            position: 'right',
            formatter: '{c}',
            fontSize: 12,
            color: '#64748b',
          },
        },
      ],
    };
  }, [data]);

  // 来源平台饼图配置
  const sourcePieOption = useMemo(() => {
    if (!data || data.sourceStats.length === 0) return {};
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b', fontSize: 13 },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px;',
      },
      legend: {
        bottom: 0,
        left: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 12, color: '#64748b' },
      },
      series: [
        {
          type: 'pie',
          radius: ['38%', '65%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 12,
            color: '#475569',
          },
          labelLine: { length: 10, length2: 8 },
          emphasis: {
            label: { fontSize: 14, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)' },
          },
          data: data.sourceStats.map((item, i) => ({
            ...item,
            itemStyle: { color: colors[i % colors.length] },
          })),
        },
      ],
    };
  }, [data]);

  // 转化率柱状图配置
  const conversionBarOption = useMemo(() => {
    if (!data) return {};
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: '{b}: {c}%',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b', fontSize: 13 },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px;',
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['投递→笔试', '笔试→面试', '面试→Offer', '总转化率'],
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#94a3b8', fontSize: 11, interval: 0 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 12, formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          barWidth: '45%',
          data: [
            { value: data.conversionRates.appliedRate, itemStyle: { color: '#3b82f6' } },
            { value: data.conversionRates.testRate, itemStyle: { color: '#f59e0b' } },
            { value: data.conversionRates.interviewRate, itemStyle: { color: '#8b5cf6' } },
            { value: data.conversionRates.overallRate, itemStyle: { color: '#10b981' } },
          ],
          label: {
            show: true,
            position: 'top',
            formatter: '{c}%',
            fontSize: 13,
            fontWeight: 'bold',
            color: '#475569',
          },
          itemStyle: { borderRadius: [6, 6, 0, 0] },
        },
      ],
    };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
            <Link href="/jobs" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">数据看板</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="mt-3 text-sm text-slate-500">加载分析数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
            <Link href="/jobs" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">数据看板</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.totalJobs === 0) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
            <Link href="/jobs" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">数据看板</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">暂无数据</h3>
          <p className="text-sm text-slate-500 mb-6">添加岗位后即可查看数据分析</p>
          <Link href="/jobs/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors">
            <Briefcase className="w-4 h-4" />
            添加岗位
          </Link>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: '总岗位数',
      value: data.totalJobs,
      icon: Briefcase,
      color: 'text-slate-900',
      bg: 'bg-slate-50',
      iconColor: 'text-slate-500',
    },
    {
      label: '已投递',
      value: data.funnel.applied,
      icon: Target,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-500',
    },
    {
      label: '面试次数',
      value: data.funnel.interview,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      iconColor: 'text-purple-500',
    },
    {
      label: 'Offer 数',
      value: data.funnel.offer,
      icon: Award,
      color: 'text-green-600',
      bg: 'bg-green-50',
      iconColor: 'text-green-500',
    },
    {
      label: '笔试通过率',
      value: `${data.conversionRates.appliedRate}%`,
      subtitle: '投递→笔试',
      icon: FileText,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-500',
    },
    {
      label: '总转化率',
      value: `${data.conversionRates.overallRate}%`,
      subtitle: '投递→Offer',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      iconColor: 'text-green-500',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/jobs"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">数据看板</h1>
            </div>
          </div>

          {/* 周/月切换 */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                period === 'week'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              按周
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                period === 'month'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              按月
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* 指标卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className={`w-9 h-9 ${m.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-[18px] h-[18px] ${m.iconColor}`} />
                </div>
                <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
                {m.subtitle && (
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.subtitle}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* 投递转化漏斗 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              投递转化漏斗
            </h2>
            <span className="text-xs text-slate-400">累计口径</span>
          </div>
          <ReactECharts option={funnelOption} style={{ height: '300px' }} />
        </div>

        {/* 趋势图 + 转化率柱状图 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                {period === 'week' ? '近 8 周趋势' : '近 6 月趋势'}
              </h2>
              <span className="text-xs text-slate-400">
                <Calendar className="w-3 h-3 inline mr-1" />
                按创建时间
              </span>
            </div>
            <ReactECharts option={trendOption} style={{ height: '280px' }} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-500" />
                各阶段转化率
              </h2>
              <span className="text-xs text-slate-400">百分比</span>
            </div>
            <ReactECharts option={conversionBarOption} style={{ height: '280px' }} />
          </div>
        </div>

        {/* 状态分布 + 来源平台 */}
        <div className="grid lg:grid-cols-2 gap-4">
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

        {/* 漏斗明细表 */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">漏斗明细</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="text-left px-5 py-3 font-medium">阶段</th>
                  <th className="text-right px-5 py-3 font-medium">数量</th>
                  <th className="text-right px-5 py-3 font-medium">占投递数</th>
                  <th className="text-right px-5 py-3 font-medium">上阶段转化率</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: '投递', value: data.funnel.applied, color: 'bg-blue-500', rate: '—', pct: '100%' },
                  { name: '笔试', value: data.funnel.written_test, color: 'bg-amber-500', rate: `${data.conversionRates.appliedRate}%`, pct: data.funnel.applied > 0 ? `${Math.round((data.funnel.written_test / data.funnel.applied) * 100)}%` : '—' },
                  { name: '面试', value: data.funnel.interview, color: 'bg-purple-500', rate: `${data.conversionRates.testRate}%`, pct: data.funnel.applied > 0 ? `${Math.round((data.funnel.interview / data.funnel.applied) * 100)}%` : '—' },
                  { name: 'Offer', value: data.funnel.offer, color: 'bg-green-500', rate: `${data.conversionRates.interviewRate}%`, pct: data.funnel.applied > 0 ? `${Math.round((data.funnel.offer / data.funnel.applied) * 100)}%` : '—' },
                ].map((row) => (
                  <tr key={row.name} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${row.color}`} />
                        <span className="font-medium text-slate-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">{row.value}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{row.pct}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{row.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 返回岗位列表 */}
        <div className="pt-2 pb-4">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回岗位列表
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
