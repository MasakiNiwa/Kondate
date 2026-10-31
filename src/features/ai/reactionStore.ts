import { create } from 'zustand';
import { getSettings } from '@/features/settings/settingsStore';
import { errorMessage } from '@/lib/utils/format';
import { ai } from './aiClient';
import { useAiBusy } from './aiTask';
import { dayForAi, rowsBetween } from './appContext';
import { parseReaction, reactionPrompt } from './prompt';

export interface ReactionLine {
  personaId: string;
  text: string;
}

interface ReactionState {
  /** 日付 → ひとこと */
  byDate: Record<string, ReactionLine[]>;
  loading: string | null;
  error: string | null;
  react: (date: string) => Promise<void>;
}

/** 献立へのひとこと（キャラクターのリアクション） */
export const useReactions = create<ReactionState>()((set) => ({
  byDate: {},
  loading: null,
  error: null,
  async react(date) {
    if (useAiBusy.getState().task) return;
    const [row] = await rowsBetween(date, date);
    if (!row) return;
    const personas = getSettings().personas.slice(0, 2);
    const { system, user } = reactionPrompt(personas, dayForAi(row));
    set({ loading: date, error: null });
    useAiBusy.setState({ task: 'reaction' });
    let text = '';
    try {
      await ai.generate(
        {
          settings: {
            systemPrompt: system,
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 300,
            enableThinking: false,
          },
          history: [],
          message: { id: `r-${date}`, role: 'user', text: user },
          assistantId: `ra-${date}`,
          mode: 'oneshot',
        },
        (e) => {
          if (e.type === 'delta' && e.channel !== 'thought') text += e.text;
        },
        undefined,
        'reaction',
      );
      set((s) => ({ byDate: { ...s.byDate, [date]: parseReaction(text, personas) } }));
    } catch (e) {
      set({ error: errorMessage(e) });
    } finally {
      set({ loading: null });
      useAiBusy.setState({ task: null });
    }
  },
}));
