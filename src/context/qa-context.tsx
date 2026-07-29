"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getOrganizations, getUsers, type Organization } from "@/lib/api";
import type { User } from "@/lib/types";

const USER_STORAGE_KEY = "qa-selected-user-id";
const ORG_STORAGE_KEY = "qa-selected-org-id";

export interface QaContextValue {
  /** Empty string = no user selected */
  selectedUserId: string;
  /** null = "All orgs" */
  selectedOrgId: string | null;
  setSelectedUserId: (userId: string) => void;
  setSelectedOrgId: (orgId: string | null) => void;
  /** false until localStorage/URL has been read (avoid SSR/hydration mismatch) */
  isHydrated: boolean;
  /** Cached header picker lists (survive remounts / soft nav) */
  users: User[];
  organizations: Organization[];
  refreshPickers: () => Promise<void>;
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

function readUrlUserId(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("userId") ?? "";
}

export function QaProvider({ children }: { children: ReactNode }) {
  const [selectedUserId, setSelectedUserIdState] = useState("");
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const pickersLoaded = useRef(false);

  useEffect(() => {
    // Prefer ?userId= over localStorage so reload doesn't flash the previous user
    const fromUrl = readUrlUserId();
    setSelectedUserIdState(fromUrl || readStoredUserId());
    setSelectedOrgIdState(readStoredOrgId());
    setIsHydrated(true);
  }, []);

  const refreshPickers = useCallback(async () => {
    try {
      const [usersData, orgsData] = await Promise.all([
        getUsers(),
        getOrganizations(),
      ]);
      setUsers(usersData);
      setOrganizations(orgsData);
      pickersLoaded.current = true;
    } catch (error) {
      console.error("Failed to load header picker data:", error);
    }
  }, []);

  useEffect(() => {
    if (pickersLoaded.current) return;
    void refreshPickers();
  }, [refreshPickers]);

  useEffect(() => {
    const onUsersChanged = () => {
      void refreshPickers();
    };
    window.addEventListener("qa-users-changed", onUsersChanged);
    return () => window.removeEventListener("qa-users-changed", onUsersChanged);
  }, [refreshPickers]);

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
        users,
        organizations,
        refreshPickers,
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
