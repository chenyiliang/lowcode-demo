import type { IPublicModelPluginContext, IPublicTypeAssetsJson } from '@alilc/lowcode-types';
import { injectAssets } from '@alilc/lowcode-plugin-inject';
import assets from '../../services/assets.json';
import { getProjectSchema } from '../../services/mockService';

const EditorInitPlugin = (ctx: IPublicModelPluginContext) => {
  return {
    async init() {
      const { material, project, config, editorWindow } = ctx;
      const scenarioName = config.get('scenarioName');

      // 设置物料描述
      // injectAssets 原样返回传入的 assets（并追加注入的包），运行时就是完整的资产包协议；
      // 其返回类型 InjectAssets 是 Record<string, unknown> 的宽松结构，这里按已知形态收窄。
      await material.setAssets(((await injectAssets(assets)) as unknown) as IPublicTypeAssetsJson);

      const schema = await getProjectSchema(scenarioName + editorWindow.resource?.options.id);
      // 加载 schema
      project.importSchema(schema as any);
    },
  };
}
EditorInitPlugin.pluginName = 'EditorInitPlugin';
EditorInitPlugin.meta = {};
export default EditorInitPlugin;