import { createRoot } from 'react-dom/client';
import './preview-styles';
import React, { useState } from 'react';
import { Loading } from '@alifd/next';
import { buildComponents, assetBundle, AssetLevel, AssetLoader } from '@alilc/lowcode-utils';
import ReactRenderer from '@alilc/lowcode-react-renderer';
import { injectComponents } from '@alilc/lowcode-plugin-inject';
import { createFetchHandler } from '@alilc/lowcode-datasource-fetch-handler'
import type { IPublicTypeNodeSchema } from '@alilc/lowcode-types';

import { getProjectSchemaFromLocalStorage, getPackagesFromLocalStorage } from './services/mockService';

/** localStorage 里保存的大包描述（saveSchema 时写入，结构与 IPublicTypePackage 对齐） */
interface PreviewPackage {
  package?: string;
  library?: string;
  urls?: string | string[];
  renderUrls?: string | string[];
}

/**
 * ReactRenderer 的 components prop 类型（Record<string, IGeneralComponent>）。
 * 用 ComponentProps 从组件本身推导，避免手写 any。
 */
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
}

const SamplePreview = () => {
  const [data, setData] = useState<PreviewData>({});

  async function init() {
    const scenarioName = getScenarioName();
    const packages: PreviewPackage[] = getPackagesFromLocalStorage(scenarioName) || [];
    const projectSchema = getProjectSchemaFromLocalStorage(scenarioName);
    const { componentsMap: componentsMapArray, componentsTree } = projectSchema;
    const componentsMap: any = {};
    componentsMapArray.forEach((component: any) => {
      componentsMap[component.componentName] = component;
    });
    const schema = componentsTree[0];

    const libraryMap: Record<string, string> = {};
    const libraryAsset: Array<string | string[]> = [];
    packages.forEach(({ package: _package, library, urls, renderUrls }) => {
      if (_package && library) {
        libraryMap[_package] = library;
      }
      if (renderUrls) {
        libraryAsset.push(renderUrls);
      } else if (urls) {
        libraryAsset.push(urls);
      }
    });

    const vendors = [assetBundle(libraryAsset, AssetLevel.Library)];

    // TODO asset may cause pollution
    const assetLoader = new AssetLoader();
    await assetLoader.load(libraryAsset);
    // createComponent 仅在 componentsMap 含「低代码 schema 组件」时才会被调用；
    // 预览态这里都是 npm 物料（走 libraryMap 解析），与上游 injectComponents 的约定一致传 () => null。
    // injectComponents 的返回类型是 Record<string, unknown>（上游把具体组件类型擦掉了），
    // 运行时它装的正是 buildComponents 产出的组件，这里收窄回 ReactRenderer 需要的类型。
    const components = (await injectComponents(
      buildComponents(libraryMap, componentsMap, () => null),
    )) as RendererComponents;

    setData({
      schema,
      components,
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
            fetch: createFetchHandler()
          }
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
