/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
declare module 'highs/runtime?url' {
  const url: string;
  export default url;
}
