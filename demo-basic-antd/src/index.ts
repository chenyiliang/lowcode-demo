// 必须第一行：把 window.AliLowCodeEngine 在任何插件模块求值前挂上
// （components-pane 在模块顶层读它定 isNewEngineVersion；晚了会 editor.get 崩溃白屏）
// 宿主页面全局：iframe 需要的 window.React/ReactDOM/PropTypes/Next/moment/_ 、
// 引擎与主题样式。老配置里这些来自 index.ejs 的 CDN <script> + build.json externals。
import './simulator-env';
import './expose-engine-globals';
import './styles';
import { printBanner } from './banner';
import { init, plugins } from '@alilc/lowcode-engine';
// 画布 iframe 里的物料 UMD 读 window.parent.AliLowCodeEngine（实测 @alifd/layout 的
// view.js 有 `var t = window.parent.AliLowCodeEngine; this.hotkey = t.hotkey`）。
// 官方靠 UMD <script> 挂这个全局；我们改 ESM 打包后 engine 自身不挂，必须在此显式暴露，
// 否则物料拿到 undefined → 'hotkey' TypeError → 画布空白。
import * as AliLowCodeEngineNS from '@alilc/lowcode-engine';
(window as any).AliLowCodeEngine = AliLowCodeEngineNS;
import { createFetchHandler } from '@alilc/lowcode-datasource-fetch-handler'
import EditorInitPlugin from './plugins/plugin-editor-init';
import UndoRedoPlugin from '@alilc/lowcode-plugin-undo-redo';
import ZhEnPlugin from '@alilc/lowcode-plugin-zh-en';
import CodeGenPlugin from '@alilc/lowcode-plugin-code-generator';
import DataSourcePanePlugin from '@alilc/lowcode-plugin-datasource-pane';
import SchemaPlugin from '@alilc/lowcode-plugin-schema';
import CodeEditorPlugin from "@alilc/lowcode-plugin-code-editor";
import ManualPlugin from "@alilc/lowcode-plugin-manual";
import InjectPlugin from '@alilc/lowcode-plugin-inject';
import SimulatorResizerPlugin from '@alilc/lowcode-plugin-simulator-select';
import ComponentPanelPlugin from '@alilc/lowcode-plugin-components-pane';
import DefaultSettersRegistryPlugin from './plugins/plugin-default-setters-registry';
import LoadIncrementalAssetsWidgetPlugin from './plugins/plugin-load-incremental-assets-widget';
import SaveSamplePlugin from './plugins/plugin-save-sample';
import PreviewSamplePlugin from './plugins/plugin-preview-sample';
import CustomSetterSamplePlugin from './plugins/plugin-custom-setter-sample';
import SetRefPropPlugin from '@alilc/lowcode-plugin-set-ref-prop';
import LogoSamplePlugin from './plugins/plugin-logo-sample';

async function registerPlugins() {
  await plugins.register(InjectPlugin);

  await plugins.register(EditorInitPlugin, {
    scenarioName: 'basic-antd',
    displayName: '基础 AntD 组件',
    info: {
      urls: [
        {
          key: '设计器',
          value: 'https://github.com/alibaba/lowcode-demo/tree/main/demo-basic-antd',
        },
        {
          "key": "antd 物料",
          "value": "https://github.com/alibaba/lowcode-materials/tree/main/packages/antd-lowcode-materials"
        }
      ],
    },
  });

  // 设置内置 setter 和事件绑定、插件绑定面板
  await plugins.register(DefaultSettersRegistryPlugin);

  await plugins.register(LogoSamplePlugin);

  await plugins.register(ComponentPanelPlugin);

  await plugins.register(SchemaPlugin);

  await plugins.register(ManualPlugin);
  // 注册回退/前进
  await plugins.register(UndoRedoPlugin);

  // 注册中英文切换
  await plugins.register(ZhEnPlugin);

  await plugins.register(SetRefPropPlugin);

  await plugins.register(SimulatorResizerPlugin);

  await plugins.register(LoadIncrementalAssetsWidgetPlugin);


  // 插件参数声明 & 传递，参考：https://lowcode-engine.cn/site/docs/api/plugins#设置插件参数版本示例
  await plugins.register(DataSourcePanePlugin, {
    importPlugins: [],
    dataSourceTypes: [
      {
        type: 'fetch',
      },
      {
        type: 'jsonp',
      }
    ]
  });

  await plugins.register(CodeEditorPlugin);

  // 注册出码插件
  await plugins.register(CodeGenPlugin, { workerJsUrl: '/standalone-worker.min.js' });

  await plugins.register(SaveSamplePlugin);

  await plugins.register(PreviewSamplePlugin);

  await plugins.register(CustomSetterSamplePlugin);
};

(async function main() {
  printBanner();

  await registerPlugins();

  init(document.getElementById('lce-container')!, {
    // 画布模拟器运行时由本仓库自己打包（见 vite.config.simulator.ts，产物在 public/）。
    // 老配置这里要么不写（靠 engine-core.js 同目录推导），要么指向 alifd CDN 上的远程 npm 包。
    simulatorUrl: ['/react-simulator-renderer.css', '/react-simulator-renderer.js'],
    // locale: 'zh-CN',
    enableCondition: true,
    enableCanvasLock: true,
    // 默认绑定变量
    supportVariableGlobally: true,
    requestHandlersMap: {
      fetch: createFetchHandler()
    },
  });
})();
