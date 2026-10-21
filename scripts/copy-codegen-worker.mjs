/**
 * 把出码 Web Worker 运行时从 workspace 包拷进**当前 demo** 的 public/。
 *
 * 背景：@alilc/lowcode-code-generator 的 standalone-loader 默认 workerJsUrl 指向
 * jsdelivr CDN 的 standalone-worker.min.js（远程 + 我们并不产出 .min.js），
 * 不传 workerJsUrl 就会去拉 CDN 并 Failed to fetch（Edge 实测）。
 * 各 demo 注册 CodeGenPlugin 时已传 workerJsUrl: '/standalone-worker.min.js'，
 * 因此需要把 workspace 里构建好的 worker 产物拷到本 demo 的 public/ 下。
 *
 * worker 产物由 lowcode-engine/modules/code-generator 的 vite.config.worker.ts 打成
 * 自包含 IIFE（无任何外部 require），这里只拷贝、不二次打包。
 *
 * 用法（在 demo 目录内）: node ../../scripts/copy-codegen-worker.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// 脚本在 lowcode-demo/scripts/，demo 目录是调用方的 cwd
const demoDir = process.cwd();
const nodeRequire = createRequire(path.join(demoDir, 'noop.js'));

const outDir = path.join(demoDir, 'public');
fs.mkdirSync(outDir, { recursive: true });

let src;
try {
  src = nodeRequire.resolve('@alilc/lowcode-code-generator/dist/standalone-worker.js');
} catch {
  console.error('[copy-codegen-worker] 无法解析 @alilc/lowcode-code-generator/dist/standalone-worker.js');
  console.error('[copy-codegen-worker] 请先构建：pnpm --filter @alilc/lowcode-code-generator build');
  process.exit(1);
}
const dest = path.join(outDir, 'standalone-worker.min.js');
fs.copyFileSync(src, dest);
console.log(`[copy-codegen-worker] ${path.basename(demoDir)} → public/standalone-worker.min.js (${(fs.statSync(dest).size / 1024 / 1024).toFixed(2)} MB)`);
