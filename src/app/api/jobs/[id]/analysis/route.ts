import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET /api/jobs/[id]/analysis — 获取岗位 AI 分析
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    // 验证岗位归属
    const job = await prisma.job.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { id: true, jdSnapshot: true },
    });

    if (!job) {
      return NextResponse.json({ success: false, error: '岗位不存在' }, { status: 404 });
    }

    const analysis = await prisma.jobAnalysis.findUnique({
      where: { jobId: params.id },
    });

    // 兼容 SQLite（String 存储）和 PostgreSQL（Json 存储）
    let serializedAnalysis = null;
    if (analysis) {
      let parsedSummary = analysis.summary;
      if (typeof analysis.summary === 'string') {
        try {
          parsedSummary = JSON.parse(analysis.summary);
        } catch {
          parsedSummary = null;
        }
      }
      serializedAnalysis = {
        ...analysis,
        summary: parsedSummary,
        createdAt: analysis.createdAt.toISOString(),
        updatedAt: analysis.updatedAt.toISOString(),
      };
    }

    return NextResponse.json({ success: true, data: serializedAnalysis });
  } catch (error) {
    console.error('获取岗位分析失败:', error);
    return NextResponse.json(
      { success: false, error: '获取岗位分析失败' },
      { status: 500 }
    );
  }
}

// POST /api/jobs/[id]/analysis — 创建或更新岗位 AI 分析
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    // 验证岗位归属
    const job = await prisma.job.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ success: false, error: '岗位不存在' }, { status: 404 });
    }

    const body = await req.json();
    const { category, summary } = body;

    // 兼容 SQLite（String 存储）和 PostgreSQL（Json 存储）
    const summaryData = summary ? JSON.stringify(summary) : null;

    const analysis = await prisma.jobAnalysis.upsert({
      where: { jobId: params.id },
      create: {
        jobId: params.id,
        category: category || null,
        summary: summaryData,
      },
      update: {
        category: category ?? undefined,
        summary: summary !== undefined ? summaryData : undefined,
      },
    });

    // 返回时反序列化
    let parsedSummary = analysis.summary;
    if (typeof analysis.summary === 'string') {
      try {
        parsedSummary = JSON.parse(analysis.summary);
      } catch {
        parsedSummary = null;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        summary: parsedSummary,
        createdAt: analysis.createdAt.toISOString(),
        updatedAt: analysis.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('保存岗位分析失败:', error);
    return NextResponse.json(
      { success: false, error: '保存岗位分析失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id]/analysis — 删除岗位 AI 分析
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const job = await prisma.job.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ success: false, error: '岗位不存在' }, { status: 404 });
    }

    await prisma.jobAnalysis.deleteMany({
      where: { jobId: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除岗位分析失败:', error);
    return NextResponse.json(
      { success: false, error: '删除岗位分析失败' },
      { status: 500 }
    );
  }
}
