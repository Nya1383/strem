import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

/**
 * electron-vite bundles three targets from a single config:
 *  - main:       Node/Electron main process (CommonJS-friendly output)
 *  - preload:    context-isolated bridge exposed to the renderer
 *  - renderer:   the React app (DOM)
 *
 * HMR is provided for the renderer. The main/preload bundles externalize
 * production dependencies declared in `dependencies` so native deps (ws, etc.)
 * keep working after packaging.
 */
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@main': resolve('src/main')
      }
    },
    build: {
      rollupOptions: {
        input: { index: resolve('src/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    },
    build: {
      rollupOptions: {
        input: { index: resolve('src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@components': resolve('src/renderer/src/components'),
        '@hooks': resolve('src/renderer/src/hooks'),
        '@services': resolve('src/renderer/src/services'),
        '@context': resolve('src/renderer/src/context'),
        '@pages': resolve('src/renderer/src/pages'),
        '@styles': resolve('src/renderer/src/styles')
      }
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: { index: resolve('src/renderer/index.html') }
      }
    },
    server: {
      port: 5173
    }
  },
  test: {
    include: ['tests/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    environment: 'node'
  }
});
