"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const USER_STORAGE_KEY = "qa-selected-user-id";
const ORG_STORAGE_KEY = "qa-selected-org-id";

export interface QaContextValue {
  /** Empty string = no user selected */
  selectedUserId: string;
  /** null = "All orgs" */
  selectedOrgId: string | null;
  setSelectedUserId: (userId: string) => void;
  setSelectedOrgId: (orgId: string | null) => void;
  /** false until localStorage has been read (avoid SSR/hydration mismatch) */
  isHydrated: boolean;
}

const QaContext = createContext<QaContextValue | null>(null);

function readStoredUserId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(USER_STORAGE_KEY) ?? "";
}

function readStoredOrgId(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(ORG_STORAGE_KEY);
  if (stored === null || stored === "") return null;
  return stored;
}

export function QaProvider({ children }: { children: ReactNode }) {
  const [selectedUserId, setSelectedUserIdState] = useState("");
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setSelectedUserIdState(readStoredUserId());
    setSelectedOrgIdState(readStoredOrgId());
    setIsHydrated(true);
  }, []);

  const setSelectedUserId = useCallback((userId: string) => {
    setSelectedUserIdState(userId);
    if (userId) {
      localStorage.setItem(USER_STORAGE_KEY, userId);
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  const setSelectedOrgId = useCallback((orgId: string | null) => {
    setSelectedOrgIdState(orgId);
    if (orgId) {
      localStorage.setItem(ORG_STORAGE_KEY, orgId);
    } else {
      localStorage.removeItem(ORG_STORAGE_KEY);
    }
  }, []);

  return (
    <QaContext.Provider
      value={{
        selectedUserId,
        selectedOrgId,
        setSelectedUserId,
        setSelectedOrgId,
        isHydrated,
      }}
    >
      {children}
    </QaContext.Provider>
  );
}

export function useQaContext(): QaContextValue {
  const ctx = useContext(QaContext);
  if (!ctx) {
    throw new Error("useQaContext must be used within QaProvider");
  }
  return ctx;
}
