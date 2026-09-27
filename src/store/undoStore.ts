import { create } from 'zustand';

interface UndoState {
  message: string | null;
  onUndo: (() => void) | null;
  /** Bumped on every show so the toast's own auto-hide timer never fires late for an older message. */
  token: number;
  /** Shows the toast with an "Undo" action. The action itself performs the restore. */
  show: (message: string, onUndo: () => void) => void;
  hide: () => void;
}

/**
 * One shared "Undo" toast for the whole app. A delete always happens right
 * away (it is only ever a soft delete), and this just offers a short window
 * to reverse it — nothing is held back waiting to see if Undo is pressed.
 */
export const useUndoStore = create<UndoState>((set) => ({
  message: null,
  onUndo: null,
  token: 0,

  show: (message, onUndo) => set((state) => ({ message, onUndo, token: state.token + 1 })),
  hide: () => set({ message: null, onUndo: null }),
}));
