/**
 * 把引擎暴露成 window.AliLowCodeEngine，且必须在所有插件模块求值之前执行。
 *
 * 为什么顺序关键（Edge 实测）：components-pane 在模块顶层读
 * `const { material } = window.AliLowCodeEngine || {}` 并据此定 isNewEngineVersion。
 * ESM import 提升：若赋值写在 index.ts 模块体里，会晚于插件模块求值 → pane 读到 undefined
 * → componentDidMount 走 editor.get('assets') → `e.get is not a function` → shell 白屏。
 * 官方靠 UMD <script> 先设全局；我们改 ESM 后用「第一个 import」恢复该顺序。
 * 画布 iframe 物料也读 window.parent.AliLowCodeEngine，同样依赖它。
 *
 * 放在 src/ 内（而非 shared/）：shared/ 没有 node_modules，解析不到 @alilc/lowcode-engine。
 */

// 浏览器全局 process 兜底（必须在任何 babel/path 代码执行前）：
// @babel/core@7 的 browser field 不完整，index-shared.js 等仍读裸 process；
// Vite define 是编译期替换，覆盖不到预构建后引入的模块，故运行时兜底。
if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: { NODE_ENV: 'production' },
    browser: true,
    version: '',
    versions: {},
    platform: 'browser',
    // @babel/core@7 的 config 解析会调 cwd()；给稳定值避免 undefined 崩溃
    cwd: () => '/',
    nextTick: (fn: any, ...args: any[]) => setTimeout(() => fn(...args), 0),
    argv: [],
  };
}

import * as AliLowCodeEngine from '@alilc/lowcode-engine';

(window as any).AliLowCodeEngine = AliLowCodeEngine;

export {};
