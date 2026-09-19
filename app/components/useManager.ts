"use client";

import { useCallback, useEffect, useState } from "react";

const ID_KEY = "pdt_manager_id";
const NAME_KEY = "pdt_manager_name";

// Lightweight "who are you" identity, remembered per browser (no accounts).
export function useManager() {
  const [managerId, setId] = useState<string | null>(null);
  const [managerName, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setId(localStorage.getItem(ID_KEY));
    setName(localStorage.getItem(NAME_KEY));
    setReady(true);
  }, []);

  const choose = useCallback((id: string, name: string) => {
    localStorage.setItem(ID_KEY, id);
    localStorage.setItem(NAME_KEY, name);
    setId(id);
    setName(name);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(ID_KEY);
    localStorage.removeItem(NAME_KEY);
    setId(null);
    setName(null);
  }, []);

  return { managerId, managerName, ready, choose, clear };
}
