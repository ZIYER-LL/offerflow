import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { unstable_cache } from 'next/cache';

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
        if (keyword) {
          filteredJobs = jobs.filter((job) =>
            job.title.toLowerCase().includes(keyword) ||
            job.company.toLowerCase().includes(keyword) ||
            (job.location && job.location.toLowerCase().includes(keyword)) ||
            (job.notes && job.notes.toLowerCase().includes(keyword)) ||
            (job.jdSnapshot && job.jdSnapshot.toLowerCase().includes(keyword))
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
