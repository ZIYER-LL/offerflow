import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/jobs/[id]/interviews/[interviewId] — 更新面试记录
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const { interviewId } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.round !== undefined) updateData.round = body.round;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.scheduledAt !== undefined) {
      updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }
    if (body.interviewer !== undefined) updateData.interviewer = body.interviewer || null;
    if (body.feedback !== undefined) updateData.feedback = body.feedback || null;
    if (body.result !== undefined) updateData.result = body.result;
    if (body.meetingUrl !== undefined) updateData.meetingUrl = body.meetingUrl || null;

    const interview = await prisma.interview.update({
      where: { id: interviewId },
      data: updateData,
    });

    return Response.json({ success: true, data: interview });
  } catch (err) {
    console.error('Update interview error:', err);
    return Response.json(
      { success: false, error: '更新面试记录失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id]/interviews/[interviewId] — 删除面试记录
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const { interviewId } = await params;

    await prisma.interview.delete({
      where: { id: interviewId },
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('Delete interview error:', err);
    return Response.json(
      { success: false, error: '删除面试记录失败' },
      { status: 500 }
    );
  }
}
