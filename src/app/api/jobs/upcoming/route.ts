import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/jobs/upcoming — 获取即将到来的面试和待完成的笔试
export async function GET(_req: NextRequest) {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. 获取即将到来的面试（scheduledAt 在未来，且结果未定）
    const upcomingInterviews = await prisma.interview.findMany({
      where: {
        result: 'pending',
        scheduledAt: { gte: now },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        job: {
          select: { id: true, title: true, company: true, status: true },
        },
      },
    });

    // 2. 获取即将到来的笔试（状态为 written_test，且没有面试记录在未来）
    const pendingWrittenTests = await prisma.job.findMany({
      where: {
        status: 'written_test',
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 过滤掉已有未来面试的笔试岗位，避免重复
    const interviewJobIds = new Set(upcomingInterviews.map((i) => i.jobId));
    const filteredWrittenTests = pendingWrittenTests.filter(
      (j) => !interviewJobIds.has(j.id)
    );

    // 序列化日期
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