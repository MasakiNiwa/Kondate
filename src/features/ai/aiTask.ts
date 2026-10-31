import { create } from 'zustand';

/** AI の応答の種類（種類ごとに使う AI を変えられる）。chat: 相談、reaction: ひとこと、generate: データづくり */
export type AiTask = 'chat' | 'reaction' | 'generate';

/** AI は同時に 1 つしか生成しないので、誰が使っているかを共有する */
export const useAiBusy = create<{ task: AiTask | null }>()(() => ({ task: null }));
