"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQaContext } from "@/context/qa-context";
import { OperatorAuthControls } from "@/components/OperatorAuthControls";
import { Combobox } from "@/components/ui/combobox";

export default function Header() {
  const pathname = usePathname();
  const {
    selectedUserId,
    selectedOrgId,
    setSelectedUserId,
    setSelectedOrgId,
    isHydrated,
    users,
    organizations,
  } = useQaContext();

  const navLinkClass = (href: string) => {
    const isActive =
      href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(`${href}/`);
    return `px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
      isActive
        ? "bg-blue-600 text-white"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/40 bg-white/65 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 shrink-0">
            Testing Dashboard (dev)
          </h1>

          <nav className="flex flex-wrap gap-2">
            <Link href="/" className={navLinkClass("/")}>
              Main Dashboard
            </Link>
            <Link href="/program" className={navLinkClass("/program")}>
              Programs
            </Link>
            <Link href="/organizations" className={navLinkClass("/organizations")}>
              Organizations
            </Link>
            <Link href="/talonone" className={navLinkClass("/talonone")}>
              TalonOne
            </Link>
          </nav>

          <OperatorAuthControls />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex-1 min-w-0">
            <div id="header-test-user">
              <Combobox
                options={users.map((user) => ({
                  value: user.id,
                  label: `${user.first_name} ${user.last_name} (${user.email})`,
                }))}
                value={isHydrated ? selectedUserId : undefined}
                onValueChange={(value) => setSelectedUserId(value ?? "")}
                placeholder={isHydrated ? "Choose a user..." : "Loading..."}
                searchPlaceholder="Search by name or email..."
                emptyMessage="No user found."
                disabled={!isHydrated}
                className="h-10 text-sm font-normal"
              />
            </div>
          </div>

          <div className="flex-1 min-w-0 sm:max-w-xs">
            <label
              htmlFor="header-org"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Organization
            </label>
            <select
              id="header-org"
              value={isHydrated ? (selectedOrgId ?? "") : ""}
              onChange={(e) =>
                setSelectedOrgId(e.target.value ? e.target.value : null)
              }
              disabled={!isHydrated}
              className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white disabled:bg-gray-100"
            >
              <option value="">All orgs</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
