import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { ChatTurn, ConversationSettings } from '@/lib/llm/types';
import { createId } from '@/lib/utils/id';
import { errorMessage } from '@/lib/utils/format';
import { getSettings } from '@/features/settings/settingsStore';
import { ai } from './aiClient';
import { useAiBusy } from './aiTask';
import { buildAppSnapshot } from './appContext';
import { getPersona } from './personas';
import { chatSystemPrompt } from './prompt';
import { AI_TOOLS, runTool, type SwapProposal } from './tools';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** 話したキャラクター（assistant のとき） */
  personaId?: string;
  text: string;
  /** 使ったツール（表示用） */
  tools?: string[];
  proposals?: (SwapProposal & { applied?: boolean })[];
  error?: string;
  streaming?: boolean;
}

const CHAT_SETTINGS: Omit<ConversationSettings, 'systemPrompt'> = {
  temperature: 0.8,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1200,
  enableThinking: false,
};

/** 直近の会話だけを送る（長くなりすぎないように） */
const HISTORY_LIMIT = 16;

interface ChatState {
  messages: ChatMessage[];
  send: (text: string) => Promise<void>;
  stop: () => void;
  clear: () => void;
  markApplied: (messageId: string, index: number) => void;
}

function toTurns(messages: ChatMessage[], selfId: string): ChatTurn[] {
  return messages
    .filter((m) => !m.error && m.text)
    .slice(-HISTORY_LIMIT)
    .map((m) => ({
      id: m.id,
      role: m.role === 'user' || m.personaId === selfId ? m.role : 'user',
      // 仲間の発言は名前を付けて、ユーザー側の発言として渡す
      text:
        m.role === 'assistant' && m.personaId !== selfId
          ? `[${getPersona(m.personaId ?? '').name}] ${m.text}`
          : m.text,
    }));
}

/** 連続する同じ役割の発言をまとめる（API によっては交互でないと受け付けない） */
function mergeTurns(turns: ChatTurn[]): ChatTurn[] {
  const out: ChatTurn[] = [];
  for (const t of turns) {
    const last = out[out.length - 1];
    if (last && last.role === t.role) last.text += `\n\n${t.text}`;
    else out.push({ ...t });
  }
  return out;
}

export const useChat = create<ChatState>()(
  persist(
    (set, get) => {
      const patch = (
        id: string,
        p: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>),
      ) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, ...(typeof p === 'function' ? p(m) : p) } : m,
          ),
        }));

      return {
        messages: [],
        async send(text) {
          if (useAiBusy.getState().task) return;
          const user: ChatMessage = { id: createId(), role: 'user', text };
          set((s) => ({ messages: [...s.messages, user] }));
          useAiBusy.setState({ task: 'chat' });
          try {
            const personas = getSettings().personas.slice(0, 2).map(getPersona);
            const snapshot = await buildAppSnapshot();
            for (const persona of personas) {
              const others = personas.filter((p) => p.id !== persona.id);
              const id = createId();
              set((s) => ({
                messages: [
                  ...s.messages,
                  { id, role: 'assistant', personaId: persona.id, text: '', streaming: true },
                ],
              }));
              const prior = get().messages.filter((m) => m.id !== id);
              const turns = mergeTurns(toTurns(prior, persona.id));
              // 仲間の発言はユーザー側にまとめるので、最後はいつもユーザーの発言になる
              const message = turns.pop()!;
              try {
                const res = await ai.generate(
                  {
                    settings: {
                      ...CHAT_SETTINGS,
                      systemPrompt: chatSystemPrompt(persona, others, snapshot),
                    },
                    history: turns,
                    message,
                    assistantId: id,
                    mode: 'oneshot',
                    tools: AI_TOOLS,
                  },
                  (e) => {
                    if (e.type === 'delta' && e.channel !== 'thought')
                      patch(id, (m) => ({ text: m.text + e.text }));
                    if (e.type === 'tool-call')
                      patch(id, (m) => ({ tools: [...(m.tools ?? []), e.call.name] }));
                  },
                  (call) =>
                    runTool(call, (p) =>
                      patch(id, (m) => ({ proposals: [...(m.proposals ?? []), p] })),
                    ),
                  'chat',
                );
                patch(id, { streaming: false });
                if (res.status === 'cancelled') break;
              } catch (e) {
                patch(id, { streaming: false, error: errorMessage(e) });
                break;
              }
            }
          } catch (e) {
            // 状態の読み込みなど、生成の前に失敗したとき
            set((s) => ({
              messages: [
                ...s.messages,
                {
                  id: createId(),
                  role: 'assistant',
                  personaId: getSettings().personas[0],
                  text: '',
                  error: errorMessage(e),
                },
              ],
            }));
          } finally {
            useAiBusy.setState({ task: null });
          }
        },
        stop() {
          ai.cancel();
        },
        clear() {
          set({ messages: [] });
        },
        markApplied(messageId, index) {
          patch(messageId, (m) => ({
            proposals: m.proposals?.map((p, i) => (i === index ? { ...p, applied: true } : p)),
          }));
        },
      };
    },
    {
      name: `${STORAGE_PREFIX}:chat`,
      version: 1,
      partialize: (s) => ({
        messages: s.messages.slice(-60).map((m) => ({ ...m, streaming: false })),
      }),
    },
  ),
);
