import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { unstable_cache } from 'next/cache';

// GET /api/jobs - 获取当前用户的岗位（带缓存）
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const keyword = searchParams.get('keyword')?.trim().toLowerCase();

    const cacheKey = `${session.user.id}-${status}-${sortBy}-${sortOrder}-${keyword || ''}`;

    // 使用 Next.js 不稳定缓存，5 秒内重复请求直接返回缓存
    const getCachedJobs = unstable_cache(
      async () => {
        const where: Record<string, unknown> = { userId: session.user.id };
        if (status && status !== 'all') {
          where.status = status;
        }

        const validSortFields = ['status', 'createdAt', 'updatedAt', 'company', 'title'];
        const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

        const jobs = await prisma.job.findMany({
          where,
          orderBy: { [orderByField]: orderDirection },
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

        return filteredJobs.map((job) => ({
          ...job,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        }));
      },
      ['jobs-list', cacheKey],
      { revalidate: 5, tags: ['jobs'] }
    );

    const serializedJobs = await getCachedJobs();

    const response = NextResponse.json({ success: true, data: serializedJobs });
    // 浏览器端也缓存 5 秒
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
