import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * 各 demo 共用的 CSS 预处理配置。
 *
 * 抽出来的原因：8 个 demo 需要完全相同的两处兼容处理，复制 8 份必然漂移
 * （迁移过程中已经吃过「同一份配置在 8 个包里各写一遍、结果有的改了有的没改」的亏）。
 * 各 demo 的 vite.config.ts 直接 spread 这里的 `sharedCss` 即可。
 */

const nodeRequire = createRequire(import.meta.url);

/**
 * 处理 scss 里的 webpack 风格 `~` 前缀：
 *   @import '~@alifd/next/lib/core/index-noreset.scss';
 *
 * `~` 是 webpack 的约定（表示「从 node_modules 解析」），Vite 不支持，dart-sass 也不认。
 * 本项目里 plugin-datasource-pane 依赖 @formily/next，而 formily 的 84 个 scss 文件全都用
 * `~` 前缀引 @alifd/next 的样式 —— 老 build-scripts（webpack）时代能解析，迁到 Vite 后
 * 直接 `Can't find stylesheet to import`，一个 demo 能报出 14 个这样的错。
 *
 * 注意：`resolve.alias` 解决不了这个 —— scss 的 @import 走 sass 自己的解析器，不经过 Vite。
 * 必须用 sass 的自定义 importer。
 */
const tildeImporter = {
  findFileUrl(url: string) {
    if (!url.startsWith('~')) return null;
    try {
      return pathToFileURL(nodeRequire.resolve(url.slice(1)));
    } catch {
      return null; // 解析不到就交回默认解析器报错，别静默吞掉
    }
  },
};

export const sharedCss = {
  // @alifd/next 等老组件库的 CSS 里含 IE 时代 hack（如 @media (min-width:0\0)），
  // Vite 8 默认的 lightningcss 压缩器会因此报错；开启 errorRecovery 让它在压缩时跳过这类非法语法。
  lightningcss: {
    errorRecovery: true,
  },
  preprocessorOptions: {
    scss: {
      // webpack 风格 `~` 前缀的兼容（@formily/next 等依赖的 scss 大量使用）
      importers: [tildeImporter],
    },
    less: {
      javascriptEnabled: true, // @alifd/next 的 less 里有 JS 表达式
    },
  },
} as const;

/**
 * 各 demo 共用的 define（编译期常量替换）。demo 的 vite.config.ts 用
 * `define: { ...sharedDefine, __DEMO_VERSION__: JSON.stringify(pkg.version) }` 合入。
 */
export const sharedDefine = {
  // 浏览器里没有 Node 的 `global`。老的 build-scripts/webpack 会自动注入
  // `var global = globalThis` 的 shim，Vite 不会，于是深层传递依赖里访问 `global` 就崩。
  //
  // 实测（Edge 加载 demo-general 的 dist）：引擎初始化早期抛
  //   `ReferenceError: global is not defined`，导致整个编辑器 UI 完全没挂载
  //   （页面 snapshot 只剩 1 个 textbox）。这个错误 `vite build` 和 `tsc` 都抓不到，
  //   只有真实浏览器运行才暴露 —— 所以务必用浏览器验证，别只看构建通过。
  //
  // 元凶是 `typed-array-byte-offset@1.0.5` 第 26 行的 `typeof global[typedArray]`：
  // `typeof` 只保护表达式的求值结果，`global[...]` 会先解引用 `global` 标识符本身，
  // 未定义即抛 ReferenceError（对比：`typeof global` 这种不带下标的才是安全的）。
  // 它经 es-abstract 依赖链被 react-dnd / 其它库间接引入，无法逐个改，
  // 只能在打包层用 define 把裸 `global` 统一替换成浏览器原生的 `globalThis`。
  global: 'globalThis',
} as const;

/**
 * 画布模拟器（vite.config.simulator.ts 产出的 IIFE）专用的 define。
 *
 * 模拟器打成 IIFE 塞进画布 iframe（用 <script src> 加载的经典脚本），iframe 里同样没有
 * Node 的 process / global。实测（Edge）：`react-simulator-renderer.js:47` 抛
 * `ReferenceError: process is not defined`，画布渲染中断。产物里有 151 处 process.env.NODE_ENV
 * 和 10 处裸 process，都必须在编译期替换掉。
 *
 * 与主应用 sharedDefine 的区别：主应用只需 global（Vite 对主应用会处理 process.env.NODE_ENV），
 * 但模拟器的 IIFE 产物里 process.env.NODE_ENV 没被处理干净，需显式 define。
 * 这里同时给 process.env.NODE_ENV / process.env 和裸 process，理由与 code-generator 的
 * worker 配置一致（只给裸 process 时，Vite 对 process.env.NODE_ENV 有保留处理会漏掉）。
 */
export const simulatorDefine = {
  'process.env.NODE_ENV': JSON.stringify('production'),
  'process.env': JSON.stringify({ NODE_ENV: 'production' }),
  process: JSON.stringify({ env: { NODE_ENV: 'production' }, browser: true }),
  global: 'globalThis',
} as const;

/**
 * 画布模拟器 IIFE 的 `require` 垫片（通过 rollupOptions.output.intro 注入到产物最前）。
 *
 * 为什么需要：React 19 没有 UMD 构建，`createRoot` 只在 `react-dom/client` 上，
 * 而 `react-dom/client` 不在 iframe 全局映射里（宿主 host.ts:132 只注入 window.React /
 * window.ReactDOM，没有 client），所以模拟器必须把 react-dom/client **打进 IIFE**。
 * 它内部是 CJS，会 `require("react")` / `require("react-dom")`；rolldown 的 output.globals
 * **不会**改写 __commonJS 包裹内部的 require() 调用，于是浏览器里执行到就抛
 * `ReferenceError: require is not defined`（Edge 实测：react-simulator-renderer.js:3984），
 * 画布渲染中断。
 *
 * 修法：在 IIFE 最前面注入一个 require 函数，把裸模块名映射到宿主已注入 iframe 的全局
 * （host.ts:132 注入 window.React / window.ReactDOM；simulator-env.ts 在父窗口挂
 * window.PropTypes / moment / _ / Next，由物料/iframe 环境提供）。
 * react-dom/client 映射到 ReactDOM（宿主注入的 react-dom 主包）——createRoot 由打进 IIFE 的
 * react-dom/client 自身实现提供，这里的 require("react-dom") 只需返回主包全局供其内部引用。
 *
 * 只映射确定会出现在 iframe 全局里的模块；未知模块抛错（不静默返回 undefined，便于定位）。
 */
export const simulatorRequireIntro = `
var require = (typeof require === 'function') ? require : function (m) {
  var g = {
    'react': window.React,
    'react-dom': window.ReactDOM,
    'prop-types': window.PropTypes,
    'moment': window.moment
  };
  if (m in g) return g[m];
  throw new Error('[simulator] require of unknown module: ' + m);
};
`;
