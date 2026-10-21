import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { sharedCss, sharedDefine } from '../shared/vite-css.mjs';
import { reactDomShimPlugin } from '../shared/react-dom-shim-plugin.mjs';

const pkgDir = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8')) as { version: string };

/**
 * 应用模式（CONVENTIONS §3.2）：以 html 为入口，不用 lib 模式。
 *
 * 老配置（build.json）把 react / react-dom / prop-types / @alifd/next / moment / lodash /
 * @alilc/lowcode-engine(-ext) 全部配成 externals，由 index.ejs 里的 CDN <script> 提供。
 * 迁移后这些都改成正常 npm 依赖参与打包，index.html 里不再有任何外链脚本。
 *
 * 唯一例外是画布 iframe 的模拟器运行时：引擎用普通 <script src> 往 iframe 里插脚本，
 * 只能是经典脚本（IIFE），因此由 vite.config.simulator.ts 单独产出到 public/。
 */
export default defineConfig({
  plugins: [reactDomShimPlugin(), react()],
  css: sharedCss,
  resolve: {
    alias: {
      // 浏览器 bundle 里 @babel/core 需要真实 path 实现（见 scripts 注释/STATUS）
      path: 'path-browserify',
    },
  },
  define: {
    ...sharedDefine,
    __DEMO_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5556,
    // 引擎持有大量模块级全局单例，热替换会破坏其内部状态（老 build.json 同样是 hot: false）
    hmr: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // 引擎 + Fusion Next 体积较大，抬高阈值避免无意义告警
    chunkSizeWarningLimit: 4096,
    rollupOptions: {
      input: { index: 'index.html', preview: 'preview.html' },
    },
  },
});
