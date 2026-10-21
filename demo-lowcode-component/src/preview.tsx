import { createRoot } from 'react-dom/client';
import './preview-styles';
import React, { useState } from 'react';
import { Loading } from '@alifd/next';
import ReactRenderer from '@alilc/lowcode-react-renderer';
import { createFetchHandler } from '@alilc/lowcode-datasource-fetch-handler';
import type { IPublicTypeNodeSchema } from '@alilc/lowcode-types';
import {
  getProjectSchemaFromLocalStorage,
} from './services/mockService';
import assets from './services/assets.json';
import { parseAssets } from './parse-assets';

type RendererComponents = React.ComponentProps<typeof ReactRenderer>['components'];

interface PreviewData {
  schema?: IPublicTypeNodeSchema;
  components?: RendererComponents;
}

const getScenarioName = function () {
  if (location.search) {
    return new URLSearchParams(location.search.slice(1)).get('scenarioName') || 'index';
  }
  return 'index';
};

const SamplePreview = () => {
  const [data, setData] = useState<PreviewData>({});

  async function init() {
    const scenarioName = getScenarioName();
    const projectSchema = getProjectSchemaFromLocalStorage(scenarioName);
    const { componentsMap: componentsMapArray, componentsTree } = projectSchema;
    const schema = componentsTree[0];
    const componentsMap: any = {};
    componentsMapArray.forEach((component: any) => {
      componentsMap[component.componentName] = component;
    });

    const { components } = await parseAssets(assets);

    setData({
      schema,
      // parseAssets 返回的组件表是 Record<string, unknown>，收窄回 ReactRenderer 需要的类型
      components: components as RendererComponents,
    });
  }

  const { schema, components } = data;

  if (!schema || !components) {
    init();
    return <Loading fullScreen />;
  }

  return (
    <div className="lowcode-plugin-sample-preview">
      <ReactRenderer
        className="lowcode-plugin-sample-preview-content"
        schema={schema}
        components={components}
        appHelper={{
          requestHandlersMap: {
            fetch: createFetchHandler(),
          },
        }}
      />
    </div>
  );
};

const container = document.getElementById('ice-container');
if (!container) {
  throw new Error('[preview] 找不到 #ice-container 挂载点');
}
createRoot(container).render(<SamplePreview />);
