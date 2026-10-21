// @alifd/next 是**真 ESM**（package.json 的 module 指向 es/index.js，62 个具名导出、0 个 default），
// 所以不能写 `import Next from '@alifd/next'` —— rolldown 会直接报
// `[MISSING_EXPORT] "default" is not exported by .../@alifd/next/es/index.js`，构建失败。
// 下面几个（react/react-dom/lodash/moment/prop-types）都是 CJS-only（无 module 字段），
// Vite 会为其合成 default，所以默认导入没问题，且**必须**保持默认导入（见文件末注释）。
import * as NextNamespace from '@alifd/next';
import lodash from 'lodash';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot, hydrateRoot } from 'react-dom/client';
// 展平成普通对象，贴近老 CDN 方案里 UMD 挂到 window.Next 的形态（可写的普通对象），
// 避免物料代码意外写入时撞上 ESM 命名空间对象的 getter-only 属性。
const Next = { ...NextNamespace };

/**
 * 画布 iframe 与物料包依赖的宿主全局。
 *
 * 老 demo 里这些全局由 public/index.ejs 的 CDN <script>（UMD）提供，并在 build.json 里配成
 * externals。改成 npm 依赖打包后，模块作用域的 import 不会自动变成 window 上的全局，
 * 而引擎的 builtin simulator 明确要求它们存在：
 *
 *   window.React = parent.React; window.ReactDOM = parent.ReactDOM;  // designer/builtin-simulator/host.ts
 *   window.PropTypes = parent.PropTypes;                             // 同上
 *   win._ = window._;                                                // designer/builtin-simulator/create-simulator.ts
 *
 * 物料运行时（AssetLoader 注入 iframe 的 view.js）同样按 window.Next / window.moment 取依赖。
 * 缺任何一个，画布都会白屏。
 *
 * 这里一律用「默认导入」（等价于 CJS 的 module.exports，是可写的普通对象），而不是
 * `import * as React`。原因：react-simulator-renderer 在 iframe 里会对 window.React 打补丁
 * （`window.React.cloneElement = ...`，见 renderer-view.tsx）；ESM 命名空间对象的属性是
 * getter-only，在严格模式下赋值会抛 TypeError。默认导入拿到的是 React 的 CJS 导出本体，
 * 与老 CDN 方案挂到 window 上的 UMD 全局形态一致，可正常打补丁。
 */
declare global {
  interface Window {
    React?: unknown;
    ReactDOM?: unknown;
    PropTypes?: unknown;
    Next?: unknown;
    moment?: unknown;
    _?: unknown;
  }
}

window.React = React;
window.ReactDOM = ReactDOM;
// React 19 移除了 UMD，window.ReactDOM（CJS 主入口）上没有 createRoot/hydrateRoot，
// 而画布 iframe 里的 renderer 需要它们。这里从 react-dom/client 补到同一个对象上，
// 保证 iframe 内外共用**同一份** react-dom（否则出现两个 reconciler → React #130）。
(window.ReactDOM as any).createRoot = createRoot;
(window.ReactDOM as any).hydrateRoot = hydrateRoot;
// React 19 移除了 UMD，window.ReactDOM（CJS 主入口）上没有 createRoot/hydrateRoot，
// 而画布 iframe 里的 renderer 需要它们。这里从 react-dom/client 补到同一个对象上，
// 保证 iframe 内外共用**同一份** react-dom（否则出现两个 reconciler → React #130）。
(window.ReactDOM as any).createRoot = createRoot;
(window.ReactDOM as any).hydrateRoot = hydrateRoot;

// React 19 移除了 ReactDOM.findDOMNode，但画布 iframe 里的物料是 React16 时代的 UMD
// （@alifd/layout、fusion-ui、NextTable 等，从 CDN 加载），它们会调 ReactDOM.findDOMNode。
// iframe 的 window.ReactDOM 是真实的 React 19（没有 findDOMNode），于是物料一渲染就
// `findDOMNode is not a function`，画布空白。这里用 fiber 遍历补一个等价实现到全局对象上。
// 与 lowcode-engine 的 @alilc/lowcode-utils findDOMNode 同源思路，但刻意自包含（iframe 全局
// 不能依赖打包产物里的模块）。
(window.ReactDOM as any).findDOMNode = function findDOMNode(instance: any): any {
  if (!instance) return null;
  if (instance.nodeType === 1 || instance.nodeType === 3) return instance; // 已是 DOM
  const isDom = (n: any) => n && (n.nodeType === 1 || n.nodeType === 3);
  // 从实例的 fiber 出发做完整 DFS（child + sibling），返回第一个宿主 DOM 节点。
  // 注意必须递归 sibling：只走 child 链会漏掉「第一个子树没有 DOM、DOM 在兄弟子树里」的情况。
  const walk = (fiber: any): any => {
    let node = fiber;
    while (node) {
      if (isDom(node.stateNode)) return node.stateNode;
      const found = node.child ? walk(node.child) : null;
      if (found) return found;
      node = node.sibling;
    }
    return null;
  };
  return walk(instance._reactInternals || instance._reactInternalFiber);
};

window.PropTypes = PropTypes;
window.Next = Next;
window.moment = moment;
window._ = lodash;

export {};
