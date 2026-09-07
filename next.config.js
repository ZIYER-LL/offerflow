/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // 允许所有开发环境域名访问（包括 TRAE 预览环境）
  allowedDevOrigins: [
    'localhost:3000',
    'localhost:3001',
    '127.0.0.1:3000',
    '0.0.0.0:3000',
  ],
};

module.exports = nextConfig;
