import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// POST /api/jobs/batch — 批量操作
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await req.json();
    const { ids, action, status } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { success: false, error: '请至少选择一个岗位' },
        { status: 400 }
      );
    }

    // 确保只能操作自己的岗位
    const userJobs = await prisma.job.findMany({
      where: { id: { in: ids }, userId: session.user.id },
      select: { id: true },
    });
    const userJobIds = userJobs.map((j) => j.id);

    if (userJobIds.length === 0) {
      return Response.json(
        { success: false, error: '没有可操作的岗位' },
        { status: 403 }
      );
    }

    if (action === 'delete') {
      await prisma.job.deleteMany({
        where: { id: { in: userJobIds } },
      });
      return Response.json({ success: true, message: `已删除 ${userJobIds.length} 个岗位` });
    }

    if (action === 'update_status') {
      if (!status) {
        return Response.json(
          { success: false, error: '请指定目标状态' },
          { status: 400 }
        );
      }
      await prisma.job.updateMany({
        where: { id: { in: userJobIds } },
        data: { status },
      });
      return Response.json({ success: true, message: `已更新 ${userJobIds.length} 个岗位状态` });
    }

    return Response.json(
      { success: false, error: '不支持的操作类型' },
      { status: 400 }
    );
  } catch (err) {
    console.error('Batch operation error:', err);
    return Response.json(
      { success: false, error: '批量操作失败' },
      { status: 500 }
    );
  }
}
