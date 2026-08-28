import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ProfileState {
  name: string;
  position: string;
  email: string;
  signatureUrl: string | null;
}

interface ProfileStore {
  profile: ProfileState;
  setProfile: (profile: ProfileState) => void;
  updateProfile: (patch: Partial<ProfileState>) => void;
  clearProfile: () => void;
  setSignatureUrl: (url: string | null) => void;
}

const defaultProfile: ProfileState = {
  name: '',
  position: '',
  email: '',
  signatureUrl: null,
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profile: { ...defaultProfile },

      setProfile: (profile) => set({ profile }),

      updateProfile: (patch) =>
        set((s) => ({
          profile: { ...s.profile, ...patch },
        })),

      clearProfile: () => set({ profile: { ...defaultProfile } }),

      setSignatureUrl: (url) =>
        set((s) => ({
          profile: { ...s.profile, signatureUrl: url },
        })),
    }),
    {
      name: 'essa-profile',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ profile: state.profile }),
    }
  )
);
