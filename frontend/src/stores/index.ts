import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Global App State Interface
interface AppState {
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  loading: boolean;

  // User Preferences
  currency: string;
  timezone: string;

  // Temporary Data (not persisted)
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }>;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLoading: (loading: boolean) => void;
  setCurrency: (currency: string) => void;
  setTimezone: (timezone: string) => void;
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        sidebarOpen: true,
        theme: 'light',
        loading: false,
        currency: 'USD',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notifications: [],

        // Actions
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setTheme: (theme) => set({ theme }),
        setLoading: (loading) => set({ loading }),
        setCurrency: (currency) => set({ currency }),
        setTimezone: (timezone) => set({ timezone }),

        addNotification: (notification) =>
          set((state) => ({
            notifications: [
              ...state.notifications,
              {
                ...notification,
                id: crypto.randomUUID(),
                timestamp: new Date(),
              },
            ],
          })),

        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),

        clearNotifications: () => set({ notifications: [] }),
      }),
      {
        name: 'family-finance-app',
        // Only persist user preferences, not temporary data
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          theme: state.theme,
          currency: state.currency,
          timezone: state.timezone,
        }),
      }
    ),
    {
      name: 'family-finance-store',
    }
  )
);

export default useAppStore;