-- OfferFlow 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行此脚本

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "salary" TEXT,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'saved',
    "source" TEXT,
    "jdSnapshot" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Interview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "round" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'phone',
    "scheduledAt" TIMESTAMP(3),
    "interviewer" TEXT,
    "feedback" TEXT,
    "result" TEXT NOT NULL DEFAULT 'pending',
    "meetingUrl" TEXT,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Interview_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email");
CREATE INDEX IF NOT EXISTS "Job_userId_idx" ON "Job" ("userId");
CREATE INDEX IF NOT EXISTS "Interview_jobId_idx" ON "Interview" ("jobId");
CREATE INDEX IF NOT EXISTS "Interview_scheduledAt_idx" ON "Interview" ("scheduledAt");

-- Prisma migration tracking table
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "finished_at" TIMESTAMP(3) NOT NULL,
    "migration_name" TEXT NOT NULL,
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "rolled_back_at", "started_at", "applied_steps_count")
VALUES ('init', '00000000000000000000000000000000', CURRENT_TIMESTAMP, 'init', NULL, CURRENT_TIMESTAMP, 1)
ON CONFLICT ("id") DO NOTHING;
