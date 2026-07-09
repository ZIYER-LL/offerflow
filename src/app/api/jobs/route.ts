import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/jobs - 获取当前用户的岗位
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

    const where: Record<string, unknown> = { userId: session.user.id };
    if (status && status !== 'all') {
      where.status = status;
    }

    const validSortFields = ['status', 'createdAt', 'updatedAt', 'company', 'title'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    const jobs = await prisma.job.findMany({
      where,
      orderBy: {
        [orderByField]: orderDirection,
      },
    });

    // 全文搜索
    const keyword = searchParams.get('keyword')?.trim().toLowerCase();
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

    const serializedJobs = filteredJobs.map((job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: serializedJobs });
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
