import type { IPublicModelPluginContext, IPublicTypeAssetsJson } from '@alilc/lowcode-types';
import { injectAssets } from '@alilc/lowcode-plugin-inject';
import assets from '../../services/assets.json';
import {
  getPageSchema,
} from '../../services/mockService';
const EditorInitPlugin = (ctx: IPublicModelPluginContext, options: any) => {
  return {
    async init() {
      // 设置物料描述
      const { material, project, config } = ctx;
      const scenarioName = options['scenarioName'];
      const scenarioDisplayName = options['displayName'] || scenarioName;
      const scenarioInfo = options['info'] || {};
      // 保存在 config 中用于引擎范围其他插件使用
      config.set('scenarioName', scenarioName);
      config.set('scenarioDisplayName', scenarioDisplayName);
      config.set('scenarioInfo', scenarioInfo);

      // injectAssets 原样返回传入的 assets（并追加注入的包），运行时就是完整的资产包协议；
      // 其返回类型 InjectAssets 是 Record<string, unknown> 的宽松结构，这里按已知形态收窄。
      await material.setAssets(((await injectAssets(assets)) as unknown) as IPublicTypeAssetsJson);
      const schema = await getPageSchema(scenarioName);

      // 加载 schema
      project.openDocument(schema);
    },
  };
}
EditorInitPlugin.pluginName = 'EditorInitPlugin';
EditorInitPlugin.meta = {
  preferenceDeclaration: {
    title: '保存插件配置',
    properties: [
      {
        key: 'scenarioName',
        type: 'string',
        description: '用于 localstorage 存储 key',
      },
      {
        key: 'displayName',
        type: 'string',
        description: '用于显示的场景名',
      },
      {
        key: 'info',
        type: 'object',
        description: '用于扩展信息',
      }
    ],
  },
};
export default EditorInitPlugin;