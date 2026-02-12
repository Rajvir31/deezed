import { create } from "zustand";
import type { ExperienceLevel, TrainingGoal, EquipmentAccess } from "@deezed/shared";

interface OnboardingState {
  step: number;
  displayName: string;
  experienceLevel: ExperienceLevel | null;
  goal: TrainingGoal | null;
  daysPerWeek: number;
  equipment: EquipmentAccess[];
  injuries: string[];
  setStep: (step: number) => void;
  setDisplayName: (name: string) => void;
  setExperienceLevel: (level: ExperienceLevel) => void;
  setGoal: (goal: TrainingGoal) => void;
  setDaysPerWeek: (days: number) => void;
  toggleEquipment: (equip: EquipmentAccess) => void;
  addInjury: (injury: string) => void;
  removeInjury: (injury: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 0,
  displayName: "",
  experienceLevel: null,
  goal: null,
  daysPerWeek: 4,
  equipment: [],
  injuries: [],
  setStep: (step) => set({ step }),
  setDisplayName: (displayName) => set({ displayName }),
  setExperienceLevel: (experienceLevel) => set({ experienceLevel }),
  setGoal: (goal) => set({ goal }),
  setDaysPerWeek: (daysPerWeek) => set({ daysPerWeek }),
  toggleEquipment: (equip) =>
    set((state) => ({
      equipment: state.equipment.includes(equip)
        ? state.equipment.filter((e) => e !== equip)
        : [...state.equipment, equip],
    })),
  addInjury: (injury) =>
    set((state) => ({
      injuries: [...state.injuries, injury],
    })),
  removeInjury: (injury) =>
    set((state) => ({
      injuries: state.injuries.filter((i) => i !== injury),
    })),
  reset: () =>
    set({
      step: 0,
      displayName: "",
      experienceLevel: null,
      goal: null,
      daysPerWeek: 4,
      equipment: [],
      injuries: [],
    }),
}));
