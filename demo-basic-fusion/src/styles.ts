// Fusion Next 主题变量 + 带主题变量的 Next 全量样式
// （原先从 alifd.alicdn.com 的 @alifd/theme-lowcode-light@0.2.1 引入，现改走 npm）
import '@alifd/theme-lowcode-light/variables.css';
import '@alifd/theme-lowcode-light/dist/next.var.min.css';

// 引擎与官方扩展的样式
// （原先从 uipaas-assets.com 引 engine-core.css / engine-ext.css，现改走本地 workspace 包产物）
import '@alilc/lowcode-engine/style.css';
import '@alilc/lowcode-engine-ext/style.css';
import '@alilc/lowcode-plugin-components-pane/style.css';
import '@alilc/lowcode-plugin-datasource-pane/style.css';
import '@alilc/lowcode-plugin-code-editor/style.css';
import '@alilc/lowcode-plugin-undo-redo/style.css';
import '@alilc/lowcode-plugin-zh-en/style.css';
import '@alilc/lowcode-plugin-simulator-select/style.css';

// 本 demo 自己的样式
import './global.scss';

export {};
