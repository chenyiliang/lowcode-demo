import { IPublicModelPluginContext } from '@alilc/lowcode-types';
import { Button } from '@alifd/next';
import {
  resetSchema,
} from '../../services/mockService';

// 保存功能示例
const ResetPlugin = (ctx: IPublicModelPluginContext, options: { id: string }) => {
  return {
    async init() {
      const { skeleton, config } = ctx;
      const scenarioName = config.get('scenarioName');

      skeleton.add({
        name: 'resetSchema',
        area: 'topArea',
        type: 'Widget',
        props: {
          align: 'right',
        },
        content: (
          // workspace 模式下 localStorage 的 key 需要 scenarioName + 资源 id，
          // 所以这里把当前窗口的 id 和插件上下文一并透传给 resetSchema。
          <Button onClick={() => resetSchema(scenarioName, options.id, ctx)}>
            重置页面
          </Button>
        ),
      });
    },
  };
}
ResetPlugin.pluginName = 'ResetPlugin';
ResetPlugin.meta = {
  dependencies: [],
};
export default ResetPlugin;