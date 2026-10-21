/**
 * react-dom 的 findDOMNode 垫片 —— 解决 Fusion(@alifd/next) 与 React 19 的硬不兼容。
 *
 * 背景（实测确认）：
 * - React 19 **彻底移除**了 `ReactDOM.findDOMNode`（react-dom@19 的导出里没有它）。
 * - `@alifd/next` 最新就是 1.27.34（**没有更高主版本**，541 个版本全在 1.x），
 *   其 `lib`/`es` 下有 **43 个文件**调用 findDOMNode，例如
 *   `es/overlay/gateway.js:3  import { findDOMNode, createPortal } from 'react-dom'`。
 * - 于是 Fusion 的 Overlay（Dialog / Balloon / Dropdown / Select 弹层等一切浮层）在 React 19 下
 *   `findDOMNode` 为 undefined，一渲染就抛 `TypeError: (0, import_react_dom$3.findDOMNode) is not a function`，
 *   整个低代码编辑器 UI 挂不起来（Edge 实测：页面 snapshot 只剩 1 个 textbox）。
 * - Fusion 无法升级（无兼容 React 19 的版本），React 19 是本次升级的核心目标不能降，
 *   所以唯一出路是补一个 shim。
 *
 * 实现：fiber 树遍历取第一个宿主 DOM 节点，语义等价于旧的 findDOMNode。
 * 与 lowcode-engine 的 `@alilc/lowcode-utils` 里的 findDOMNode 同源思路（那边给引擎自身用，
 * 这里刻意**自包含**、不依赖 workspace 包，避免 demo 打进多份 lowcode-utils）。
 *
 * 接线方式：由 demo 的 vite.config 里 `reactDomShimPlugin()` 把裸 `react-dom` 别名到本文件，
 * 但**排除本文件自身对 react-dom 的 import**（否则会无限递归）。`react-dom/client`、
 * `react-dom/server` 等子路径不被别名，走真实包。
 *
 * 注意：`react-sortable-hoc@1.11.0`（已废弃库，被 datasource-pane 间接依赖）也有同样问题，
 * 这个 shim 一并覆盖它。
 */
import * as React from 'react';
// 这里 import 的是**真实** react-dom：插件对「importer 是本文件」的情况放行，不再别名回本文件。
import * as ReactDOM from 'react-dom';

/** 宿主节点判定：Element 或 Text */
function isDOMNode(node: any): node is Element | Text {
  return (
    !!node &&
    (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE)
  );
}

/** 组件实例 → 其 fiber 节点（React 16/17 用 _reactInternalFiber，18+ 用 _reactInternals） */
function getReactInternalFiber(instance: any): any {
  return instance?._reactInternals || instance?._reactInternalFiber;
}

/** 从 fiber 出发，先向下（child）再向后（sibling）深度遍历，取第一个宿主 DOM 节点 */
function findDOMNodeFromFiber(fiber: any): Element | Text | null {
  let node = fiber;
  while (node) {
    if (node.stateNode && isDOMNode(node.stateNode)) {
      return node.stateNode;
    }
    if (node.child) {
      const found = findDOMNodeFromFiber(node.child);
      if (found) {
        return found;
      }
    }
    node = node.sibling;
  }
  return null;
}

/** React 19 缺失的 findDOMNode 的等价实现 */
export function findDOMNode(
  instance: React.ReactInstance | Element | Text | null | undefined,
): Element | Text | null {
  if (!instance) {
    return null;
  }
  if (isDOMNode(instance)) {
    return instance;
  }
  return findDOMNodeFromFiber(getReactInternalFiber(instance));
}

// 透传真实 react-dom 的具名导出，再补上 findDOMNode 与 React19 移除的旧 API。
//
// 采用「`export *` + 显式惰性具名导出」双轨，两个坑都实测踩过：
// 1) 只用 `export *`：prod（rolldown）OK，但 dev 下 Vite 对 CJS 预打包使 star 无法静态暴露
//    具名导出 → `does not provide an export named 'createPortal'`。
// 2) 只用「求值期拷贝属性」（`export const createPortal = ReactDOM.createPortal`）：
//    shim ↔ react-dom ↔ 消费方循环初始化，求值期读到 undefined → 运行期崩
//    （Edge 实测 `reading 'd'`，堆栈落在 shim chunk 求值期）。
// 双轨解法：`export *` 在 prod 静态补齐全部具名导出；下面这些**显式惰性导出**按 ESM 规范
// 优先级高于 star，dev 下也能拿到，且求值期不触碰 react-dom 任何属性（访问推迟到调用时）。
export * from 'react-dom';
const rd = ReactDOM as any;
export const createPortal = (...args: any[]) => rd.createPortal(...args);
export const flushSync = (...args: any[]) => rd.flushSync(...args);
export const unstable_batchedUpdates = (...args: any[]) => rd.unstable_batchedUpdates(...args);
export const preconnect = (...args: any[]) => rd.preconnect(...args);
export const prefetchDNS = (...args: any[]) => rd.prefetchDNS(...args);
export const preinit = (...args: any[]) => rd.preinit(...args);
export const preinitModule = (...args: any[]) => rd.preinitModule(...args);
export const preload = (...args: any[]) => rd.preload(...args);
export const preloadModule = (...args: any[]) => rd.preloadModule(...args);
export const requestFormReset = (...args: any[]) => rd.requestFormReset(...args);
export const useFormStatus = (...args: any[]) => rd.useFormStatus(...args);
export const useFormState = (...args: any[]) => rd.useFormState(...args);
// version 是值导出，无法惰性化；求值期读 rd.version 会踩上面的循环初始化。
// 用常量，与根 pnpm-workspace.yaml 的 react override 版本对齐（升级 react 时同步改这里）。
export const version = '19.3.1';
// findDOMNode 已在文件上方以 `export function findDOMNode` 声明，这里不再重复导出。

// ---- React 19 移除的旧 API 的兼容垫片 ----
// 打进 bundle 的第三方 CJS 依赖（Fusion @alifd/next、@alifd/overlay、react-transition-group 等）
// 会 `require("react-dom")` 并解构 findDOMNode / render / unmountComponentAtNode（React 19 已移除）。
// shim 是整棵依赖图的 react-dom，缺了这些具名导出会在 build 期报 MISSING_EXPORT、运行期报 undefined。
//
// render / unmountComponentAtNode 的桥接写法参考 D:\Projects\alibaba-fusion-study\admin 的
// build/fusion-react19-compat.mjs（用户指点的 Fusion+React19 兼容方案）：
// 用 createRoot + flushSync 恢复旧版「同步渲染 + 第三个回调参数」语义 ——
// Fusion 的 Dialog.show / Message.notice 依赖回调时机读取 ref，异步渲染会读不到。
const rootRegistry = new WeakMap<Element, { unmount(): void }>();

export function render(element: any, container: Element | null, callback?: () => void): any {
  if (!container) return null;
  let root = rootRegistry.get(container);
  if (!root) {
    const cr = (rd as any).createRoot || (typeof window !== 'undefined' && (window as any).ReactDOM && (window as any).ReactDOM.createRoot);
    if (!cr) throw new Error('[react-dom-shim] createRoot unavailable');
    root = cr(container);
    rootRegistry.set(container, root);
  }
  (ReactDOM as any).flushSync(() => {
    (root as any).render(element);
  });
  if (typeof callback === 'function') callback();
  return null;
}

export function unmountComponentAtNode(container: Element | null): boolean {
  if (!container) return false;
  const root = rootRegistry.get(container);
  if (!root) return false;
  (ReactDOM as any).flushSync(() => {
    root.unmount();
  });
  rootRegistry.delete(container);
  return true;
}

export function hydrate(element: any, container: Element | null): void {
  if (!container) return;
  const hr = (rd as any).hydrateRoot || (typeof window !== 'undefined' && (window as any).ReactDOM && (window as any).ReactDOM.hydrateRoot);
  if (!hr) throw new Error('[react-dom-shim] hydrateRoot unavailable');
  const root = hr(container, element);
  rootRegistry.set(container, root);
}

// 老代码常写 `import ReactDOM from 'react-dom'` 再 `ReactDOM.findDOMNode(...)`。
// react-dom 19 是纯具名导出（无 default），这里补一个 default。
// **不能用 `{ ...ReactDOM, findDOMNode }`**：展开在模块求值期读取全部属性，
// 同样踩循环初始化（拿到 undefined）。用 Proxy 把属性访问推迟到使用时。
// 注意 get 必须**先查 target 自身属性**：simulator-env 会往 window.ReactDOM（即本 default）
// 上补 `createRoot`/`hydrateRoot`/`findDOMNode`（React 19 的 CJS 主入口没有它们）。
// 若 get 一律转发到真实 react-dom，这些补丁会被吞掉，iframe 里 renderer 调
// `react_dom_client.createRoot` 就报 "is not a function"（Edge 实测）。
// 默认导出（老代码 `import ReactDOM from 'react-dom'` 再 `ReactDOM.render(...)`）：
// 必须**优先返回 shim 自己补回的旧 API**（render / unmountComponentAtNode / findDOMNode /
// hydrate），因为真实 react-dom 19 没有它们 —— 之前只转发到 rd，导致
// `react_dom_shim_default.render is not a function`（Fusion Dialog/Message 走 default.render，
// Edge 实测 T6 出码点击即崩）。其余属性再依次查 target（simulator-env 补的 createRoot 等）与 rd。
export default new Proxy({} as any, {
  get(target, prop) {
    if (prop === 'render') return render;
    if (prop === 'unmountComponentAtNode') return unmountComponentAtNode;
    if (prop === 'findDOMNode') return findDOMNode;
    if (prop === 'hydrate') return hydrate;
    if (prop in target) return (target as any)[prop];
    return (rd as any)[prop];
  },
  set(target, prop, value) {
    (target as any)[prop] = value;
    return true;
  },
  has(target, prop) {
    return (
      ['render', 'unmountComponentAtNode', 'findDOMNode', 'hydrate'].includes(prop as string) ||
      prop in target ||
      prop in rd
    );
  },
});
