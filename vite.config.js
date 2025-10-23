import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html',
      output: {
        // 先用占位名，构建后再统一加时间戳
        entryFileNames: `assets/main.[hash].js`,
        chunkFileNames: `assets/chunk.[hash].js`,
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop();
          if (ext === 'css') return 'assets/styles.[hash][extname]';
          return 'assets/[name].[hash][extname]';
        },
      },
    },
  },
});
