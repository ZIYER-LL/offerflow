import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

// GET /api/jobs/upcoming — 获取当前用户即将到来的面试和笔试
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const cacheKey = session.user.id;

    const getCachedUpcoming = unstable_cache(
      async () => {
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // 1. 获取即将到来的面试（非笔试类型）
        const upcomingInterviews = await prisma.interview.findMany({
          where: {
            result: 'pending',
            scheduledAt: { gte: now },
            type: { not: 'written_test' },
            job: { userId: session.user.id },
          },
          orderBy: { scheduledAt: 'asc' },
          include: {
            job: {
              select: { id: true, title: true, company: true, status: true },
            },
          },
        });

        // 2. 获取即将到来的笔试
        const upcomingTests = await prisma.interview.findMany({
          where: {
            result: 'pending',
            type: 'written_test',
            job: { userId: session.user.id },
            OR: [
              { scheduledAt: { gte: now } },
              { scheduledAt: null },
            ],
          },
          orderBy: { scheduledAt: { sort: 'asc', nulls: 'last' } },
          include: {
            job: {
              select: { id: true, title: true, company: true, status: true },
            },
          },
        });

        const serialize = (data: unknown) => JSON.parse(JSON.stringify(data));

        return {
          upcomingInterviews: serialize(upcomingInterviews),
          upcomingTests: serialize(upcomingTests),
          now: now.toISOString(),
          in24h: in24h.toISOString(),
        };
      },
      ['upcoming', cacheKey],
      { revalidate: 30, tags: ['upcoming'] }
    );

    const data = await getCachedUpcoming();

    const response = NextResponse.json({ success: true, data });
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('获取即将到来的任务失败:', error);
    return NextResponse.json(
      { success: false, error: '获取即将到来的任务失败' },
      { status: 500 }
    );
  }
}
