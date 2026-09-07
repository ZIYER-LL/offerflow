import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { unstable_cache } from 'next/cache';

// 同义词扩展词典：搜索关键词 → 扩展匹配词列表
const SYNONYM_MAP: Record<string, string[]> = {
  '大模型': ['llm', 'gpt', '大语言模型', '生成式ai', 'aigc', '大模型'],
  '大语言模型': ['llm', 'gpt', '大模型', '生成式ai', 'aigc', '大语言模型'],
  'llm': ['大模型', 'gpt', '大语言模型', '生成式ai', 'aigc'],
  'gpt': ['大模型', 'llm', '大语言模型', '生成式ai', 'aigc'],
  'aigc': ['大模型', 'llm', 'gpt', '生成式ai', '大语言模型'],
  '生成式ai': ['大模型', 'llm', 'gpt', 'aigc', '大语言模型'],
  'ai': ['人工智能', 'ai', '大模型', 'llm', '机器学习', '深度学习'],
  '人工智能': ['ai', '大模型', 'llm', '机器学习', '深度学习'],
  '机器学习': ['ml', 'machine learning', 'ai', '深度学习'],
  '深度学习': ['dl', 'deep learning', 'ml', 'ai'],
  '算法': ['算法', '算法工程师', 'algorithm'],
  '产品经理': ['pm', '产品', '产品经理'],
  'pm': ['产品经理', '产品'],
  '前端': ['前端', 'frontend', 'react', 'vue'],
  '后端': ['后端', 'backend', 'java', 'go', 'python'],
  'java': ['后端', 'java'],
  'python': ['后端', 'python', '算法'],
  'go': ['后端', 'golang', 'go'],
  'golang': ['后端', 'go'],
  'react': ['前端', 'react'],
  'vue': ['前端', 'vue'],
  '测试': ['测试', 'qa', '质量', '测试开发'],
  'qa': ['测试', '质量', '测试开发'],
  '运维': ['运维', 'devops', 'sre'],
  'devops': ['运维', 'sre'],
  'sre': ['运维', 'devops'],
  '数据分析': ['数据', '数据分析', '数据分析师', 'sql'],
  '数据分析师': ['数据分析', '数据', 'sql'],
  '运营': ['运营', '用户运营', '产品运营', '内容运营'],
  '设计': ['设计', 'ui', 'ux', '设计师'],
  'ui': ['设计', 'ui设计'],
  'hr': ['人力资源', 'hr', '招聘'],
  '人力资源': ['hr', '招聘'],
  '销售': ['销售', '商务', 'bd'],
  'bd': ['销售', '商务'],
  '商务': ['销售', 'bd'],
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

// 获取搜索关键词的同义词扩展列表
function expandKeywords(keyword: string): string[] {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return [];

  const result = new Set<string>([kw]);

  // 直接匹配词典
  if (SYNONYM_MAP[kw]) {
    SYNONYM_MAP[kw].forEach((s) => result.add(s));
  }

  // 部分匹配：如果关键词是词典条目的子串，也扩展
  for (const [key, values] of Object.entries(SYNONYM_MAP)) {
    if (key.includes(kw) || kw.includes(key)) {
      result.add(key);
      values.forEach((v) => result.add(v));
    }
  }

  return Array.from(result);
}

// GET /api/jobs - 获取当前用户的岗位（带缓存 + 最近笔面试事件）
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const keyword = searchParams.get('keyword')?.trim().toLowerCase();
    const expandedKeywords = keyword ? expandKeywords(keyword) : [];

    const cacheKey = `${session.user.id}-${status}-${keyword || ''}`;

    const getCachedJobs = unstable_cache(
      async () => {
        const where: Record<string, unknown> = { userId: session.user.id };
        if (status && status !== 'all') {
          where.status = status;
        }

        const jobs = await prisma.job.findMany({
          where,
          include: {
            interviews: {
              where: { result: 'pending' },
              orderBy: [{ scheduledAt: 'asc' }],
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        let filteredJobs = jobs;
        if (expandedKeywords.length > 0) {
          filteredJobs = jobs.filter((job) =>
            expandedKeywords.some((kw) =>
              job.title.toLowerCase().includes(kw) ||
              job.company.toLowerCase().includes(kw) ||
              (job.location && job.location.toLowerCase().includes(kw)) ||
              (job.salary && job.salary.toLowerCase().includes(kw)) ||
              (job.source && job.source.toLowerCase().includes(kw)) ||
              (job.notes && job.notes.toLowerCase().includes(kw)) ||
              (job.jdSnapshot && job.jdSnapshot.toLowerCase().includes(kw))
            )
          );
        }

        // 计算每个岗位的 upcomingEvent（最近的 pending 笔面试）
        const now = Date.now();
        const in24h = now + 24 * 60 * 60 * 1000;

        const jobsWithEvent = filteredJobs.map((job) => {
          const upcoming = job.interviews[0] || null;
          let upcomingEvent = null;

          if (upcoming) {
            const eventTime = upcoming.scheduledAt ? new Date(upcoming.scheduledAt).getTime() : null;
            upcomingEvent = {
              id: upcoming.id,
              type: upcoming.type,
              typeLabel: upcoming.type === 'written_test' ? '笔试' : '面试',
              scheduledAt: upcoming.scheduledAt ? new Date(upcoming.scheduledAt).toISOString() : null,
              isWithin24h: eventTime ? eventTime > now && eventTime <= in24h : false,
              isUpcoming: eventTime ? eventTime > now : true,
              meetingUrl: upcoming.meetingUrl,
            };
          }

          return {
            ...job,
            interviews: undefined,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            upcomingEvent,
          };
        });

        // 排序：24h 内 > 其他临期 > 无事件（各自内部按时间升序）
        jobsWithEvent.sort((a, b) => {
          const aEvent = a.upcomingEvent;
          const bEvent = b.upcomingEvent;

          if (aEvent?.isWithin24h && !bEvent?.isWithin24h) return -1;
          if (!aEvent?.isWithin24h && bEvent?.isWithin24h) return 1;

          if (aEvent?.isUpcoming && !bEvent?.isUpcoming) return -1;
          if (!aEvent?.isUpcoming && bEvent?.isUpcoming) return 1;

          if (aEvent?.scheduledAt && bEvent?.scheduledAt) {
            return new Date(aEvent.scheduledAt).getTime() - new Date(bEvent.scheduledAt).getTime();
          }
          if (aEvent?.scheduledAt) return -1;
          if (bEvent?.scheduledAt) return 1;

          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return jobsWithEvent;
      },
      ['jobs-list', cacheKey],
      { revalidate: 5, tags: ['jobs'] }
    );

    const serializedJobs = await getCachedJobs();

    const response = NextResponse.json({ success: true, data: serializedJobs });
    response.headers.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=10');
    return response;
  } catch (error) {
    console.error('获取岗位列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取岗位列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/jobs - 创建新岗位（关联当前用户）
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { title, company, location, salary, url, source, jdSnapshot, notes, status } = body;

    if (!title || !company) {
      return NextResponse.json(
        { success: false, error: '岗位名称和公司名称为必填项' },
        { status: 400 }
      );
    }

    const validStatuses = ['saved', 'applied', 'written_test', 'interview', 'offer', 'rejected', 'archived'];
    const jobStatus = status && validStatuses.includes(status) ? status : 'saved';

    const job = await prisma.job.create({
      data: {
        title,
        company,
        location: location || null,
        salary: salary || null,
        url: url || null,
        source: source || null,
        jdSnapshot: jdSnapshot || null,
        notes: notes || null,
        status: jobStatus,
        userId: session.user.id,
      },
    });

    const serializedJob = {
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: serializedJob }, { status: 201 });
  } catch (error) {
    console.error('创建岗位失败:', error);
    return NextResponse.json(
      { success: false, error: '创建岗位失败' },
      { status: 500 }
    );
  }
}
