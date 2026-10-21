import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import { simulatorDefine, simulatorRequireIntro } from '../shared/vite-css.mjs';

const pkgDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * 画布 iframe 的模拟器运行时。
 *
 * 引擎（@alilc/lowcode-designer 的 BuiltinSimulatorHost）通过 AssetLoader 往 iframe 里
 * 插普通 <script src>，只能加载经典脚本，所以这里把本地 workspace 包
 * @alilc/lowcode-react-simulator-renderer 打成 IIFE 输出到 public/，
 * 主应用以 /react-simulator-renderer.js 提供（init 时通过 simulatorUrl 指定）。
 *
 * 这就是「不依赖远程 npm 组件、改成依赖本项目对应组件」的落地：
 * 老配置指向 https://alifd.alicdn.com/npm/@alilc/lowcode-react-simulator-renderer@1.1.1/dist/js/...
 *
 * external 采用「精确匹配」，与老 build.json 里 webpack externals 的语义一致：
 * 只有裸包名本身 external 到宿主 window 上的全局（react -> React 等），
 * 子路径（react-dom/client、@alifd/next/lib/config-provider、react/jsx-runtime ...）
 * 一律打进产物。原因：iframe 里 react/react-dom 等全局是宿主页面通过
 * `window.X = parent.X` 注入的同一份实例，物料（UMD）也读这些全局；
 *
 * **react-dom/client 是唯一的例外，也 external 到 ReactDOM 全局**：
 * React 19 移除了 UMD 构建，createRoot/hydrateRoot 只在 react-dom/client 上。
 * 若把 react-dom/client 打进 IIFE，产物里就会出现第二份 react-dom，
 * 与物料/renderer 用的 window.ReactDOM 形成两个 reconciler → React #130、画布空白（实测）。
 * 解法：simulator-env.ts 把 createRoot/hydrateRoot 从 react-dom/client 补到 window.ReactDOM 上，
 * 于是这里可安全映射 —— 全局只有一个 react-dom 实例且带 createRoot。
 */
const IFRAME_GLOBALS: Record<string, string> = {
  react: 'React',
  'react-dom': 'ReactDOM',
  // React 19 的 createRoot 只在 /client 上；把它也映射到同一个 ReactDOM 全局
  // （simulator-env 已把 createRoot/hydrateRoot 补到 window.ReactDOM 上），
  // 避免 IIFE 里再打包第二份 react-dom 造成双 reconciler（React #130）。
  'react-dom/client': 'ReactDOM',
  'prop-types': 'PropTypes',
  '@alifd/next': 'Next',
  moment: 'moment',
  lodash: '_',
};

function iframeGlobal(id: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(IFRAME_GLOBALS, id)
    ? IFRAME_GLOBALS[id]
    : undefined;
}

export default defineConfig({
  // 画布 iframe 里没有 Node 的 process/global，IIFE 产物需在编译期替换掉这些标识符。
  // 实测（Edge）不 define 会在 react-simulator-renderer.js 抛 `process is not defined`，画布渲染中断。
  define: simulatorDefine,

  // 产物直接写进 public/，不能再把它当 publicDir 扫描
  publicDir: false,
  build: {
    outDir: path.join(pkgDir, 'public'),
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    lib: {
      entry: path.join(pkgDir, 'src', 'simulator.ts'),
      formats: ['iife'],
      name: '___ReactSimulatorRenderer___',
      fileName: () => 'react-simulator-renderer.js',
      cssFileName: 'react-simulator-renderer',
    },
    rollupOptions: {
      external: (id: string) => iframeGlobal(id) !== undefined,
      output: {
        globals: ((id: string) => iframeGlobal(id)) as unknown as Record<string, string>,
        // React 19 无 UMD 构建，react-dom/client 被打进 IIFE，其内部 CJS 的 require("react")
        // 不会被 rolldown 的 globals 改写 → 浏览器里 require is not defined。注入 require 垫片映射到 iframe 全局。
        intro: simulatorRequireIntro,
      },
    },
  },
});
