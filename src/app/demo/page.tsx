'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Briefcase,
  Search,
  X,
  BarChart3,
  Download,
} from 'lucide-react';
import { Job, JobStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/job';
import Link from 'next/link';

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

const QUICK_TAGS = ['大模型', '算法', '产品经理', '前端', '后端', '数据分析', '字节', '阿里', '腾讯'];

// 同义词映射（与 API 端保持一致）
const SYNONYM_MAP: Record<string, string[]> = {
  '大模型': ['llm', 'gpt', '大语言模型', '生成式ai', 'aigc', '大模型'],
  '大语言模型': ['llm', 'gpt', '大模型', '生成式ai', 'aigc', '大语言模型'],
  'llm': ['大模型', 'gpt', '大语言模型', '生成式ai', 'aigc'],
  'gpt': ['大模型', 'llm', '大语言模型', '生成式ai', 'aigc'],
  'aigc': ['大模型', 'llm', 'gpt', '生成式ai', '大语言模型'],
  '生成式ai': ['大模型', 'llm', 'gpt', 'aigc', '大语言模型'],
  'ai': ['人工智能', 'ai', '大模型', 'llm', '机器学习', '深度学习'],
  '人工智能': ['ai', '大模型', 'llm', '机器学习', '深度学习'],
  '算法': ['算法', '算法工程师', 'algorithm'],
  '产品经理': ['pm', '产品', '产品经理'],
  'pm': ['产品经理', '产品'],
  '前端': ['前端', 'frontend', 'react', 'vue'],
  '后端': ['后端', 'backend', 'java', 'go', 'python'],
  'java': ['后端', 'java'],
  'python': ['后端', 'python', '算法'],
  'go': ['后端', 'golang', 'go'],
  'golang': ['后端', 'go'],
  '数据分析': ['数据', '数据分析', '数据分析师', 'sql'],
  '运营': ['运营', '用户运营', '产品运营', '内容运营'],
  '设计': ['设计', 'ui', 'ux', '设计师'],
  '字节': ['字节跳动', '字节', 'bytedance', '抖音'],
  '字节跳动': ['字节', 'bytedance', '抖音'],
  '抖音': ['字节跳动', '字节', 'bytedance'],
  '阿里': ['阿里巴巴', '阿里', 'alibaba', '淘宝', '天猫'],
  '阿里巴巴': ['阿里', 'alibaba', '淘宝', '天猫'],
  '腾讯': ['腾讯', 'tencent', '微信'],
  '美团': ['美团', 'meituan'],
  '京东': ['京东', 'jd'],
  '百度': ['百度', 'baidu'],
};

function expandKeywords(keyword: string): string[] {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return [];
  const result = new Set<string>([kw]);
  if (SYNONYM_MAP[kw]) {
    SYNONYM_MAP[kw].forEach((s) => result.add(s));
  }
  for (const [key, values] of Object.entries(SYNONYM_MAP)) {
    if (key.includes(kw) || kw.includes(key)) {
      result.add(key);
      values.forEach((v) => result.add(v));
    }
  }
  return Array.from(result);
}

// 模拟测试数据
const MOCK_JOBS: Job[] = [
  {
    id: '1', title: '大模型产品经理', company: '字节跳动', location: '北京', salary: '30-50K',
    source: 'BOSS直聘', status: 'interview', url: '', jdSnapshot: '负责大模型应用产品设计，包括 AI 搜索、Agent、RAG 等场景。深入理解 LLM 技术能力，结合业务需求设计产品方案。',
    notes: '一面已过，等待二面', createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '2', title: 'AI 搜索算法工程师', company: '阿里巴巴', location: '杭州', salary: '40-60K',
    source: '牛客', status: 'written_test', url: '', jdSnapshot: '负责搜索推荐算法研发，基于大模型和深度学习技术优化搜索体验。研究 LLM 在搜索场景的应用，包括 RAG、Query 理解等。',
    notes: '笔试安排在下周三', createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '3', title: 'LLM 应用开发工程师', company: '腾讯', location: '深圳', salary: '35-55K',
    source: '拉勾', status: 'applied', url: '', jdSnapshot: '负责大语言模型应用开发，基于 GPT/LLM 构建企业级 AIGC 产品。设计和实现 Agent 工作流，RAG 检索增强生成系统。',
    notes: '', createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '4', title: 'AIGC 产品运营', company: '百度', location: '北京', salary: '20-35K',
    source: 'BOSS直聘', status: 'saved', url: '', jdSnapshot: '负责 AIGC 产品运营，推动生成式 AI 产品用户增长。基于大模型能力设计运营活动和用户激励体系。',
    notes: '', createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '5', title: '高级前端工程师', company: '字节跳动', location: '上海', salary: '30-45K',
    source: 'BOSS直聘', status: 'offer', url: '', jdSnapshot: '负责公司核心产品前端开发，使用 React 技术栈。推动前端工程化建设，优化性能和开发体验。',
    notes: '已接 offer，薪资 38K', createdAt: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '6', title: '前端开发工程师', company: '美团', location: '北京', salary: '25-40K',
    source: '前程无忧', status: 'interview', url: '', jdSnapshot: '负责美团外卖 Web 端前端开发。使用 React + TypeScript 技术栈。参与性能优化和用户体验改进。',
    notes: '明天下午视频面试', createdAt: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '7', title: 'Java 后端开发', company: '阿里巴巴', location: '杭州', salary: '30-50K',
    source: '牛客', status: 'applied', url: '', jdSnapshot: '负责电商平台后端系统开发。使用 Java / Spring Boot 技术栈。高并发系统设计与优化。',
    notes: '', createdAt: new Date(Date.now() - 13 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '8', title: 'Go 后端工程师', company: '腾讯', location: '深圳', salary: '28-45K',
    source: '拉勾', status: 'saved', url: '', jdSnapshot: '负责云服务后端开发，使用 Golang。参与微服务架构设计与实现。性能优化与稳定性建设。',
    notes: '', createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '9', title: '产品经理', company: '京东', location: '北京', salary: '25-40K',
    source: 'BOSS直聘', status: 'rejected', url: '', jdSnapshot: '负责京东零售电商产品设计。需求分析、产品规划、项目推进。数据分析与效果评估。',
    notes: '一面挂，感觉答得不好', createdAt: new Date(Date.now() - 17 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '10', title: '数据分析师', company: '美团', location: '北京', salary: '20-35K',
    source: '猎聘', status: 'interview', url: '', jdSnapshot: '负责业务数据分析，输出数据洞察和策略建议。搭建数据看板和指标体系。',
    notes: 'HR面已完成', createdAt: new Date(Date.now() - 19 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '11', title: '用户运营', company: '字节跳动', location: '北京', salary: '15-25K',
    source: 'BOSS直聘', status: 'saved', url: '', jdSnapshot: '负责抖音用户增长运营。策划运营活动，提升用户活跃度和留存。数据分析与效果追踪。',
    notes: '', createdAt: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '12', title: '测试开发工程师', company: '百度', location: '北京', salary: '25-40K',
    source: '牛客', status: 'applied', url: '', jdSnapshot: '负责 QA 质量保障，测试框架和工具开发。自动化测试体系建设。性能测试和稳定性测试。',
    notes: '', createdAt: new Date(Date.now() - 23 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '13', title: 'SRE 运维工程师', company: '腾讯', location: '深圳', salary: '28-45K',
    source: '猎聘', status: 'saved', url: '', jdSnapshot: '负责 DevOps 和 SRE 相关工作。运维平台和监控系统建设。保障线上系统稳定性。',
    notes: '', createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '14', title: 'UI 设计师', company: '快手', location: '北京', salary: '20-35K',
    source: '站酷', status: 'archived', url: '', jdSnapshot: '负责产品 UI 设计，包括 UX 体验优化。设计规范和组件库建设。',
    notes: '薪资不符合预期', createdAt: new Date(Date.now() - 27 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '15', title: 'HR 招聘专员', company: '小米', location: '北京', salary: '12-20K',
    source: 'BOSS直聘', status: 'saved', url: '', jdSnapshot: '负责技术岗位招聘。简历筛选、面试安排、Offer 沟通。招聘渠道维护。',
    notes: '', createdAt: new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '16', title: '商务拓展 BD', company: '滴滴', location: '北京', salary: '18-30K',
    source: 'BOSS直聘', status: 'rejected', url: '', jdSnapshot: '负责销售和商务拓展工作。开拓新客户，维护客户关系。完成销售目标。',
    notes: '终面没过', createdAt: new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '17', title: '大模型算法工程师', company: '智谱 AI', location: '北京', salary: '50-80K',
    source: 'BOSS直聘', status: 'saved', url: '', jdSnapshot: '参与大语言模型研发，包括预训练、对齐、RAG 等方向。优化 LLM 模型效果和推理性能。探索 AIGC 新技术方向。',
    notes: '', createdAt: new Date(Date.now() - 33 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '18', title: 'AI 产品经理', company: '月之暗面', location: '北京', salary: '40-60K',
    source: '小红书', status: 'written_test', url: '', jdSnapshot: '负责 Kimi 大模型产品设计。深入理解 LLM 技术，设计用户友好的 AI 产品。与算法团队协作，推动功能落地。',
    notes: '', createdAt: new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '19', title: '大模型后端开发', company: 'MiniMax', location: '上海', salary: '45-70K',
    source: 'BOSS直聘', status: 'applied', url: '', jdSnapshot: '负责大模型推理服务后端开发。优化 LLM 推理性能和稳定性。构建 RAG 和 Agent 基础设施。',
    notes: '', createdAt: new Date(Date.now() - 37 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
  {
    id: '20', title: '算法实习生', company: '商汤科技', location: '上海', salary: '300-500/天',
    source: '牛客', status: 'saved', url: '', jdSnapshot: '参与计算机视觉和大模型相关算法研究。数据处理和模型训练。论文复现和实验。',
    notes: '', createdAt: new Date(Date.now() - 39 * 24 * 3600 * 1000).toISOString(), updatedAt: '', userId: '',
  },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DemoPage() {
  const [jobs] = useState<Job[]>(MOCK_JOBS);
  const [activeStatus, setActiveStatus] = useState<JobStatus | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 计算状态计数
  const jobCounts: Record<string, number> = { all: jobs.length };
  ALL_STATUSES.forEach((s) => {
    if (s.key !== 'all') {
      jobCounts[s.key] = jobs.filter((j) => j.status === s.key).length;
    }
  });

  // 状态 + 关键词过滤
  const filteredJobs = jobs.filter((job) => {
    if (activeStatus !== 'all' && job.status !== activeStatus) return false;
    if (!searchKeyword.trim()) return true;
    const expanded = expandKeywords(searchKeyword);
    return expanded.some((kw) =>
      job.title.toLowerCase().includes(kw) ||
      job.company.toLowerCase().includes(kw) ||
      (job.location && job.location.toLowerCase().includes(kw)) ||
      (job.salary && job.salary.toLowerCase().includes(kw)) ||
      (job.source && job.source.toLowerCase().includes(kw)) ||
      (job.notes && job.notes.toLowerCase().includes(kw)) ||
      (job.jdSnapshot && job.jdSnapshot.toLowerCase().includes(kw))
    );
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchKeyword(keyword);
  };

  const clearSearch = () => {
    setKeyword('');
    setSearchKeyword('');
  };

  const handleTagClick = (tag: string) => {
    setKeyword(tag);
    setSearchKeyword(tag);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">我的岗位</h1>
                <p className="text-xs text-amber-600 font-medium">演示模式（免登录）</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/demo-analytics"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">数据看板</span>
              </Link>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors opacity-60 cursor-not-allowed"
                disabled
              >
                <Plus className="w-4 h-4" />
                添加岗位
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 提示横幅 */}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
          <span className="text-lg">💡</span>
          <span>这是演示模式，数据为模拟数据。完整功能请登录后使用。</span>
        </div>

        {/* 状态筛选 */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          {ALL_STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveStatus(s.key)}
              className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeStatus === s.key
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s.label}
              <span className={`ml-1.5 text-xs ${
                activeStatus === s.key ? 'text-primary-100' : 'text-slate-400'
              }`}>
                {jobCounts[s.key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* 搜索栏 */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索岗位名称、公司、JD、技能..."
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

          {/* 快速搜索标签 */}
          {!searchKeyword && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-xs text-slate-400 mr-1 self-center">快速搜索：</span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="px-2.5 py-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-full hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* 搜索结果提示 */}
          {searchKeyword && (
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
              <span>已搜索 "<span className="text-primary-600 font-medium">{searchKeyword}</span>"</span>
              <span className="text-slate-300">·</span>
              <span>匹配 {filteredJobs.length} 条结果</span>
              <button
                type="button"
                onClick={clearSearch}
                className="ml-auto text-primary-500 hover:text-primary-600"
              >
                清除搜索
              </button>
            </div>
          )}
        </form>

        {/* 岗位列表 */}
        <div className="space-y-3">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-lg">没有找到匹配的岗位</p>
              <p className="text-sm mt-1">试试其他关键词</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-slate-900 truncate">{job.title}</h3>
                      <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                        STATUS_COLORS[job.status as keyof typeof STATUS_COLORS]
                      }`}>
                        {STATUS_LABELS[job.status as keyof typeof STATUS_LABELS]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
                      <span>{job.company}</span>
                      {job.location && <span>· {job.location}</span>}
                      {job.salary && <span>· {job.salary}</span>}
                    </div>
                    {job.notes && (
                      <p className="text-sm text-slate-400 mt-2 line-clamp-1">{job.notes}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span>{formatDate(job.createdAt)}创建</span>
                      {job.source && <span>· 来源：{job.source}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
