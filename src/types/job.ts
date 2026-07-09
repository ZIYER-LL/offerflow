export type JobStatus = 'saved' | 'applied' | 'written_test' | 'interview' | 'offer' | 'rejected' | 'archived';

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  url?: string;
  status: JobStatus;
  source?: string;
  jdSnapshot?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  interviews?: Interview[];
}

export type InterviewType = 'phone' | 'video' | 'onsite' | 'hr';
export type InterviewResult = 'pending' | 'passed' | 'failed' | 'no_show';

export interface Interview {
  id: string;
  round: number;
  type: InterviewType;
  scheduledAt: string | null;
  interviewer: string | null;
  feedback: string | null;
  result: InterviewResult;
  jobId: string;
  createdAt: string;
  updatedAt: string;
}

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  phone: '电话面试',
  video: '视频面试',
  onsite: '现场面试',
  hr: 'HR面试',
};

export const INTERVIEW_RESULT_LABELS: Record<InterviewResult, string> = {
  pending: '待定',
  passed: '通过',
  failed: '未通过',
  no_show: '未出席',
};

export const INTERVIEW_RESULT_COLORS: Record<InterviewResult, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-700',
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  saved: '待投递',
  applied: '已投递',
  written_test: '笔试',
  interview: '面试',
  offer: 'Offer',
  rejected: '已拒绝',
  archived: '已归档',
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  saved: 'bg-gray-100 text-gray-700',
  applied: 'bg-blue-100 text-blue-700',
  written_test: 'bg-yellow-100 text-yellow-700',
  interview: 'bg-purple-100 text-purple-700',
  offer: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  archived: 'bg-gray-50 text-gray-500',
};
