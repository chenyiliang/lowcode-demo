import { createRoot } from 'react-dom/client';
import './preview-styles';
import React, { useState } from 'react';
import { Loading, Shell, Search, Nav } from '@alifd/next';
import mergeWith from 'lodash/mergeWith';
import isArray from 'lodash/isArray';
import { buildComponents, assetBundle, AssetLevel, AssetLoader } from '@alilc/lowcode-utils';
import ReactRenderer from '@alilc/lowcode-react-renderer';
import { injectComponents } from '@alilc/lowcode-plugin-inject';
import type { IPublicTypeContainerSchema } from '@alilc/lowcode-types';
import appHelper from './appHelper';
import { getProjectSchemaFromLocalStorage, getPackagesFromLocalStorage, getPreviewLocale, setPreviewLocale, getResourceListFromLocalStorage } from './services/mockService';

/** localStorage 里保存的大包描述（结构与 IPublicTypePackage 对齐） */
interface PreviewPackage {
  package?: string;
  library?: string;
  urls?: string | string[];
  renderUrls?: string | string[];
}

/** getResourceListFromLocalStorage 返回的资源项 */
interface PreviewResource {
  id: string;
  title: string;
  slug?: string;
  [key: string]: unknown;
}

type RendererComponents = React.ComponentProps<typeof ReactRenderer>['components'];
type RendererSchema = React.ComponentProps<typeof ReactRenderer>['schema'];

interface PreviewData {
  components?: RendererComponents;
  i18n?: Record<string, unknown>;
  projectDataSource?: Record<string, unknown>;
  resourceList?: PreviewResource[];
}

const getScenarioName = function () {
  if (location.search) {
    return new URLSearchParams(location.search.slice(1)).get('scenarioName') || 'general';
  }
  return 'general';
}

const SamplePreview = () => {
  const [data, setData] = useState<PreviewData>({});

  const [schema, setSchema] = useState<IPublicTypeContainerSchema | undefined>(undefined)

  const [activeNav, setActiveNav] = useState<string | undefined>(undefined)

  const scenarioName = getScenarioName();

  async function init() {
    const resourceList = await getResourceListFromLocalStorage(scenarioName);
    const id = resourceList?.[0].id;
    const packages: PreviewPackage[] = getPackagesFromLocalStorage(scenarioName, id) || [];
    const projectSchema = getProjectSchemaFromLocalStorage(scenarioName, id);
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
    // createComponent 仅在 componentsMap 含低代码 schema 组件时才调用；预览态都是 npm 物料，传 () => null。
    // injectComponents 返回 Record<string, unknown>，运行时装的正是组件，收窄回 ReactRenderer 类型。
    const components = (await injectComponents(
      buildComponents(libraryMap, componentsMap, () => null),
    )) as RendererComponents;

    setSchema(pageSchema);

    console.log('id', id, resourceList);
    setActiveNav(id);

    setData({
      // schema: pageSchema,
      components,
      i18n,
      projectDataSource,
      resourceList,
    });
  }

  const { components, i18n = {}, projectDataSource = {} } = data;

  if (!schema || !components) {
    init();
    return <Loading fullScreen />;
  }
  const currentLocale = getPreviewLocale(getScenarioName());

  if (!(window as any).setPreviewLocale) {
    // for demo use only, can use this in console to switch language for i18n test
    // 在控制台 window.setPreviewLocale('en-US') 或 window.setPreviewLocale('zh-CN') 查看切换效果
    (window as any).setPreviewLocale = (locale: string) => setPreviewLocale(getScenarioName(), locale);
  }

  function customizer(objValue: unknown[], srcValue: unknown[]) {
    if (isArray(objValue)) {
      return objValue.concat(srcValue || []);
    }
  }

  // 合并项目级数据源后作为 ReactRenderer 的 schema。
  // schema 是容器结构（含 dataSource），先按 IPublicTypeContainerSchema 承接合并结果，
  // 再赋给 renderer 的 schema 类型；避免直接对内联字面量做多余属性检查。
  const mergedSchema: IPublicTypeContainerSchema = {
    ...schema,
    dataSource: mergeWith(schema.dataSource, projectDataSource, customizer),
  };
  const rendererSchema: RendererSchema = mergedSchema;

  console.log('activeNav', activeNav);

  return (
    <div className="lowcode-plugin-sample-preview">
      <Shell
        className={"iframe-hack"}
        device="desktop"
        style={{ border: "1px solid #eee" }}
      >
        <Shell.Branding>
          <div className="rectangular"></div>
          <span style={{ marginLeft: 10 }}>App Name</span>
        </Shell.Branding>
        <Shell.Navigation direction="hoz">
          <Search
            key="2"
            shape="simple"
            type="dark"
            // 原来是 palceholder（拼写错误，Next 不认识这个 prop，等于没生效），修正为 placeholder
            placeholder="Search"
            style={{ width: "200px" }}
          />
        </Shell.Navigation>

        <Shell.Navigation>
          <Nav
            embeddable
            aria-label="global navigation"
            defaultSelectedKeys={activeNav ? [activeNav] : []}
          >
            {
              data.resourceList?.map((d) => (
                <Nav.Item
                  key={d.id}
                  onClick={() => {
                    const projectSchema = getProjectSchemaFromLocalStorage(scenarioName, d.id);
                    console.log('setSchema', d.id, projectSchema?.componentsTree[0]);
                    setSchema(projectSchema?.componentsTree[0])
                  }}
                  icon="account"
                >{d.title}</Nav.Item>
              ))
            }
          </Nav>
        </Shell.Navigation>

        <Shell.Content>
          <div style={{ minHeight: 1200, background: "#fff" }}>
          <ReactRenderer
            className="lowcode-plugin-sample-preview-content"
            schema={rendererSchema}
            components={components}
            locale={currentLocale}
            messages={i18n}
            appHelper={appHelper}
          />
          </div>
        </Shell.Content>
      </Shell>
    </div>
  );
};

const container = document.getElementById('ice-container');
if (!container) {
  throw new Error('[preview] 找不到 #ice-container 挂载点');
}
createRoot(container).render(<SamplePreview />);
