import { create } from "zustand";

interface ActiveWorkout {
  sessionId: string;
  planId: string;
  weekNumber: number;
  dayNumber: number;
  dayLabel: string;
  startedAt: string;
}

interface WorkoutState {
  activeWorkout: ActiveWorkout | null;
  restTimerSeconds: number;
  isTimerRunning: boolean;
  startWorkout: (workout: ActiveWorkout) => void;
  endWorkout: () => void;
  setRestTimer: (seconds: number) => void;
  startTimer: () => void;
  stopTimer: () => void;
  tickTimer: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  activeWorkout: null,
  restTimerSeconds: 0,
  isTimerRunning: false,
  startWorkout: (workout) => set({ activeWorkout: workout }),
  endWorkout: () => set({ activeWorkout: null, restTimerSeconds: 0, isTimerRunning: false }),
  setRestTimer: (seconds) => set({ restTimerSeconds: seconds, isTimerRunning: true }),
  startTimer: () => set({ isTimerRunning: true }),
  stopTimer: () => set({ isTimerRunning: false }),
  tickTimer: () =>
    set((state) => {
      if (state.restTimerSeconds <= 0) {
        return { isTimerRunning: false, restTimerSeconds: 0 };
      }
      return { restTimerSeconds: state.restTimerSeconds - 1 };
    }),
}));
