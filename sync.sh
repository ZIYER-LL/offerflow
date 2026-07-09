#!/bin/bash
# OfferFlow 同步脚本
# 用法：在本地终端执行 bash sync.sh
# 功能：从 GitHub 拉取最新代码，安装依赖，同步数据库，启动调试

set -e

echo "=============================="
echo "  OfferFlow 代码同步工具"
echo "=============================="
echo ""

# 1. 检查 Git 仓库
if [ ! -d ".git" ]; then
  echo "[1/4] 初始化 Git 仓库..."
  git init
  git remote add origin https://github.com/ZIYER-LL/offerflow.git
  git fetch origin
  git checkout -b main origin/main
else
  echo "[1/4] 拉取最新代码..."
  git pull origin main
fi

echo ""

# 2. 安装依赖
echo "[2/4] 安装依赖..."
npm install

echo ""

# 3. 同步数据库
echo "[3/4] 同步数据库..."
npx prisma db push

echo ""

# 4. 启动开发服务器
echo "[4/4] 启动开发服务器..."
echo ""
echo "=============================="
echo "  ✅ 同步完成，正在启动..."
echo "  访问 http://localhost:3000"
echo "=============================="
echo ""

npm run dev