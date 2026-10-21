import { createRoot } from 'react-dom/client';
import './preview-styles';
import React, { useState } from 'react';
import { Loading } from '@alifd/next';
import mergeWith from 'lodash/mergeWith';
import isArray from 'lodash/isArray';
import { buildComponents, assetBundle, AssetLevel, AssetLoader } from '@alilc/lowcode-utils';
import ReactRenderer from '@alilc/lowcode-react-renderer';
import { injectComponents } from '@alilc/lowcode-plugin-inject';
import type { IPublicTypeNodeSchema } from '@alilc/lowcode-types';
import appHelper from './appHelper';
import {
  getProjectSchemaFromLocalStorage,
  getPackagesFromLocalStorage,
  getPreviewLocale,
  setPreviewLocale,
} from './services/mockService';

/** localStorage 里保存的大包描述（结构与 IPublicTypePackage 对齐） */
interface PreviewPackage {
  package?: string;
  library?: string;
  urls?: string | string[];
  renderUrls?: string | string[];
}

type RendererComponents = React.ComponentProps<typeof ReactRenderer>['components'];

interface PreviewData {
  schema?: IPublicTypeNodeSchema;
  components?: RendererComponents;
  i18n?: Record<string, unknown>;
  projectDataSource?: Record<string, unknown>;
}

const getScenarioName = function () {
  if (location.search) {
    return new URLSearchParams(location.search.slice(1)).get('scenarioName') || 'general';
  }
  return 'general';
};

const SamplePreview = () => {
  const [data, setData] = useState<PreviewData>({});

  async function init() {
    const scenarioName = getScenarioName();
    const packages: PreviewPackage[] = getPackagesFromLocalStorage(scenarioName) || [];
    const projectSchema = getProjectSchemaFromLocalStorage(scenarioName);
    const {
      componentsMap: componentsMapArray,
      componentsTree,
      i18n,
      dataSource: projectDataSource,
    } = projectSchema;
    const componentsMap: any = {};
    componentsMapArray.forEach((component: any) => {
      componentsMap[component.componentName] = component;
    });
    const pageSchema = componentsTree[0];

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

    // injectComponents 的使用一般在开发环境做调试注入使用（详细见文档），一般纯净的预览环境是不依赖此插件（即预览渲染态理论上是不需要依赖任何引擎及其相关的插件等资源，PS: 一些 utils 和 types 忽略）
    // The use of injectComponents is generally used for debugging and injection in the development environment (see the documentation for details). The generally destroyed preview environment does not rely on this plug-in.
    // const components = await injectComponents(buildComponents(libraryMap, componentsMap));
    // createComponent 仅在 componentsMap 含低代码 schema 组件时才调用；预览态都是 npm 物料，传 () => null。
    const components = buildComponents(libraryMap, componentsMap, () => null) as RendererComponents;
    setData({
      schema: pageSchema,
      components,
      i18n,
      projectDataSource,
    });
  }

  const { schema, components, i18n = {}, projectDataSource = {} } = data as any;

  if (!schema || !components) {
    init();
    return <Loading fullScreen />;
  }
  const currentLocale = getPreviewLocale(getScenarioName());

  if (!(window as any).setPreviewLocale) {
    // for demo use only, can use this in console to switch language for i18n test
    // 在控制台 window.setPreviewLocale('en-US') 或 window.setPreviewLocale('zh-CN') 查看切换效果
    (window as any).setPreviewLocale = (locale: string) =>
      setPreviewLocale(getScenarioName(), locale);
  }

  function customizer(objValue: [], srcValue: []) {
    if (isArray(objValue)) {
      return objValue.concat(srcValue || []);
    }
  }

  return (
    <div className="lowcode-plugin-sample-preview">
      <ReactRenderer
        className="lowcode-plugin-sample-preview-content"
        schema={{
          ...schema,
          dataSource: mergeWith(schema.dataSource, projectDataSource, customizer),
        }}
        components={components}
        locale={currentLocale}
        messages={i18n}
        appHelper={appHelper}
      />
    </div>
  );
};

const container = document.getElementById('ice-container');
if (!container) {
  throw new Error('[preview] 找不到 #ice-container 挂载点');
}
createRoot(container).render(<SamplePreview />);
