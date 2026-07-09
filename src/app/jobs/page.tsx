'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Briefcase,
  MapPin,
  DollarSign,
  Globe,
  Clock,
  Loader2,
  Inbox,
  Search,
  Trash2,
  Download,
  CheckSquare,
  Square,
  X,
  Calendar,
  Video,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import { Job, JobStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/job';
import { cn } from '@/lib/utils';

const ALL_STATUSES: { key: JobStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'saved', label: '待投递' },
  { key: 'applied', label: '已投递' },
  { key: 'written_test', label: '笔试' },
  { key: 'interview', label: '面试' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: '已拒绝' },
  { key: 'archived', label: '已归档' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? '刚刚' : `${diffMinutes} 分钟前`;
    }
    return `${diffHours} 小时前`;
  }
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 0) return '已过期';
  if (diffHours < 1) return '即将开始';
  if (diffHours < 24) return `${diffHours} 小时后`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天后`;
}

const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  phone: '电话面试',
  video: '视频面试',
  onsite: '现场面试',
  hr: 'HR面试',
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeStatus, setActiveStatus] = useState<JobStatus | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [jobCounts, setJobCounts] = useState<Record<string, number>>({});
  const [showBatchStatusMenu, setShowBatchStatusMenu] = useState(false);

  // 待办提醒
  const [upcomingData, setUpcomingData] = useState<{
    upcomingInterviews: Array<{
      id: string;
      round: number;
      type: string;
      scheduledAt: string;
      job: { id: string; title: string; company: string; status: string };
    }>;
    pendingWrittenTests: Job[];
    now: string;
    in24h: string;
  } | null>(null);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (activeStatus !== 'all') {
        params.set('status', activeStatus);
      }
      if (searchKeyword.trim()) {
        params.set('keyword', searchKeyword.trim());
      }
      params.set('sortBy', 'createdAt');
      params.set('sortOrder', 'desc');

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || '获取数据失败');
      }

      setJobs(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [activeStatus, searchKeyword]);

  const fetchJobCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs?sortBy=createdAt&sortOrder=desc`);
      const data = await res.json();
      if (data.success) {
        const counts: Record<string, number> = { all: data.data.length };
        ALL_STATUSES.forEach((s) => {
          if (s.key !== 'all') {
            counts[s.key] = data.data.filter((j: Job) => j.status === s.key).length;
          }
        });
        setJobCounts(counts);
      }
    } catch (err) {
      console.error('获取计数失败:', err);
    }
  }, []);

  const fetchUpcoming = useCallback(async () => {
    try {
      setLoadingUpcoming(true);
      const res = await fetch('/api/jobs/upcoming');
      const data = await res.json();
      if (data.success) {
        setUpcomingData(data.data);
      }
    } catch (err) {
      console.error('获取待办信息失败:', err);
    } finally {
      setLoadingUpcoming(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchJobCounts();
  }, [fetchJobCounts]);

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchKeyword(keyword);
  };

  const clearSearch = () => {
    setKeyword('');
    setSearchKeyword('');
  };

  const exportCSV = useCallback(() => {
    const headers = ['岗位名称', '公司', '地点', '薪资', '状态', '来源', '备注', '创建时间'];
    const dataToExport = selectedIds.length > 0 ? jobs.filter((j) => selectedIds.includes(j.id)) : jobs;
    const rows = dataToExport.map((job) => [
      job.title,
      job.company,
      job.location || '',
      job.salary || '',
      STATUS_LABELS[job.status],
      job.source || '',
      (job.notes || '').replace(/\n/g, ' '),
      new Date(job.createdAt).toLocaleDateString('zh-CN'),
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `岗位列表_${new Date().toLocaleDateString('zh-CN')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [jobs, selectedIds]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === jobs.length && jobs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(jobs.map((j) => j.id));
    }
  }, [selectedIds, jobs]);

  const toggleSelectJob = useCallback((jobId: string) => {
    setSelectedIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个岗位吗？此操作不可恢复。`)) return;
    try {
      const res = await fetch('/api/jobs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: 'delete' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '删除失败');
      setJobs((prev) => prev.filter((j) => !selectedIds.includes(j.id)));
      setSelectedIds([]);
      fetchJobCounts();
      fetchUpcoming();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  }, [selectedIds, fetchJobCounts, fetchUpcoming]);

  const handleBatchUpdateStatus = useCallback(
    async (newStatus: JobStatus) => {
      if (selectedIds.length === 0) return;
      try {
        const res = await fetch('/api/jobs/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds, action: 'update_status', status: newStatus }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || '更新失败');
        setJobs((prev) =>
          prev.map((j) => (selectedIds.includes(j.id) ? { ...j, status: newStatus } : j))
        );
        setSelectedIds([]);
        setShowBatchStatusMenu(false);
        fetchJobCounts();
        fetchUpcoming();
      } catch (err) {
        alert(err instanceof Error ? err.message : '更新失败');
      }
    },
    [selectedIds, fetchJobCounts, fetchUpcoming]
  );

  const handleDelete = useCallback(
    async (jobId: string, jobTitle: string) => {
      if (!confirm(`确定要删除岗位「${jobTitle}」吗？此操作不可恢复。`)) return;
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || '删除失败');
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        setSelectedIds((prev) => prev.filter((id) => id !== jobId));
        fetchJobCounts();
        fetchUpcoming();
      } catch (err) {
        alert(err instanceof Error ? err.message : '删除失败');
      }
    },
    [fetchJobCounts, fetchUpcoming]
  );

  const handleStatusChange = (status: JobStatus | 'all') => {
    setActiveStatus(status);
    setSelectedIds([]);
  };

  const totalUpcoming =
    (upcomingData?.upcomingInterviews.length || 0) +
    (upcomingData?.pendingWrittenTests.length || 0);
  const within24hCount =
    upcomingData?.upcomingInterviews.filter((i) => {
      const diffMs = new Date(i.scheduledAt).getTime() - new Date(upcomingData.now).getTime();
      return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
    }).length || 0;

  return (
    <div className="min-h-screen">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">我的岗位</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="导出 CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">导出</span>
              </button>
              <Link
                href="/jobs/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加岗位
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 搜索栏 */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索岗位名称、公司、地点..."
                className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
            >
              搜索
            </button>
          </div>
        </form>

        {/* 待办提醒 */}
        {!loadingUpcoming && totalUpcoming > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowUpcoming(!showUpcoming)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl hover:bg-orange-50/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-slate-900">
                  待办提醒
                </span>
                {within24hCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                    {within24hCount} 个即将到来
                  </span>
                )}
                <span className="text-xs text-slate-500">共 {totalUpcoming} 项</span>
              </div>
              {showUpcoming ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showUpcoming && upcomingData && (
              <div className="mt-2 space-y-2">
                {/* 即将到来的面试 */}
                {upcomingData.upcomingInterviews.map((interview) => {
                  const diffMs =
                    new Date(interview.scheduledAt).getTime() -
                    new Date(upcomingData.now).getTime();
                  const within24h = diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
                  return (
                    <Link
                      key={interview.id}
                      href={`/jobs/${interview.job.id}`}
                      className={cn(
                        'block bg-white border rounded-xl p-4 hover:shadow-sm transition-all',
                        within24h
                          ? 'border-orange-300'
                          : 'border-blue-200'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                            within24h
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-blue-100 text-blue-600'
                          )}
                        >
                          <Video className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-900">
                              {interview.job.title}
                            </span>
                            <span className="text-xs text-slate-500">
                              {interview.job.company}
                            </span>
                          </div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {INTERVIEW_TYPE_LABELS[interview.type] || interview.type} · 第{interview.round}轮
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              {formatDate(interview.scheduledAt)}
                            </span>
                            {within24h && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                {formatDateShort(interview.scheduledAt)}
                              </span>
                            )}
                            {!within24h && (
                              <span className="text-xs text-blue-500 font-medium">
                                {formatDateShort(interview.scheduledAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                      </div>
                    </Link>
                  );
                })}

                {/* 待完成的笔试 */}
                {upcomingData.pendingWrittenTests.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block bg-white border border-amber-200 rounded-xl p-4 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-900">
                            {job.title}
                          </span>
                          <span className="text-xs text-slate-500">
                            {job.company}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                            待笔试
                          </span>
                          <span className="text-xs text-slate-500">
                            更新于 {formatDate(job.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 状态筛选 Tabs */}
        <div className="mb-4">
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {ALL_STATUSES.map((s) => (
              <button
                key={s.key}
                onClick={() => handleStatusChange(s.key)}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5',
                  activeStatus === s.key
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                )}
              >
                {s.label}
                {jobCounts[s.key] !== undefined && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      activeStatus === s.key
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {jobCounts[s.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.length > 0 && (
          <div className="mb-4 bg-primary-50 border border-primary-200 rounded-lg p-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-primary-700 font-medium">
                  已选择 {selectedIds.length} 个岗位
                </span>
                <div className="h-4 w-px bg-primary-200 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary-600 hidden sm:inline">批量操作：</span>
                  <button
                    onClick={() => setShowBatchStatusMenu(!showBatchStatusMenu)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-primary-100 transition-colors"
                  >
                    修改状态
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedIds([])}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                取消
              </button>
            </div>
            {showBatchStatusMenu && (
              <div className="mt-2 flex flex-wrap gap-2 pt-2 border-t border-primary-200">
                {ALL_STATUSES.filter((s) => s.key !== 'all').map((s) => (
                  <button
                    key={s.key}
                    onClick={() => handleBatchUpdateStatus(s.key as JobStatus)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      'bg-white text-slate-700 hover:bg-primary-100 border border-slate-200'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 内容区域 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="mt-3 text-sm text-slate-500">加载中...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchJobs}
              className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              重试
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              {activeStatus === 'all' && !searchKeyword
                ? '还没有添加任何岗位'
                : '没有符合条件的岗位'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {activeStatus === 'all' && !searchKeyword
                ? '点击"添加岗位"开始追踪你的求职进度'
                : '尝试切换筛选条件或清除搜索'}
            </p>
            {activeStatus === 'all' && !searchKeyword ? (
              <Link
                href="/jobs/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加第一个岗位
              </Link>
            ) : (
              <button
                onClick={() => {
                  setActiveStatus('all');
                  clearSearch();
                }}
                className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {/* 全选栏 */}
            <div className="flex items-center gap-2 px-1">
              <button
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                {selectedIds.length === jobs.length && jobs.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-primary-500" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                全选
              </button>
            </div>
            {jobs.map((job) => (
              <div
                key={job.id}
                className={cn(
                  'bg-white rounded-xl border p-5 hover:shadow-md transition-all group',
                  selectedIds.includes(job.id)
                    ? 'border-primary-300 ring-1 ring-primary-200'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleSelectJob(job.id)}
                    className="mt-1 flex-shrink-0 text-slate-400 hover:text-primary-500 transition-colors"
                  >
                    {selectedIds.includes(job.id) ? (
                      <CheckSquare className="w-5 h-5 text-primary-500" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                  <Link href={`/jobs/${job.id}`} className="flex-1 min-w-0 block">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-primary-600 transition-colors">
                        {job.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{job.company}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {job.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                      {job.salary && (
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {job.salary}
                        </span>
                      )}
                      {job.source && (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {job.source}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(job.createdAt)}
                      </span>
                    </div>
                    {job.notes && (
                      <p className="mt-3 text-xs text-slate-400 line-clamp-1 border-t border-slate-100 pt-3">
                        {job.notes}
                      </p>
                    )}
                  </Link>
                  <div className="flex-shrink-0 flex items-start gap-2 relative z-10">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                        STATUS_COLORS[job.status]
                      )}
                    >
                      {STATUS_LABELS[job.status]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(job.id, job.title)}
                      className="relative z-10 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="删除岗位"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部统计 */}
        {!loading && !error && jobs.length > 0 && (
          <div className="mt-8 text-center text-xs text-slate-400">
            共 {jobs.length} 个岗位
            {searchKeyword && `（搜索 "${searchKeyword}"）`}
          </div>
        )}
      </div>
    </div>
  );
}