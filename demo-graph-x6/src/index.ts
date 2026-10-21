// 宿主页面全局：iframe 需要的 window.React/ReactDOM/PropTypes/Next/moment/_ 、
// 引擎与主题样式。老配置里这些来自 index.ejs 的 CDN <script> + build.json externals。
import './simulator-env';
// 必须在引擎初始化前把 window.AliLowCodeEngine 挂上：画布 iframe 里的物料读 window.parent.AliLowCodeEngine
import './expose-engine-globals';
import './styles';
import { printBanner } from './banner';
import { plugins, init } from '@alilc/lowcode-engine';
import PluginX6Designer from '@alilc/lce-graph-x6-designer';
import PluginMaterialsPane from '@alilc/lce-graph-materials-pane';
import PluginCore from '@alilc/lce-graph-core';
import { RemoveItemPlugin, OperateButtonPlugin, UndoRedoPlugin, ZoomPlugin, logo } from '@alilc/lce-graph-tools';
import PluginX6DesignerExtension from './plugins/x6-designer-extension';
import assets from './services/assets.json';
import schema from './services/schema.json';
import { resetSchema, saveSchema } from './services/mockService';

(async function main() {
  printBanner();

  await plugins.register(PluginCore, {
    assets,
    schema
  });
  await plugins.register(PluginX6Designer);
  await plugins.register(PluginMaterialsPane);
  await plugins.register(PluginX6DesignerExtension);
  await plugins.register(logo);
  await plugins.register(RemoveItemPlugin);
  await plugins.register(OperateButtonPlugin, [
    {
      callback: (schema: any) => {
        saveSchema('local');
      },
      name: 'save',
      text: '保存',
      hotkey: 'command+s',
    },
    {
      callback: (schema: any) => {
        console.log('发布回调', schema)
      },
      name: 'publish',
      text: '发布',
      hotkey: 'command+p',
    },
    {
      callback: (schema: any) => {
        console.log('自定义操作按钮回调', schema)
      },
      name: 'test',
      text: '测试自定义按钮',
      hotkey: 'command+0',
      btnProps: { type: 'secondary' },
    },
    {
      callback: () => {
        resetSchema('test');
      },
      name: 'reset',
      text: '重置'
    },
  ]);
  await plugins.register(UndoRedoPlugin);
  await plugins.register(ZoomPlugin);
  init(undefined, {
    // 画布模拟器运行时由本仓库自己打包（见 vite.config.simulator.ts，产物在 public/）。
    // 老配置这里要么不写（靠 engine-core.js 同目录推导），要么指向 alifd CDN 上的远程 npm 包。
    simulatorUrl: ['/react-simulator-renderer.css', '/react-simulator-renderer.js'],
  });


})();
