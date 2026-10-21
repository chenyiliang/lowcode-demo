/** 原 public/index.ejs 里的版本横幅，version 由 vite.config.ts 的 define 注入 */
export function printBanner(): void {
  console.log(
    '%c AliLowCodeEngineDemo %c v' + __DEMO_VERSION__ + ' ',
    'padding: 2px 1px; border-radius: 3px 0 0 3px; color: #fff; background: #b37feb; font-weight: bold;',
    'padding: 2px 1px; border-radius: 0 3px 3px 0; color: #fff; background: #42c02e; font-weight: bold;',
  );
}
