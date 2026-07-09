import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/jobs/[id] - 获取单个岗位详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const job = await prisma.job.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: '岗位不存在' },
        { status: 404 }
      );
    }

    const serializedJob = {
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: serializedJob });
  } catch (error) {
    console.error('获取岗位详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取岗位详情失败' },
      { status: 500 }
    );
  }
}

// PUT /api/jobs/[id] - 更新岗位
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { title, company, location, salary, url, status, source, jdSnapshot, notes } = body;

    const existing = await prisma.job.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '岗位不存在' },
        { status: 404 }
      );
    }

    if (status) {
      const validStatuses = ['saved', 'applied', 'written_test', 'interview', 'offer', 'rejected', 'archived'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: '无效的岗位状态' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, string | null> = {};
    if (title !== undefined) updateData.title = title;
    if (company !== undefined) updateData.company = company;
    if (location !== undefined) updateData.location = location || null;
    if (salary !== undefined) updateData.salary = salary || null;
    if (url !== undefined) updateData.url = url || null;
    if (status !== undefined) updateData.status = status;
    if (source !== undefined) updateData.source = source || null;
    if (jdSnapshot !== undefined) updateData.jdSnapshot = jdSnapshot || null;
    if (notes !== undefined) updateData.notes = notes || null;

    const job = await prisma.job.update({
      where: { id: params.id },
      data: updateData,
    });

    const serializedJob = {
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: serializedJob });
  } catch (error) {
    console.error('更新岗位失败:', error);
    return NextResponse.json(
      { success: false, error: '更新岗位失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] - 删除岗位
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const existing = await prisma.job.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '岗位不存在' },
        { status: 404 }
      );
    }

    await prisma.job.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: '岗位已删除' });
  } catch (error) {
    console.error('删除岗位失败:', error);
    return NextResponse.json(
      { success: false, error: '删除岗位失败' },
      { status: 500 }
    );
  }
}
