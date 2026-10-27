"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import type { UserPreferences } from "@/lib/auth/schemas";
import { apiRequest } from "@/lib/http-client";

const Context = createContext<{
  preferences: UserPreferences;
  saving: boolean;
  save: (value: UserPreferences) => Promise<void>;
} | null>(null);
export function PreferencesProvider({
  initial,
  children,
}: {
  initial: UserPreferences;
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState(initial);
  const [saving, setSaving] = useState(false);
  const { setTheme } = useTheme();
  useEffect(() => {
    document.documentElement.dataset.accent = "blue";
    setTheme("dark");
  }, [preferences, setTheme]);
  async function save(value: UserPreferences) {
    setSaving(true);
    try {
      await apiRequest("/api/settings", value, "PATCH");
      setPreferences(value);
      toast.success("Preferências salvas.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Context.Provider value={{ preferences, saving, save }}>
      {children}
    </Context.Provider>
  );
}
export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("PreferencesProvider ausente.");
  return value;
}
