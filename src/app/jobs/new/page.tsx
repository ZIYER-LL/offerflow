'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Building2,
  Briefcase,
  MapPin,
  DollarSign,
  Globe,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormData {
  company: string;
  title: string;
  location: string;
  salary: string;
  jdSnapshot: string;
  url: string;
}

export default function NewJobPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    company: '',
    title: '',
    location: '',
    salary: '',
    jdSnapshot: '',
    url: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证必填字段
    if (!form.title.trim() || !form.company.trim()) {
      setError('岗位名称和公司名称为必填项');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          company: form.company.trim(),
          location: form.location.trim() || null,
          salary: form.salary.trim() || null,
          jdSnapshot: form.jdSnapshot.trim() || null,
          url: form.url.trim() || null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || '创建岗位失败');
      }

      router.push('/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败，请稍后重试');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回列表
            </Link>
            <h1 className="text-sm font-semibold text-slate-900">添加新岗位</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 公司名称 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <Building2 className="w-4 h-4 text-primary-500" />
              公司名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="例如：字节跳动"
              required
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          {/* 岗位名称 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <Briefcase className="w-4 h-4 text-primary-500" />
              岗位名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="例如：前端工程师"
              required
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          {/* 地点和薪资 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
                <MapPin className="w-4 h-4 text-slate-400" />
                工作地点
              </label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="例如：北京"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
              />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
                <DollarSign className="w-4 h-4 text-slate-400" />
                薪资范围
              </label>
              <input
                type="text"
                name="salary"
                value={form.salary}
                onChange={handleChange}
                placeholder="例如：30k-50k"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 职位描述 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <FileText className="w-4 h-4 text-slate-400" />
              职位描述 (JD)
            </label>
            <textarea
              name="jdSnapshot"
              value={form.jdSnapshot}
              onChange={handleChange}
              placeholder="粘贴完整的职位描述..."
              rows={6}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
            />
            <p className="mt-2 text-xs text-slate-400">
              可选。粘贴完整的职位描述，方便后续查看。
            </p>
          </div>

          {/* 来源链接 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <LinkIcon className="w-4 h-4 text-slate-400" />
              来源链接
            </label>
            <input
              type="url"
              name="url"
              value={form.url}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
            />
            <p className="mt-2 text-xs text-slate-400">
              可选。填写招聘页面的链接，方便后续查看。
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建岗位'
              )}
            </button>
            <Link
              href="/jobs"
              className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              取消
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
