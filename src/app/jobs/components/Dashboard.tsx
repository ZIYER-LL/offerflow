'use client';

import { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

interface StatsData {
  overview: {
    totalJobs: number;
    totalInterviews: number;
    totalTests: number;
    upcomingEvents: number;
    thisWeekCount: number;
    thisMonthCount: number;
  };
  statusCounts: Record<string, number>;
  funnel: {
    saved: number; applied: number; written_test: number;
    interview: number; offer: number;
  };
  conversionRates: {
    appliedRate: number; interviewRate: number; offerRate: number;
  };
  last7Days: Array<{ date: string; label: string; count: number }>;
}

export default function Dashboard({ data }: { data: StatsData }) {
  const [expanded, setExpanded] = useState(true);

  const funnelSteps = [
    { key: 'saved', label: '待投递', value: data.funnel.saved, bg: 'bg-slate-200', text: 'text-slate-600' },
    { key: 'applied', label: '已投递', value: data.funnel.applied, bg: 'bg-blue-200', text: 'text-blue-700' },
    { key: 'written_test', label: '笔试', value: data.funnel.written_test, bg: 'bg-amber-200', text: 'text-amber-700' },
    { key: 'interview', label: '面试', value: data.funnel.interview, bg: 'bg-purple-200', text: 'text-purple-700' },
    { key: 'offer', label: 'Offer', value: data.funnel.offer, bg: 'bg-green-200', text: 'text-green-700' },
  ];

  const maxFunnel = Math.max(...funnelSteps.map(s => s.value), 1);
  const maxTrend = Math.max(...data.last7Days.map(d => d.count), 1);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl hover:bg-purple-50/80 transition-colors mb-3"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-slate-900">数据看板</span>
          {data.overview.upcomingEvents > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
              {data.overview.upcomingEvents} 个待办
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {[
              { value: data.overview.totalJobs, label: '总岗位', color: 'text-slate-900' },
              { value: data.overview.thisWeekCount, label: '本周新增', color: 'text-purple-600' },
              { value: data.overview.thisMonthCount, label: '本月新增', color: 'text-purple-600' },
              { value: data.overview.totalInterviews, label: '面试次数', color: 'text-purple-600' },
              { value: data.overview.totalTests, label: '笔试次数', color: 'text-amber-600' },
              { value: `${data.conversionRates.offerRate}%`, label: 'Offer 率', color: 'text-green-600' },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs text-slate-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          {/* 漏斗图 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">投递转化漏斗</h3>
            <div className="flex items-end gap-1 h-24">
              {funnelSteps.map((step, i) => {
                const heightPct = Math.max((step.value / maxFunnel) * 100, 4);
                return (
                  <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-xs font-bold ${step.text}`}>{step.value}</span>
                    <div
                      className={`w-full rounded-t-lg ${step.bg}`}
                      style={{ height: `${heightPct}%`, minHeight: '8px' }}
                    />
                    <span className="text-xs text-slate-500">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 趋势图 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">近 7 天投递趋势</h3>
            <div className="flex items-end gap-2 h-16">
              {data.last7Days.map((day) => {
                const heightPct = Math.max((day.count / maxTrend) * 100, 4);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-slate-700">{day.count}</span>
                    <div
                      className="w-full rounded-t-md bg-purple-100"
                      style={{ height: `${heightPct}%`, minHeight: '4px' }}
                    />
                    <span className="text-xs text-slate-400">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
