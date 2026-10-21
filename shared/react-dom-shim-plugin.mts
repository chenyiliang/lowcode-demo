import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 垫片实现文件（含 React 19 缺失的 findDOMNode 的 fiber 版等价实现）
const SHIM_PATH = path.resolve(__dirname, 'react-dom-shim.ts');

/**
 * 把裸 `react-dom` 别名到本目录的 findDOMNode 垫片。
 *
 * 为什么需要：React 19 移除了 `ReactDOM.findDOMNode`，而 Fusion `@alifd/next`
 * 最新只有 1.x（无兼容 React 19 的版本），其 43 个 lib 文件仍 `import { findDOMNode } from 'react-dom'`。
 * 结果 Fusion 的一切浮层（Overlay/Dialog/Balloon/Select 弹层）在 React 19 下渲染即崩，
 * 整个低代码编辑器 UI 挂不起来（Edge 实测 snapshot 只剩 1 个 textbox）。
 * Fusion 不能升级、React 19 不能降级，只能垫片。详见 react-dom-shim.ts 顶部注释。
 *
 * @param resolveFrom 解析真实 react-dom 绝对路径的基准目录。默认 process.cwd()，
 *   即执行 `vite build` 的 demo 目录（它 node_modules 里有 react-dom）。
 *   为什么必须显式解析：垫片文件在 `shared/`，该目录没有 node_modules，
 *   按 node 规则从 shared/ 往上找不到 react-dom，直接让垫片 `import 'react-dom'`
 *   会报 `Rolldown failed to resolve import "react-dom"`（实测踩过）。
 *
 * 实现要点（用 resolveId 而非 resolve.alias，为精确控制递归边界）：
 * - 只拦**裸** `react-dom`；`react-dom/client`、`react-dom/server` 等子路径**放行**给真实包
 *   （React 19 的 createRoot 在 /client 上，不能被垫片劫持）。
 * - **垫片文件自身**对 `react-dom` 的 import → 解析到真实 react-dom 绝对路径（否则无限递归）。
 *   垫片的 `import * as ReactDOM from 'react-dom'` / `export * from 'react-dom'` 因此指向真实包，
 *   垫片再在其之上补 findDOMNode。
 * - 其它一切对裸 `react-dom` 的 import → 解析到垫片。
 * - `enforce: 'pre'`：在 Vite 内置 resolve 之前拦截。
 */
export function reactDomShimPlugin(resolveFrom: string = process.cwd()): Plugin {
  const norm = (p: string) => p.replace(/\\/g, '/');
  const SHIM_NORM = norm(SHIM_PATH);

  // 懒解析真实 react-dom / react-dom/client 绝对路径（build 启动时 resolveFrom 目录已就位）
  let realReactDom: string | undefined;
  let realReactDomClient: string | undefined;
  const getRealReactDom = () => {
    if (!realReactDom) {
      const req = createRequire(path.join(resolveFrom, 'noop.js'));
      realReactDom = req.resolve('react-dom');
    }
    return realReactDom;
  };
  const getRealReactDomClient = () => {
    if (!realReactDomClient) {
      const req = createRequire(path.join(resolveFrom, 'noop.js'));
      realReactDomClient = req.resolve('react-dom/client');
    }
    return realReactDomClient;
  };

  return {
    name: 'lowcode-demo:react-dom-finddomnode-shim',
    enforce: 'pre',
    resolveId(source, importer) {
      // 垫片自身（在 shared/ 目录，没有 node_modules）对 react-dom 与 react-dom/client 的
      // import 都要解析到**真实**包，否则 rolldown 报 failed to resolve（shared/ 无法向上解析）。
      if (importer && norm(importer) === SHIM_NORM) {
        if (source === 'react-dom') return getRealReactDom();        // 断递归：垫片→真实
        return null;
      }
      if (source !== 'react-dom') return null;              // 子路径与其它模块一律放行
      return SHIM_PATH;                                      // 其它 → 垫片
    },
  };
}

