// LLLM-Study から流用したモジュール（端末内の AI）向けの別名
export { useAiBusy } from './aiTask';
export type { AiTask } from './aiTask';
import { useAiBusy } from './aiTask';

export function isAiBusy(): boolean {
  return useAiBusy.getState().task !== null;
}
