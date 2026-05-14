import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const galaxyTarget = env.VITE_GALAXY_PROXY_TARGET || 'https://galaxy-api.galaxydve.com';
  const smartConfigTarget = env.VITE_SMARTCONFIG_PROXY_TARGET || 'https://smartconfig.dvetech.fr';
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      proxy: {
        '/galaxy-proxy': {
          target: galaxyTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/galaxy-proxy/, ''),
        },
        '/smartconfig-proxy': {
          target: smartConfigTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/smartconfig-proxy/, ''),
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
