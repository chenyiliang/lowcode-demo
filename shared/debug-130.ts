/**
 * 临时诊断（定位 React #130 后删除）：
 * 包装 window.React.createElement，在元素 type 为「非组件对象」时打印 type 的键与创建堆栈。
 * 仅注入到父页面（demo 入口 import 它），用于定位 parent 侧 React 树的非法元素。
 */
import React from 'react';

const origCreate = React.createElement;
(React as any).createElement = function patchedCreateElement(type: any, ...args: any[]) {
  if (
    type &&
    typeof type === 'object' &&
    !type.$$typeof &&
    !type.render &&
    !type.prototype &&
    !Array.isArray(type)
  ) {
    // eslint-disable-next-line no-console
    console.error(
      '[DEBUG130-PARENT] object-as-element keys=',
      Object.keys(type).slice(0, 10),
      'stack=',
      new Error().stack?.split('\n').slice(2, 6).join(' | '),
    );
  }
  return (origCreate as any).call(React, type, ...args);
};

export {};
