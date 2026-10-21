/**
 * 把画布物料从远程 CDN 改为依赖本项目（workspace）的对应物料包。
 *
 * 背景：demo 的 assets.json 里，画布 iframe 的物料原先指向 alifd.alicdn.com 的远程 UMD
 * （React16 时代构建），在 React 19 下崩溃（实测 @alifd/layout、fusion-ui 的 view.js 报
 * Cannot read 'hotkey'/'hasOwnProperty'、React #130），画布渲染不出组件。
 * 而目标要求「lowcode 组件不依赖远程 npm，改成依赖本项目对应组件」。
 *
 * 本项目里这些物料**就是 workspace 包**，且已能产出浏览器可加载的 UMD：
 *   lowcode-materials 的 build:lowcode → dist/lowcode/{view,meta,meta.design}.js
 *   全局名与 assets.json 期望完全一致（AlilcLowcodeMaterials / AlifdFusionUi /
 *   AntdLowcode / AlilcLceX6Items，meta 导出名 *Meta 也一致），已逐个核实。
 *
 * ⚠️ URL 映射必须按**角色**（role）而非 CDN 文件名：
 *   老 CDN 的 packages[].urls 指向 webpack 时代的 `dist/<Library>.js` + `dist/<Library>.css`，
 *   而本地 Vite 构建产出的是 `dist/lowcode/view.js` + `dist/<lib>.css`（lib 样式）。
 *   两者文件名完全不同，按文件名正则匹配会漏掉 packages[].urls（实测会漏）。
 *   lowcode assets 协议里角色是固定的：
 *     packages[].urls    = [viewJs, viewCss]
 *     packages[].editUrls= [viewJs, viewCss]
 *     components[].url(s)= metaJs
 *   所以直接按角色整体替换成本地文件，不依赖 CDN 文件名形态。
 *
 * 第三方库（moment/lodash/antd/@alifd/next/NextTable/bizcharts/@alifd/layout 等）
 * **不是 lowcode 组件**，不在本目标范围，保留 CDN。
 *
 * 用法: node scripts/localize-materials.mjs   （幂等）
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MATERIALS = resolve(ROOT, 'lowcode-materials/packages');

/**
 * 本地物料包清单。
 * dir      : lowcode-materials/packages 下的目录
 * view     : dist/lowcode/view.js（UMD，画布运行时组件）
 * meta     : dist/lowcode/meta.js（UMD，编辑器物料描述）
 * metaDesign: dist/lowcode/meta.design.js（设计态 meta，可选）
 * libCss   : dist/<lib>.css（组件样式，替代老 CDN 的 view.css / <Library>.css）
 */
const LOCAL_MATERIALS = [
  { pkg: '@alilc/lowcode-materials', dir: 'fusion-lowcode-materials', view: 'view.js', meta: 'meta.js', metaDesign: 'meta.design.js', libCss: 'lowcode-materials.css' },
  { pkg: '@alifd/fusion-ui', dir: 'fusion-ui', view: 'view.js', meta: 'meta.js', metaDesign: 'meta.design.js', libCss: 'fusion-ui.css' },
  { pkg: '@alilc/antd-lowcode-materials', dir: 'antd-lowcode-materials', view: 'view.js', meta: 'meta.js', metaDesign: null, libCss: 'antd-lowcode-materials.css' },
  { pkg: '@alilc/lce-x6-items', dir: 'graph-x6-materials', view: 'view.js', meta: 'meta.js', metaDesign: null, libCss: null },
];

function copyMaterial(m, demoDir) {
  const src = join(MATERIALS, m.dir, 'dist');
  const destDir = join(demoDir, 'public', 'materials', m.dir);
  mkdirSync(destDir, { recursive: true });
  const copied = [];
  const jobs = [
    [join(src, 'lowcode', m.view), m.view],
    [join(src, 'lowcode', m.meta), m.meta],
    ...(m.metaDesign ? [[join(src, 'lowcode', m.metaDesign), m.metaDesign]] : []),
    ...(m.libCss ? [[join(src, m.libCss), m.libCss]] : []),
  ];
  for (const [from, name] of jobs) {
    if (existsSync(from)) { copyFileSync(from, join(destDir, name)); copied.push(name); }
    else console.warn(`    ! 缺产物 ${from}（跳过该文件）`);
  }
  return copied;
}

/** 按角色把某本地物料的 CDN url 整体替换成本地路径 */
function rewriteForPackage(assets, m) {
  const base = `/materials/${m.dir}`;
  const viewJs = `${base}/${m.view}`;
  const viewCss = m.libCss ? `${base}/${m.libCss}` : null;
  const metaJs = `${base}/${m.meta}`;
  let changed = 0;

  const viewUrls = viewCss ? [viewJs, viewCss] : [viewJs];

  for (const p of assets.packages || []) {
    if (p.package !== m.pkg) continue;
    // 角色替换：urls / editUrls 都是 [viewJs, viewCss]
    if (Array.isArray(p.urls) && p.urls.length) { p.urls = [...viewUrls]; changed++; }
    if (Array.isArray(p.editUrls) && p.editUrls.length) { p.editUrls = [...viewUrls]; changed++; }
    if (p.advancedUrls) { for (const k of Object.keys(p.advancedUrls)) { p.advancedUrls[k] = [...viewUrls]; changed++; } }
    if (p.advancedEditUrls) { for (const k of Object.keys(p.advancedEditUrls)) { p.advancedEditUrls[k] = [...viewUrls]; changed++; } }
  }
  for (const c of assets.components || []) {
    // meta 的角色：components[].url 或 components[].urls.default/design
    const refersToPkg = (u) => typeof u === 'string' && u.includes(m.pkg);
    if (refersToPkg(c.url)) { c.url = metaJs; changed++; }
    if (c.urls) {
      for (const k of Object.keys(c.urls)) {
        if (refersToPkg(c.urls[k])) { c.urls[k] = metaJs; changed++; }
      }
    }
    // ⚠️ advancedUrls / advancedEditUrls 也必须改：AssetLoader 优先取 advancedUrls，
    // 只改 url/urls 会让它继续加载远程 CDN 的 meta。实测 demo-graph-x6 因此报
    // "StartEnd is not a npm component"、画布节点渲染成小点。
    for (const key of ['advancedUrls', 'advancedEditUrls']) {
      if (c[key] && typeof c[key] === 'object') {
        for (const k of Object.keys(c[key])) {
          if (Array.isArray(c[key][k])) {
            const nv = c[key][k].map((u) => (refersToPkg(u) ? metaJs : u));
            if (JSON.stringify(nv) !== JSON.stringify(c[key][k])) { c[key][k] = nv; changed++; }
          }
        }
      }
    }
  }
  return changed;
}

import { execSync } from 'node:child_process';
const demos = execSync('ls -d demo-*', { cwd: join(ROOT, 'lowcode-demo'), encoding: 'utf8' })
  .split('\n').filter(Boolean);

let anyChange = false;
for (const demo of demos) {
  const demoDir = join(ROOT, 'lowcode-demo', demo);
  const assetsPath = join(demoDir, 'src', 'services', 'assets.json');
  if (!existsSync(assetsPath)) continue;
  const assets = JSON.parse(readFileSync(assetsPath, 'utf8'));
  const usedPkgs = new Set((assets.packages || []).map((p) => p.package));
  let totalChanged = 0;
  for (const m of LOCAL_MATERIALS) {
    if (!usedPkgs.has(m.pkg)) continue;
    const copied = copyMaterial(m, demoDir);
    const changed = rewriteForPackage(assets, m);
    if (changed || copied.length) {
      totalChanged += changed;
      anyChange = true;
      console.log(`  ${demo}: ${m.pkg} → 拷贝 [${copied.join(', ')}]，改写 ${changed} 处 url`);
    }
  }
  if (totalChanged) writeFileSync(assetsPath, JSON.stringify(assets, null, 2) + '\n');
}
console.log(anyChange
  ? '\n完成。本地物料已拷入 public/materials/，assets.json 已按角色指向本地路径。'
  : '\n无变化（assets.json 已指向本地，或 demo 未使用本地物料）。');
console.log('第三方库（moment/lodash/antd/@alifd/next/NextTable/bizcharts/@alifd/layout）非 lowcode 组件，保留 CDN。');
