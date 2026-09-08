import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile the workspace db package so Next.js can bundle it
  transpilePackages: ['@dental/db'],

  // Server external packages that shouldn't be bundled
  serverExternalPackages: ['postgres', 'bcryptjs'],
};

export default nextConfig;
