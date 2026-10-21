import * as React from 'react';
import BehaviorSetter from '@alilc/lowcode-setter-behavior';
import type { IPublicModelSettingField } from '@alilc/lowcode-types';

/**
 * `@alilc/lowcode-setter-behavior` 自身没有导出 props 类型
 * （它的 .d.ts 只把组件标成 CustomView，且引用了一个已改名的类型），
 * 所以下面按该 setter 运行时的真实入参声明契约，避免到处 any。
 */
interface BehaviorAction {
  /** 行为类型标识，与 setting 里选择的 type 对应 */
  name: string;
  [key: string]: unknown;
}

/** Algolia HN 搜索接口的响应结构（url 指向 hn.algolia.com/api/v1/search） */
interface AlgoliaHit {
  title: string;
  author: string;
}

interface AlgoliaSearchResponse {
  hits: AlgoliaHit[];
}

interface BehaviorOption {
  label: string;
  value: string;
}

interface LocalBehaviorSetterProps {
  /** 被 setter 忽略的两个入参：这里强制使用 demo 自己的默认值 */
  url?: string;
  responseFormatter?: (response: AlgoliaSearchResponse) => BehaviorOption[];
  /** 额外行为，会与 demo 默认的合并后传给 BehaviorSetter */
  extraBehaviorActions?: BehaviorAction[];
  /** 其余透传给 BehaviorSetter 的 setter 标准入参 */
  value?: Record<string, unknown>;
  onChange?: (value: unknown) => void;
  field?: IPublicModelSettingField;
  actions?: BehaviorAction[];
  type?: string;
  [key: string]: unknown;
}

const defaultExtraBehaviorActions: BehaviorAction[] = [];

class LocalBehaviorSetter extends React.Component<LocalBehaviorSetterProps> {
  render() {
    // ignore url && responseFormatter props, use default ones
    const {
      url: propsUrl,
      responseFormatter: propsFormatter,
      extraBehaviorActions: propsExtraBehaviorActions = [],
      ...otherProps
    } = this.props;
    const url = 'https://hn.algolia.com/api/v1/search?query';
    const responseFormatter = (response: AlgoliaSearchResponse): BehaviorOption[] =>
      response.hits.map((item: AlgoliaHit) => ({
        label: item.title,
        value: item.author,
      }));
    const extraBehaviorActions = propsExtraBehaviorActions.concat(defaultExtraBehaviorActions);
    return (
      <BehaviorSetter
        {...otherProps}
        url={url}
        responseFormatter={responseFormatter}
        extraBehaviorActions={extraBehaviorActions}
      />
    );
  }
}

export default LocalBehaviorSetter;
