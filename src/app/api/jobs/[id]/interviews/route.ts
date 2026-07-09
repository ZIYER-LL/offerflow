import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/jobs/[id]/interviews — 获取某岗位的所有面试记录
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const interviews = await prisma.interview.findMany({
      where: { jobId: id },
      orderBy: { round: 'asc' },
    });

    return Response.json({ success: true, data: interviews });
  } catch (err) {
    console.error('Get interviews error:', err);
    return Response.json(
      { success: false, error: '获取面试记录失败' },
      { status: 500 }
    );
  }
}

// POST /api/jobs/[id]/interviews — 新增面试记录
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // 检查岗位是否存在
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return Response.json(
        { success: false, error: '岗位不存在' },
        { status: 404 }
      );
    }

    const interview = await prisma.interview.create({
      data: {
        round: body.round || 1,
        type: body.type || 'phone',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        interviewer: body.interviewer || null,
        feedback: body.feedback || null,
        result: body.result || 'pending',
        meetingUrl: body.meetingUrl || null,
        jobId: id,
      },
    });

    return Response.json({ success: true, data: interview });
  } catch (err) {
    console.error('Create interview error:', err);
    return Response.json(
      { success: false, error: '创建面试记录失败' },
      { status: 500 }
    );
  }
}
