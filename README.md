## Low-Code Engine Demo
demo 是一个组合内核、setter、插件、物料的示范工程，因为未经长期生产环境打磨，可能还会有一些各个模块间结合的 bug，希望大家理解~

## 如何使用
目前包含多个独立 demo 工程目录，每个 demo 目录都是一个独立的工程，代表一个特定的 demo 场景，可以选择其一单独使用。

本仓库使用 pnpm workspace 管理，React 19 + Vite 构建，lowcode 相关依赖通过本地 `workspace:*` 链接。

```bash
# 在仓库根目录安装（会一并链接本地 workspace 包）
pnpm install

# 开发某个 demo（dev server 默认 5556 端口）
cd demo-general
pnpm run dev

# 构建某个 demo（产物在 demo-general/dist）
pnpm run build
```

常用脚本（在每个 demo 目录内）：

- `pnpm run dev`：启动 Vite dev server（会先执行 `predev` 生成画布模拟器 IIFE 产物）
- `pnpm run build`：构建到 `dist/`（会先执行 `prebuild`）
- `pnpm run preview`：本地预览构建产物
- `pnpm run typecheck`：`tsc --noEmit` 类型检查
- `pnpm run clean`：清理 `dist/` 与模拟器产物

在仓库根目录也可对所有 demo 批量操作，例如 `pnpm run build` / `pnpm run typecheck`。

场景列表：

- [general](https://lowcode-engine.cn/demo/demo-general/index.html)：此 demo 尽可能将引擎常用能力展示出来，在试用时建议使用该 demo 工程，其他 demo 均各有侧重展示内容。
- [basic-fusion](https://lowcode-engine.cn/demo/demo-basic-fusion/index.html)：此 fusion 的元数据描述是很老的版本，只为了示意描述结构，请勿用于生产环境
- [basic-antd](https://lowcode-engine.cn/demo/demo-basic-antd/index.html)
- [node-extended-actions](https://lowcode-engine.cn/demo/demo-node-extended-actions/index.html)
- [next-pro](https://lowcode-engine.cn/demo/demo-next-pro/index.html)
- [lowcode-component](https://lowcode-engine.cn/demo/demo-lowcode-component/index.html)
- [lowcode-workspace](https://lowcode-engine.cn/demo/demo-workspace/index.html)

更多参考资料：

- [马上玩一下](https://lowcode-engine.cn/demo/demo-general/index.html)
- [低代码引擎官网](http://lowcode-engine.cn)
- [引擎主仓库](https://github.com/alibaba/lowcode-engine)
