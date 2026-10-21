// Fusion Next 主题变量 + 带主题变量的 Next 全量样式
// （原先从 alifd.alicdn.com 的 @alifd/theme-lowcode-light@0.2.1 引入，现改走 npm）
import '@alifd/theme-lowcode-light/variables.css';
import '@alifd/theme-lowcode-light/dist/next.var.min.css';

// 引擎样式（本 demo 未使用 lowcode-engine-ext，故不引入其样式）
// （原先从 uipaas-assets.com 引 engine-core.css，现改走本地 workspace 包产物）
import '@alilc/lowcode-engine/style.css';
import '@alilc/lce-graph-tools/style.css';
import '@alilc/lce-graph-x6-designer/style.css';
import '@alilc/lce-graph-materials-pane/style.css';

// 本 demo 自己的样式
import './global.scss';

export {};
