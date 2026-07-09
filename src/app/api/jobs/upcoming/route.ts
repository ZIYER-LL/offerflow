import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET /api/jobs/upcoming — 获取当前用户即将到来的面试和待完成的笔试
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. 获取即将到来的面试（只查当前用户的岗位）
    const upcomingInterviews = await prisma.interview.findMany({
      where: {
        result: 'pending',
        scheduledAt: { gte: now },
        job: { userId: session.user.id },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        job: {
          select: { id: true, title: true, company: true, status: true },
        },
      },
    });

    // 2. 获取待完成的笔试（当前用户的）
    const pendingWrittenTests = await prisma.job.findMany({
      where: {
        status: 'written_test',
        userId: session.user.id,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 过滤掉已有未来面试的笔试岗位
    const interviewJobIds = new Set(upcomingInterviews.map((i) => i.jobId));
    const filteredWrittenTests = pendingWrittenTests.filter(
      (j) => !interviewJobIds.has(j.id)
    );

    const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

    return NextResponse.json({
      success: true,
      data: {
        upcomingInterviews: serialize(upcomingInterviews),
        pendingWrittenTests: serialize(filteredWrittenTests),
        now: now.toISOString(),
        in24h: in24h.toISOString(),
      },
    });
  } catch (error) {
    console.error('获取即将到来的任务失败:', error);
    return NextResponse.json(
      { success: false, error: '获取即将到来的任务失败' },
      { status: 500 }
    );
  }
}
