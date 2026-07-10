import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

// GET /api/jobs/stats — 获取用户求职数据统计
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const cacheKey = session.user.id;

    const getCachedStats = unstable_cache(
      async () => {
        const userId = session.user.id;

        // 1. 总数和各状态计数
        const totalJobs = await prisma.job.count({
          where: { userId },
        });

        const statusCounts = await prisma.job.groupBy({
          by: ['status'],
          where: { userId },
          _count: { status: true },
        });

        const statusMap: Record<string, number> = {
          saved: 0, applied: 0, written_test: 0, interview: 0,
          offer: 0, rejected: 0, archived: 0,
        };
        for (const sc of statusCounts) {
          statusMap[sc.status] = sc._count.status;
        }

        // 2. 面试和笔试统计
        const totalInterviews = await prisma.interview.count({
          where: {
            job: { userId },
            type: { not: 'written_test' },
          },
        });

        const passedInterviews = await prisma.interview.count({
          where: {
            job: { userId },
            type: { not: 'written_test' },
            result: 'passed',
          },
        });

        const totalTests = await prisma.interview.count({
          where: {
            job: { userId },
            type: 'written_test',
          },
        });

        const passedTests = await prisma.interview.count({
          where: {
            job: { userId },
            type: 'written_test',
            result: 'passed',
          },
        });

        // 3. 即将到来的笔面试
        const now = new Date();
        const upcomingInterviews = await prisma.interview.count({
          where: {
            job: { userId },
            type: { not: 'written_test' },
            result: 'pending',
            scheduledAt: { gte: now },
          },
        });

        const upcomingTests = await prisma.interview.count({
          where: {
            job: { userId },
            type: 'written_test',
            result: 'pending',
            scheduledAt: { gte: now },
          },
        });

        // 4. 投递转化漏斗
        const funnel = {
          saved: statusMap.saved,
          applied: statusMap.applied,
          written_test: statusMap.written_test,
          interview: statusMap.interview,
          offer: statusMap.offer,
        };

        // 转化率
        const appliedRate = totalJobs > 0
          ? Math.round(((statusMap.applied + statusMap.written_test + statusMap.interview + statusMap.offer) / totalJobs) * 100)
          : 0;
        const interviewRate = totalJobs > 0
          ? Math.round(((statusMap.interview + statusMap.offer) / totalJobs) * 100)
          : 0;
        const offerRate = totalJobs > 0
          ? Math.round((statusMap.offer / totalJobs) * 100)
          : 0;

        // 5. 本周/本月新增
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const thisWeekCount = await prisma.job.count({
          where: { userId, createdAt: { gte: startOfWeek } },
        });

        const thisMonthCount = await prisma.job.count({
          where: { userId, createdAt: { gte: startOfMonth } },
        });

        // 6. 近 7 天每日新增
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const dayStart = new Date(now);
          dayStart.setDate(now.getDate() - i);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayStart.getDate() + 1);

          const count = await prisma.job.count({
            where: { userId, createdAt: { gte: dayStart, lt: dayEnd } },
          });

          last7Days.push({
            date: dayStart.toISOString().split('T')[0],
            label: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
            count,
          });
        }

        return {
          overview: {
            totalJobs,
            totalInterviews,
            totalTests,
            upcomingEvents: upcomingInterviews + upcomingTests,
            thisWeekCount,
            thisMonthCount,
          },
          statusCounts: statusMap,
          funnel,
          conversionRates: {
            appliedRate,
            interviewRate,
            offerRate,
          },
          last7Days,
        };
      },
      ['stats', cacheKey],
      { revalidate: 30, tags: ['stats'] }
    );

    const data = await getCachedStats();

    const response = NextResponse.json({ success: true, data });
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
