// 画布 iframe 的入口：把本地 workspace 包 @alilc/lowcode-react-simulator-renderer
// 打成 IIFE 供引擎用普通 <script src> 加载（见 vite.config.simulator.ts）。
// 该包入口自带副作用：挂 window.SimulatorRenderer。
//
// 样式单独 import：该包的 .mjs 产物已把 renderer.less 抽到自己的 dist/index.css，
// 不会随 JS 一起打进来，所以这里显式引入，让 IIFE 构建同时产出
// public/react-simulator-renderer.css（init 的 simulatorUrl 引用了它）。
import '@alilc/lowcode-react-simulator-renderer/style.css';
import '@alilc/lowcode-react-simulator-renderer';

