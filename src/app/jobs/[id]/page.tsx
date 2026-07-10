'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  ArrowLeft, MapPin, DollarSign, Globe, Clock, ChevronDown, ChevronUp,
  Loader2, Trash2, Save, ExternalLink, Briefcase, Plus, Calendar,
  MessageSquare, Pencil, X, Video, AlertTriangle, LogOut, User, FileText,
} from 'lucide-react';
import {
  Job, JobStatus, STATUS_LABELS, STATUS_COLORS,
  Interview, InterviewType, InterviewResult,
  INTERVIEW_TYPE_LABELS, INTERVIEW_RESULT_LABELS, INTERVIEW_RESULT_COLORS,
} from '@/types/job';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { key: JobStatus; label: string }[] = [
  { key: 'saved', label: '待投递' },
  { key: 'applied', label: '已投递' },
  { key: 'written_test', label: '笔试' },
  { key: 'interview', label: '面试' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: '已拒绝' },
  { key: 'archived', label: '已归档' },
];

const INTERVIEW_TYPE_OPTIONS: { key: InterviewType; label: string }[] = [
  { key: 'phone', label: '电话面试' },
  { key: 'video', label: '视频面试' },
  { key: 'onsite', label: '现场面试' },
  { key: 'hr', label: 'HR面试' },
];

const INTERVIEW_RESULT_OPTIONS: { key: InterviewResult; label: string }[] = [
  { key: 'pending', label: '待定' },
  { key: 'passed', label: '通过' },
  { key: 'failed', label: '未通过' },
  { key: 'no_show', label: '未出席' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
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
  return `${Math.floor(diffHours / 24)} 天后`;
}

function formatDateInput(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isWithin24h(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
}

function isUpcoming(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() > Date.now();
}

export default function JobDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showJd, setShowJd] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesChanged, setNotesChanged] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // 面试记录
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [interviewForm, setInterviewForm] = useState({
    round: 1, type: 'phone' as InterviewType, scheduledAt: '',
    feedback: '', result: 'pending' as InterviewResult, meetingUrl: '',
  });

  // 笔试记录
  const [tests, setTests] = useState<Interview[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [editingTest, setEditingTest] = useState<Interview | null>(null);
  const [testForm, setTestForm] = useState({
    scheduledAt: '', meetingUrl: '', feedback: '', result: 'pending' as InterviewResult,
  });

  const sortedInterviews = useMemo(() => {
    const items = interviews.filter((i) => i.type !== 'written_test');
    const upcoming = items.filter((i) => isUpcoming(i.scheduledAt));
    const past = items.filter((i) => !isUpcoming(i.scheduledAt));
    upcoming.sort((a, b) => {
      if (!a.scheduledAt) return 1;
      if (!b.scheduledAt) return -1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
    return [...upcoming, ...past];
  }, [interviews]);

  const sortedTests = useMemo(() => {
    const upcoming = tests.filter((t) => isUpcoming(t.scheduledAt));
    const past = tests.filter((t) => !isUpcoming(t.scheduledAt));
    upcoming.sort((a, b) => {
      if (!a.scheduledAt) return 1;
      if (!b.scheduledAt) return -1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
    return [...upcoming, ...past];
  }, [tests]);

  const fetchJob = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/jobs/${id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '获取岗位详情失败');
      setJob(data.data);
      setNotes(data.data.notes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchInterviews = useCallback(async () => {
    try {
      setLoadingInterviews(true);
      setLoadingTests(true);
      const res = await fetch(`/api/jobs/${id}/interviews`);
      const data = await res.json();
      if (data.success) {
        const all = data.data.map((i: Interview) => ({
          ...i,
          scheduledAt: i.scheduledAt ? new Date(i.scheduledAt).toISOString() : null,
        }));
        setInterviews(all);
        setTests(all.filter((i: Interview) => i.type === 'written_test'));
      }
    } catch (err) {
      console.error('获取记录失败:', err);
    } finally {
      setLoadingInterviews(false);
      setLoadingTests(false);
    }
  }, [id]);

  useEffect(() => { fetchJob(); }, [fetchJob]);
  useEffect(() => { if (id) fetchInterviews(); }, [id, fetchInterviews]);

  const resetInterviewForm = useCallback(() => {
    const nonTestCount = interviews.filter((i) => i.type !== 'written_test').length;
    setInterviewForm({
      round: nonTestCount + 1, type: 'phone', scheduledAt: '',
      feedback: '', result: 'pending', meetingUrl: '',
    });
    setEditingInterview(null);
  }, [interviews]);

  const resetTestForm = useCallback(() => {
    setTestForm({ scheduledAt: '', meetingUrl: '', feedback: '', result: 'pending' });
    setEditingTest(null);
  }, []);

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (!job || newStatus === job.status) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '更新状态失败');
      setJob(data.data);
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新状态失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!job || !notesChanged) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '保存备注失败');
      setJob(data.data); setNotesChanged(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存备注失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    try {
      setDeleting(true);
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '删除失败');
      router.push('/jobs');
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
      setDeleting(false);
    }
  };

  // 面试 CRUD
  const handleSaveInterview = async () => {
    try {
      const body = {
        ...interviewForm, scheduledAt: interviewForm.scheduledAt || null,
        meetingUrl: interviewForm.meetingUrl || null,
      };
      if (editingInterview) {
        const res = await fetch(`/api/jobs/${id}/interviews/${editingInterview.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || '更新失败');
      } else {
        const res = await fetch(`/api/jobs/${id}/interviews`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || '添加失败');
      }
      await fetchInterviews();
      setShowInterviewForm(false); resetInterviewForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm('确定要删除这条面试记录吗？')) return;
    try {
      const res = await fetch(`/api/jobs/${id}/interviews/${interviewId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '删除失败');
      await fetchInterviews();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const startEditInterview = (interview: Interview) => {
    setEditingInterview(interview);
    setInterviewForm({
      round: interview.round, type: interview.type, scheduledAt: formatDateInput(interview.scheduledAt),
      feedback: interview.feedback || '', result: interview.result, meetingUrl: interview.meetingUrl || '',
    });
    setShowInterviewForm(true);
  };

  // 笔试 CRUD
  const handleSaveTest = async () => {
    try {
      const body = {
        round: 1, type: 'written_test',
        scheduledAt: testForm.scheduledAt || null,
        meetingUrl: testForm.meetingUrl || null,
        feedback: testForm.feedback || null,
        result: testForm.result,
      };
      if (editingTest) {
        const res = await fetch(`/api/jobs/${id}/interviews/${editingTest.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || '更新失败');
      } else {
        const res = await fetch(`/api/jobs/${id}/interviews`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || '添加失败');
      }
      await fetchInterviews();
      setShowTestForm(false); resetTestForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('确定要删除这条笔试记录吗？')) return;
    try {
      const res = await fetch(`/api/jobs/${id}/interviews/${testId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '删除失败');
      await fetchInterviews();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const startEditTest = (test: Interview) => {
    setEditingTest(test);
    setTestForm({
      scheduledAt: formatDateInput(test.scheduledAt),
      meetingUrl: test.meetingUrl || '', feedback: test.feedback || '', result: test.result,
    });
    setShowTestForm(true);
  };

  // 通用渲染函数
  const renderEventCard = (item: Interview, isTest: boolean, onEdit: () => void, onDelete: () => void) => {
    const within24h = isWithin24h(item.scheduledAt);
    const upcoming = isUpcoming(item.scheduledAt);
    return (
      <div key={item.id} className={cn(
        'border rounded-lg p-4 transition-colors',
        within24h ? 'border-orange-300 bg-orange-50/50' :
          upcoming ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 hover:border-slate-300'
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {!isTest && (
                <span className="text-sm font-semibold text-slate-900">第 {item.round} 轮</span>
              )}
              {isTest && (
                <span className="text-sm font-semibold text-slate-900">笔试</span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {INTERVIEW_TYPE_LABELS[item.type]}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', INTERVIEW_RESULT_COLORS[item.result])}>
                {INTERVIEW_RESULT_LABELS[item.result]}
              </span>
              {within24h && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                  <AlertTriangle className="w-3 h-3" /> 即将到来
                </span>
              )}
              {upcoming && item.scheduledAt && !within24h && (
                <span className="text-xs text-blue-500 font-medium">{formatDateShort(item.scheduledAt)}</span>
              )}
            </div>
            <div className="space-y-1.5">
              {item.scheduledAt && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(item.scheduledAt)}</span>
                </div>
              )}
              {item.meetingUrl && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Video className="w-3.5 h-3.5 text-primary-500" />
                  <a href={item.meetingUrl} target="_blank" rel="noopener noreferrer"
                     className="text-primary-600 hover:text-primary-700 underline underline-offset-2 truncate max-w-[300px] inline-block">
                    {item.meetingUrl}
                  </a>
                </div>
              )}
              {item.feedback && (
                <div className="flex items-start gap-1.5 text-xs text-slate-500">
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span className="whitespace-pre-wrap">{item.feedback}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded transition-colors" title="编辑">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="删除">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">加载中...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-sm text-red-500 mb-4">{error || '岗位不存在'}</p>
        <Link href="/jobs" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
          返回岗位列表
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-4 h-4" /> 返回列表
            </Link>
            <div className="flex items-center gap-3">
              {saving && (
                <span className="inline-flex items-center gap-1 text-xs text-primary-600">
                  <Loader2 className="w-3 h-3 animate-spin" /> 保存中
                </span>
              )}
              {session?.user && (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5" /> {session.user.name || session.user.email}
                  </span>
                  <button onClick={() => signOut({ callbackUrl: '/login' })}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="退出登录">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 岗位基本信息卡片 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 mb-1">{job.title}</h1>
              <p className="text-base text-slate-600">{job.company}</p>
            </div>
            <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium flex-shrink-0', STATUS_COLORS[job.status])}>
              {STATUS_LABELS[job.status]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {job.location && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" /> <span>{job.location}</span>
              </div>
            )}
            {job.salary && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <DollarSign className="w-4 h-4 text-slate-400" /> <span>{job.salary}</span>
              </div>
            )}
            {job.source && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Globe className="w-4 h-4 text-slate-400" /> <span>{job.source}</span>
              </div>
            )}
          </div>
          {job.url && (
            <a href={job.url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 transition-colors mb-4">
              <ExternalLink className="w-3.5 h-3.5" /> 查看来源链接
            </a>
          )}
          <div className="flex items-center gap-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> 创建于 {formatDate(job.createdAt)}</span>
            <span>更新于 {formatDate(job.updatedAt)}</span>
          </div>
        </div>

        {/* 状态切换 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">状态管理</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => handleStatusChange(opt.key)} disabled={saving}
                className={cn('px-2 py-2 text-xs font-medium rounded-lg transition-all text-center',
                  job.status === opt.key
                    ? cn(STATUS_COLORS[opt.key], 'ring-2 ring-offset-1 ring-slate-300')
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200')}
              >{opt.label}</button>
            ))}
          </div>
        </div>

        {/* ============ 笔试记录板块 ============ */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" /> 笔试记录
            </h2>
            <button onClick={() => { resetTestForm(); setShowTestForm(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
              <Plus className="w-3.5 h-3.5" /> 添加笔试
            </button>
          </div>

          {loadingTests ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-primary-500 animate-spin" /></div>
          ) : tests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">暂无笔试记录</p>
              <button onClick={() => { resetTestForm(); setShowTestForm(true); }}
                className="mt-2 text-xs text-amber-600 hover:text-amber-700">添加第一条笔试记录</button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTests.map((test) => renderEventCard(test, true,
                () => startEditTest(test), () => handleDeleteTest(test.id)))}
            </div>
          )}

          {/* 笔试表单 */}
          {showTestForm && (
            <div className="mt-4 border border-amber-200 rounded-lg p-4 bg-amber-50/30">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                {editingTest ? '编辑笔试' : '添加笔试'}
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">笔试时间</label>
                    <input type="datetime-local" value={testForm.scheduledAt}
                      onChange={(e) => setTestForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">结果</label>
                    <div className="flex gap-2 flex-wrap">
                      {INTERVIEW_RESULT_OPTIONS.map((opt) => (
                        <button key={opt.key}
                          onClick={() => setTestForm((p) => ({ ...p, result: opt.key }))}
                          className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border',
                            testForm.result === opt.key
                              ? cn(INTERVIEW_RESULT_COLORS[opt.key], 'border-transparent')
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">笔试链接</label>
                  <input type="url" value={testForm.meetingUrl}
                    onChange={(e) => setTestForm((p) => ({ ...p, meetingUrl: e.target.value }))}
                    placeholder="粘贴笔试链接（牛客、赛码、HackerRank 等）"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">备注 / 题目内容</label>
                  <textarea value={testForm.feedback}
                    onChange={(e) => setTestForm((p) => ({ ...p, feedback: e.target.value }))}
                    placeholder="记录笔试题目、注意事项..." rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleSaveTest}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors">
                    <Save className="w-3.5 h-3.5" /> {editingTest ? '保存修改' : '添加笔试'}
                  </button>
                  <button onClick={() => { setShowTestForm(false); resetTestForm(); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <X className="w-3.5 h-3.5" /> 取消
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============ 面试记录板块 ============ */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-slate-400" /> 面试记录
            </h2>
            <button onClick={() => { resetInterviewForm(); setShowInterviewForm(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
              <Plus className="w-3.5 h-3.5" /> 添加面试
            </button>
          </div>

          {loadingInterviews ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-primary-500 animate-spin" /></div>
          ) : sortedInterviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">暂无面试记录</p>
              <button onClick={() => { resetInterviewForm(); setShowInterviewForm(true); }}
                className="mt-2 text-xs text-primary-600 hover:text-primary-700">添加第一条面试记录</button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedInterviews.map((interview) => renderEventCard(interview, false,
                () => startEditInterview(interview), () => handleDeleteInterview(interview.id)))}
            </div>
          )}

          {/* 面试表单 */}
          {showInterviewForm && (
            <div className="mt-4 border border-primary-200 rounded-lg p-4 bg-primary-50/50">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                {editingInterview ? '编辑面试' : '添加面试'}
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">轮次</label>
                    <input type="number" min={1} value={interviewForm.round}
                      onChange={(e) => setInterviewForm((p) => ({ ...p, round: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">类型</label>
                    <select value={interviewForm.type}
                      onChange={(e) => setInterviewForm((p) => ({ ...p, type: e.target.value as InterviewType }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white">
                      {INTERVIEW_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">时间</label>
                  <input type="datetime-local" value={interviewForm.scheduledAt}
                    onChange={(e) => setInterviewForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">面邀链接</label>
                  <input type="url" value={interviewForm.meetingUrl}
                    onChange={(e) => setInterviewForm((p) => ({ ...p, meetingUrl: e.target.value }))}
                    placeholder="粘贴会议链接（腾讯会议、Zoom、飞书等）"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">结果</label>
                  <div className="flex gap-2 flex-wrap">
                    {INTERVIEW_RESULT_OPTIONS.map((opt) => (
                      <button key={opt.key}
                        onClick={() => setInterviewForm((p) => ({ ...p, result: opt.key }))}
                        className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border',
                          interviewForm.result === opt.key
                            ? cn(INTERVIEW_RESULT_COLORS[opt.key], 'border-transparent')
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">反馈/备注</label>
                  <textarea value={interviewForm.feedback}
                    onChange={(e) => setInterviewForm((p) => ({ ...p, feedback: e.target.value }))}
                    placeholder="记录反馈、问题、感受..." rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleSaveInterview}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors">
                    <Save className="w-3.5 h-3.5" /> {editingInterview ? '保存修改' : '添加面试'}
                  </button>
                  <button onClick={() => { setShowInterviewForm(false); resetInterviewForm(); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <X className="w-3.5 h-3.5" /> 取消
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* JD 快照 */}
        {job.jdSnapshot && (
          <div className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
            <button onClick={() => setShowJd(!showJd)}
              className="w-full flex items-center justify-between p-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400" /> 职位描述 (JD)</span>
              {showJd ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showJd && (
              <div className="px-4 pb-4">
                <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {job.jdSnapshot}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 备注编辑 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">备注</h2>
            {notesChanged && (
              <button onClick={handleSaveNotes} disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50">
                <Save className="w-3 h-3" /> 保存
              </button>
            )}
          </div>
          <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setNotesChanged(true); }}
            placeholder="添加你的备注..." rows={4}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400" />
        </div>

        {/* 危险操作 */}
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="text-sm font-semibold text-red-600 mb-2">危险操作</h2>
          <p className="text-xs text-slate-500 mb-3">删除后无法恢复，请谨慎操作。</p>
          <button onClick={handleDelete} disabled={deleting}
            className={cn('inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              deleteConfirm ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-50 text-red-600 hover:bg-red-100')}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleteConfirm ? '确认删除' : '删除岗位'}
          </button>
          {deleteConfirm && (
            <button onClick={() => setDeleteConfirm(false)}
              className="ml-3 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">取消</button>
          )}
        </div>
      </div>
    </div>
  );
}
