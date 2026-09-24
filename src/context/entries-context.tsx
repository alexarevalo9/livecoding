import { createContext, useContext, useState } from 'react';

import { createId } from '@/utils/id';

export type SleepEntry = {
  id: string;
  date: string; // 'YYYY-MM-DD' — sleep-start date
  sleepTime: string; // 'HH:mm'
  wakeTime: string; // 'HH:mm'
  notes?: string;
  createdAt: string; // ISO
};
export type NewSleepEntry = Omit<SleepEntry, 'id' | 'createdAt'>;

type EntriesValue = {
  entries: SleepEntry[];
  addEntry: (input: NewSleepEntry) => void;
};

const EntriesContext = createContext<EntriesValue | null>(null);

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<SleepEntry[]>([]);

  const addEntry = (input: NewSleepEntry) => {
    const entry: SleepEntry = {
      ...input,
      id: createId(),
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [entry, ...prev]);
  };

  return (
    <EntriesContext.Provider value={{ entries, addEntry }}>
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries(): EntriesValue {
  const value = useContext(EntriesContext);
  if (!value) throw new Error('useEntries must be used within EntriesProvider');
  return value;
}
