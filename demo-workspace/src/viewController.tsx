import React from 'react';
import { Dialog, Form, Input, Button } from '@alifd/next';
import { IPublicModelPluginContext, IPublicModelResource } from '@alilc/lowcode-types';

/** 新增页面表单的提交值（@alifd/next 的 Form.Submit onClick 形参类型是 unknown） */
interface AddPageFormValues {
  title: string;
  slug: string;
}

class Controller {
  pluginContext?: IPublicModelPluginContext;

  init = (ctx: IPublicModelPluginContext) => {
    this.pluginContext = ctx;
  }

  onAddPage = () => {
    const dialog = Dialog.show({
      v2: true,
      title: "新增页面",
      content: (
        <Form style={{ width: "500px" }} colon>
          <Form.Item
            name="title"
            label="页面名称"
            required
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="slug"
            label="页面标识"
            required
          >
            <Input />
          </Form.Item>
          <Form.Item label="" colon={false}>
            <Form.Submit
              type="primary"
              validate
              onClick={(rawValues, errors) => {
                // Form.Submit 的 value 形参是 unknown，这里按表单字段收窄
                const values = rawValues as AddPageFormValues;
                const list = this.pluginContext?.workspace.resourceList.map(d => d.options);
                list?.push({
                  slug: values.slug,
                  title: values.title,
                  id: values.slug,
                });
                this.pluginContext?.plugins.pluginResourceData.update(list);
                const resource = this.pluginContext?.workspace.resourceList.filter(d => d.id === values.slug)?.[0];
                if (resource) {
                  this.pluginContext?.workspace.openEditorWindow(resource);
                }
                dialog.hide();
              }}
              style={{ marginRight: 8 }}
            >
              确认
            </Form.Submit>
            <Button onClick={() => {
              dialog.hide()
            }}>取消</Button>
          </Form.Item>
        </Form>
      ),
      footerActions: [],
    })
  }

  onDeletePage = async (resource: IPublicModelResource) => {
    Dialog.show({
      v2: true,
      title: "删除页面",
      content: `删除页面后无法恢复，是否确定删除页面 ${resource.options.title}.`,
      onOk: () => {
        this.pluginContext?.workspace.removeEditorWindow(resource.name!, resource.options.id);
        const list = this.pluginContext?.workspace.resourceList.map(d => d.options);
        const newList = list?.filter(d => d.id !== resource.options.id)

        console.log('newList', newList);

        this.pluginContext?.plugins.pluginResourceData.update(newList);
      },
    })
  }
}

export default new Controller();
