import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET /api/jobs/analytics?period=week|month — 获取求职转化分析数据
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') === 'month' ? 'month' : 'week';

    // 一次性获取用户所有岗位，在内存中分组
    const jobs = await prisma.job.findMany({
      where: { userId },
      select: { id: true, status: true, createdAt: true, company: true, source: true },
      orderBy: { createdAt: 'asc' },
    });

    // 1. 总体状态计数
    const statusCounts: Record<string, number> = {
      saved: 0, applied: 0, written_test: 0, interview: 0, offer: 0, rejected: 0, archived: 0,
    };
    for (const job of jobs) {
      if (statusCounts[job.status] !== undefined) {
        statusCounts[job.status]++;
      }
    }

    // 2. 漏斗（累计口径）
    // 投递数 = applied + written_test + interview + offer
    // 笔试数 = written_test + interview + offer
    // 面试数 = interview + offer
    // Offer数 = offer
    const funnel = {
      applied: statusCounts.applied + statusCounts.written_test + statusCounts.interview + statusCounts.offer,
      written_test: statusCounts.written_test + statusCounts.interview + statusCounts.offer,
      interview: statusCounts.interview + statusCounts.offer,
      offer: statusCounts.offer,
    };

    // 3. 时间序列（按周或按月）
    const now = new Date();
    const timeSeries: Array<{
      label: string;
      applied: number;
      written_test: number;
      interview: number;
      offer: number;
      total: number;
    }> = [];

    const countByStatus = (periodJobs: typeof jobs) => {
      const counts = { applied: 0, written_test: 0, interview: 0, offer: 0 };
      for (const job of periodJobs) {
        const s = job.status;
        if (s === 'applied' || s === 'written_test' || s === 'interview' || s === 'offer') counts.applied++;
        if (s === 'written_test' || s === 'interview' || s === 'offer') counts.written_test++;
        if (s === 'interview' || s === 'offer') counts.interview++;
        if (s === 'offer') counts.offer++;
      }
      return counts;
    };

    if (period === 'week') {
      // 近 8 周
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() - i * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const periodJobs = jobs.filter(j => j.createdAt >= weekStart && j.createdAt < weekEnd);
        const counts = countByStatus(periodJobs);

        timeSeries.push({
          label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
          ...counts,
          total: periodJobs.length,
        });
      }
    } else {
      // 近 6 个月
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const periodJobs = jobs.filter(j => j.createdAt >= monthStart && j.createdAt < monthEnd);
        const counts = countByStatus(periodJobs);

        timeSeries.push({
          label: `${monthStart.getMonth() + 1}月`,
          ...counts,
          total: periodJobs.length,
        });
      }
    }

    // 4. 转化率
    const conversionRates = {
      appliedRate: funnel.applied > 0 ? Math.round((funnel.written_test / funnel.applied) * 100) : 0,
      testRate: funnel.written_test > 0 ? Math.round((funnel.interview / funnel.written_test) * 100) : 0,
      interviewRate: funnel.interview > 0 ? Math.round((funnel.offer / funnel.interview) * 100) : 0,
      overallRate: funnel.applied > 0 ? Math.round((funnel.offer / funnel.applied) * 100) : 0,
    };

    // 5. 状态分布（饼图）
    const statusDistribution = [
      { name: '待投递', value: statusCounts.saved },
      { name: '已投递', value: statusCounts.applied },
      { name: '笔试', value: statusCounts.written_test },
      { name: '面试', value: statusCounts.interview },
      { name: 'Offer', value: statusCounts.offer },
      { name: '已拒绝', value: statusCounts.rejected },
      { name: '已归档', value: statusCounts.archived },
    ].filter(s => s.value > 0);

    // 6. 按公司统计（Top 10）
    const companyMap: Record<string, number> = {};
    for (const job of jobs) {
      const company = job.company || '未知公司';
      companyMap[company] = (companyMap[company] || 0) + 1;
    }
    const topCompanies = Object.entries(companyMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // 7. 按来源平台统计
    const sourceMap: Record<string, number> = {};
    for (const job of jobs) {
      const source = job.source || '手动添加';
      sourceMap[source] = (sourceMap[source] || 0) + 1;
    }
    const sourceStats = Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      success: true,
      data: {
        funnel,
        timeSeries,
        conversionRates,
        statusDistribution,
        statusCounts,
        totalJobs: jobs.length,
        topCompanies,
        sourceStats,
      },
    });
  } catch (error) {
    console.error('获取分析数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分析数据失败' },
      { status: 500 }
    );
  }
}
