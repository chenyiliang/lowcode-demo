import React from 'react';
import { Icon, Message } from '@alifd/next';
// 组件动作的回调参数是公开模型 IPublicModelNode（不是引擎内部的 designer Node）
import type { IPublicModelNode, IPublicModelPluginContext } from '@alilc/lowcode-types';
export interface IProps {
  logo?: string;
  href?: string;
}

const AddHelloActionPlugin = (ctx: IPublicModelPluginContext) => {
  return {
    async init() {
      const { material } = ctx;
      material.addBuiltinComponentAction({
        name: 'hello',
        content: {
          icon: <Icon type="atm" size="small" />,
          title: 'hello',
          action(node: IPublicModelNode) {
            Message.show('Welcome to Low-Code engine');
          },
        },
        condition: (node: IPublicModelNode) => {
          return node.componentMeta?.componentName === 'NextTable';
        }
      });
    },
  };
}
AddHelloActionPlugin.pluginName = 'AddHelloActionPlugin';
export default AddHelloActionPlugin;