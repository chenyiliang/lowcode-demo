import {
  IPublicTypeComponentDescription,
  IPublicTypeComponentSchema,
  IPublicTypeRemoteComponentDescription,
} from '@alilc/lowcode-types';
import { buildComponents, AssetLoader } from '@alilc/lowcode-utils';
import ReactRenderer from '@alilc/lowcode-react-renderer';
import { injectComponents } from '@alilc/lowcode-plugin-inject';

import React, { createElement } from 'react';

/** ReactRenderer 需要的两个入参类型，直接从组件/函数签名推导，避免手写 any */
type RendererComponents = React.ComponentProps<typeof ReactRenderer>['components'];
type ComponentsMapArg = Parameters<typeof buildComponents>[1];

/** assets.json 里的大包描述，比 IPublicTypePackage 多一个 renderUrls 字段 */
interface RawAssetPackage {
  package?: string;
  id?: string;
  library?: string;
  urls?: string | string[];
  renderUrls?: string | string[];
  // assets.json 里内联的低代码组件 schema 形态宽松（缺 fileName 等），只在使用处按需断言
  schema?: unknown;
  [key: string]: unknown;
}

/** 远程组件描述里可能携带的组件集合项 */
interface RawComponentItem {
  devMode?: string;
  componentName?: string;
  reference?: { id?: string; [key: string]: unknown };
  npm?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * assets.json 的原始形态。它比 IPublicTypeAssetsJson 宽松（packages 里带 external /
 * 同时有 package 和 id 等），运行时 parseAssets 只用到 packages / components 两个字段，
 * 因此这里按实际 JSON 结构声明，避免和严格协议类型互相打架。
 */
interface RawAssets {
  packages?: RawAssetPackage[];
  components?: RawComponentItem[];
  [key: string]: unknown;
}

function genLowcodeComp(schema: IPublicTypeComponentSchema, components: RendererComponents) {
  return class LowcodeComp extends React.Component<Record<string, unknown>> {
    render(): React.ReactNode {
      return createElement(ReactRenderer, {
        ...this.props,
        schema,
        components,
        designMode: '',
      });
    }
  };
}


export async function parseAssets(assets: RawAssets) {
  const { components: rawComponents, packages } = assets;


  const libraryAsset: Array<string | string[]> = [];
  const libraryMap: Record<string, string> = {};
  const packagesMap: Record<string, RawAssetPackage> = {};
  (packages as RawAssetPackage[] | undefined)?.forEach((pkg) => {
    const { package: _package, library, urls, renderUrls, id } = pkg;
    if (_package) {
      libraryMap[id || _package] = library as string;
    }
    packagesMap[id || (_package as string)] = pkg;
    if (renderUrls) {
      libraryAsset.push(renderUrls);
    } else if (urls) {
      libraryAsset.push(urls);
    }
  });

  const assetLoader = new AssetLoader();
  await assetLoader.load(libraryAsset);

  let newComponents: RawComponentItem[] = (rawComponents as RawComponentItem[] | undefined) ?? [];
  if (rawComponents && rawComponents.length) {
    const componentDescriptions: IPublicTypeComponentDescription[] = [];
    const remoteComponentDescriptions: IPublicTypeRemoteComponentDescription[] = [];
    rawComponents.forEach((component: any) => {
      if (!component) {
        return;
      }
      if (component.exportName && component.url) {
        remoteComponentDescriptions.push(component);
      } else {
        componentDescriptions.push(component);
      }
    });
    newComponents = [...componentDescriptions] as RawComponentItem[];

    // 如果有远程组件描述协议，则自动加载并补充到资产包中，同时出发 designer.incrementalAssetsReady 通知组件面板更新数据
    if (remoteComponentDescriptions && remoteComponentDescriptions.length) {
      await Promise.all(
        remoteComponentDescriptions.map(async (component: any) => {
          const { exportName, url, npm } = component;
          await (new AssetLoader()).load(url);
          function setAssetsComponent(component: any, extraNpmInfo: Record<string, unknown> = {}) {
            const components = component.components;
            if (Array.isArray(components)) {
              components.forEach((d: any) => {
                // 原代码在对象字面量后写了 `|| []`，对象字面量恒为真值，是无效分支，去掉后行为不变
                newComponents = newComponents.concat({
                  npm: {
                    ...npm,
                    ...extraNpmInfo,
                  },
                  ...d,
                });
              });
              return;
            }
            newComponents = newComponents.concat({
              npm: {
                ...npm,
                ...extraNpmInfo,
              },
              ...component.components,
            });
            // assets.componentList = assets.componentList.concat(remoteComponents.componentList || []);
          }
          function setArrayAssets(value: any[], preExportName: string = '', preSubName: string = '') {
            value.forEach((d: any, i: number) => {
              const exportName = [preExportName, i.toString()].filter(d => !!d).join('.');
              const subName = [preSubName, i.toString()].filter(d => !!d).join('.');
              Array.isArray(d) ? setArrayAssets(d, exportName, subName) : setAssetsComponent(d, {
                exportName,
                subName,
              });
            });
          }
          if (window[exportName]) {
            if (Array.isArray(window[exportName])) {
              setArrayAssets(window[exportName] as any);
            } else {
              setAssetsComponent(window[exportName] as any);
            }
          }
          return window[exportName];
        }),
      );
    }
  }
  const lowcodeComponentsArray: RawComponentItem[] = [];
  const proCodeComponentsMap = newComponents.reduce<ComponentsMapArg>((acc, cur) => {
    if ((cur.devMode || '').toLowerCase() === 'lowcode') {
      lowcodeComponentsArray.push(cur);
    } else {
      acc[cur.componentName as string] = {
        ...(cur.reference || cur.npm),
        componentName: cur.componentName,
      } as ComponentsMapArg[string];
    }
    return acc;
  }, {})


  function genLowCodeComponentsMap(components: RendererComponents) {
    const lowcodeComponentsMap: Record<string, unknown> = {};
    lowcodeComponentsArray.forEach((lowcode) => {
      const id = lowcode.reference?.id;
      const schema = (id ? packagesMap[id]?.schema : undefined) as IPublicTypeComponentSchema;
      // lowcodeComponentsMap 边生成边用（互相引用的低代码组件），元素都是 genLowcodeComp 产物，
      // 合并后仍是 ReactRenderer 需要的组件表，这里收窄类型。
      const comp = genLowcodeComp(schema, {
        ...components,
        ...lowcodeComponentsMap,
      } as RendererComponents);
      lowcodeComponentsMap[lowcode.componentName as string] = comp;
    });
    return lowcodeComponentsMap;
  }


  // createComponent 仅在 componentsMap 含低代码 schema 组件时才调用；这里都是 npm 物料，
  // 与上游 injectComponents 约定一致传 () => null。低代码组件在下面单独生成。
  // injectComponents 返回 Record<string, unknown>，运行时装的正是组件，收窄回 ReactRenderer 类型。
  let components = (await injectComponents(
    buildComponents(libraryMap, proCodeComponentsMap, () => null),
  )) as RendererComponents;

  const lowCodeComponents = genLowCodeComponentsMap(components);


  return {
    components: { ...components, ...lowCodeComponents }
  }
}
