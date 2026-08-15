'use client';

import { useState } from 'react';
import {
  Sparkles, ChevronDown, ChevronUp, Pencil, Trash2, X,
  Plus, Save, Loader2, FileSearch, GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobAnalysisData, AnalysisItem } from '@/types/job';

interface AISummaryCardProps {
  jobId: string;
  analysis: {
    id: string;
    category: string | null;
    summary: JobAnalysisData | null;
  } | null;
  jdSnapshot?: string;
  onUpdate: () => void;
}

export default function AISummaryCard({ jobId, analysis, jdSnapshot, onUpdate }: AISummaryCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState<{ content: string; evidence: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasAnalysis = analysis?.summary && (
    analysis.summary.responsibilities?.length > 0 ||
    analysis.summary.requirements?.length > 0 ||
    analysis.summary.bonusQualifications?.length > 0 ||
    analysis.summary.educationRequirement
  );

  const handleSave = async (data: { category: string; summary: JobAnalysisData }) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/jobs/${jobId}/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || '保存失败');
      setEditing(false);
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除 AI 岗位分析吗？')) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/jobs/${jobId}/analysis`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || '删除失败');
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // ============ 无分析时的空状态 ============
  if (!hasAnalysis && !editing) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900">AI 岗位摘要</h2>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-slate-400 mb-3">
            尚未生成 AI 岗位分析
          </p>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            生成 AI 分析
          </button>
        </div>
      </div>
    );
  }

  // ============ 编辑模式 ============
  if (editing) {
    return (
      <>
        <AnalysisEditor
          initialCategory={analysis?.category || ''}
          initialData={analysis?.summary ?? null}
          jdSnapshot={jdSnapshot}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          saving={saving}
        />
        {evidenceModal && (
          <EvidenceModal
            content={evidenceModal.content}
            evidence={evidenceModal.evidence}
            onClose={() => setEvidenceModal(null)}
          />
        )}
      </>
    );
  }

  // ============ 展示模式 ============
  const data = analysis!.summary!;

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">AI 岗位摘要</h2>
                {analysis!.category && (
                  <p className="text-xs text-purple-600 mt-0.5">{analysis!.category}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded transition-colors"
                title="编辑分析"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="删除分析"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors ml-1"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* 内容 */}
        {expanded && (
          <div className="px-6 py-5 space-y-5">
            {/* 核心职责 */}
            {data.responsibilities?.length > 0 && (
              <AnalysisSection title="核心职责" items={data.responsibilities} onShowEvidence={setEvidenceModal} />
            )}

            {/* 关键要求 */}
            {data.requirements?.length > 0 && (
              <AnalysisSection title="关键要求" items={data.requirements} onShowEvidence={setEvidenceModal} accent="blue" />
            )}

            {/* 加分项 */}
            {data.bonusQualifications?.length > 0 && (
              <AnalysisSection title="加分项" items={data.bonusQualifications} onShowEvidence={setEvidenceModal} accent="green" />
            )}

            {/* 学历要求 */}
            {data.educationRequirement && (
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">学历要求</span>
                </div>
                <span className="text-sm text-slate-600">{data.educationRequirement}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* JD 证据弹窗 */}
      {evidenceModal && (
        <EvidenceModal
          content={evidenceModal.content}
          evidence={evidenceModal.evidence}
          onClose={() => setEvidenceModal(null)}
        />
      )}
    </>
  );
}

// ============ 分析区块子组件 ============
function AnalysisSection({
  title,
  items,
  onShowEvidence,
  accent = 'purple',
}: {
  title: string;
  items: AnalysisItem[];
  onShowEvidence: (item: { content: string; evidence: string }) => void;
  accent?: 'purple' | 'blue' | 'green';
}) {
  const accentMap = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
        <span className={cn('w-1 h-3 rounded-full', accentMap[accent])} />
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 group">
            <span className="text-slate-300 text-xs mt-0.5">·</span>
            <span className="text-sm text-slate-600 flex-1">{item.content}</span>
            {item.evidence && (
              <button
                onClick={() => onShowEvidence(item)}
                className="inline-flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <FileSearch className="w-3 h-3" />
                JD 证据
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============ JD 证据弹窗 ============
function EvidenceModal({
  content,
  evidence,
  onClose,
}: {
  content: string;
  evidence: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-[90%] max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <FileSearch className="w-4 h-4 text-purple-500" />
            JD 证据溯源
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          <div className="mb-4">
            <p className="text-xs text-slate-400 mb-1">提取项</p>
            <p className="text-sm font-medium text-slate-700">{content}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">JD 原文</p>
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 leading-relaxed border border-slate-100">
              "{evidence}"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 分析编辑器 ============
function AnalysisEditor({
  initialCategory,
  initialData,
  jdSnapshot,
  onSave,
  onCancel,
  saving,
}: {
  initialCategory: string;
  initialData: JobAnalysisData | null;
  jdSnapshot?: string;
  onSave: (data: { category: string; summary: JobAnalysisData }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [responsibilities, setResponsibilities] = useState<AnalysisItem[]>(
    initialData?.responsibilities || [{ content: '', evidence: '' }]
  );
  const [requirements, setRequirements] = useState<AnalysisItem[]>(
    initialData?.requirements || [{ content: '', evidence: '' }]
  );
  const [bonusQualifications, setBonusQualifications] = useState<AnalysisItem[]>(
    initialData?.bonusQualifications || [{ content: '', evidence: '' }]
  );
  const [educationRequirement, setEducationRequirement] = useState(
    initialData?.educationRequirement || ''
  );
  const [showJd, setShowJd] = useState(false);

  const updateItem = (
    setter: React.Dispatch<React.SetStateAction<AnalysisItem[]>>,
    idx: number,
    field: 'content' | 'evidence',
    value: string
  ) => {
    setter((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const addItem = (setter: React.Dispatch<React.SetStateAction<AnalysisItem[]>>) => {
    setter((prev) => [...prev, { content: '', evidence: '' }]);
  };

  const removeItem = (setter: React.Dispatch<React.SetStateAction<AnalysisItem[]>>, idx: number) => {
    setter((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    const cleanItems = (items: AnalysisItem[]) =>
      items.filter((item) => item.content.trim());

    onSave({
      category: category.trim(),
      summary: {
        responsibilities: cleanItems(responsibilities),
        requirements: cleanItems(requirements),
        bonusQualifications: cleanItems(bonusQualifications),
        educationRequirement: educationRequirement.trim(),
      },
    });
  };

  const renderItemList = (
    title: string,
    items: AnalysisItem[],
    setter: React.Dispatch<React.SetStateAction<AnalysisItem[]>>,
    placeholder: string
  ) => (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-2">{title}</label>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1">
              <input
                type="text"
                value={item.content}
                onChange={(e) => updateItem(setter, idx, 'content', e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
              />
              <input
                type="text"
                value={item.evidence}
                onChange={(e) => updateItem(setter, idx, 'evidence', e.target.value)}
                placeholder="JD 原文证据（可选）"
                className="w-full px-3 py-1.5 text-xs border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent placeholder:text-slate-400 bg-slate-50"
              />
            </div>
            {items.length > 1 && (
              <button
                onClick={() => removeItem(setter, idx)}
                className="p-1.5 mt-0.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => addItem(setter)}
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors"
        >
          <Plus className="w-3 h-3" /> 添加一项
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-purple-200 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          {initialData ? '编辑 AI 岗位摘要' : '创建 AI 岗位摘要'}
        </h2>
        <button
          onClick={() => setShowJd(!showJd)}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          {showJd ? '隐藏 JD' : '查看 JD'}
        </button>
      </div>

      {/* JD 参考面板 */}
      {showJd && jdSnapshot && (
        <div className="mb-4 bg-slate-50 rounded-lg p-3 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-slate-100">
          {jdSnapshot}
        </div>
      )}

      <div className="space-y-4">
        {/* 岗位类别 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">岗位类别 / 方向</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="如：AI 产品经理｜AI 搜索方向"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
          />
        </div>

        {renderItemList('核心职责', responsibilities, setResponsibilities, '如：AI 搜索产品设计')}
        {renderItemList('关键要求', requirements, setRequirements, '如：AI 产品经验')}
        {renderItemList('加分项', bonusQualifications, setBonusQualifications, '如：有搜索业务经验')}

        {/* 学历要求 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">学历要求</label>
          <input
            type="text"
            value={educationRequirement}
            onChange={(e) => setEducationRequirement(e.target.value)}
            placeholder="如：硕士优先"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            保存分析
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> 取消
          </button>
        </div>
      </div>
    </div>
  );
}
