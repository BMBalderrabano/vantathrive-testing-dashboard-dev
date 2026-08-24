"use client";

import { useCallback, useEffect, useState } from "react";
import { useQaContext } from "@/context/qa-context";

interface Organization {
    id: string;
    name: string;
}

interface Membership {
    id: string;
    organization_id: string;
    user_id: string;
    role: string;
    organizations?: Organization | Organization[];
}

export default function OrgMembershipQuick() {
    const { selectedUserId } = useQaContext();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [orgId, setOrgId] = useState("");
    const [role, setRole] = useState<"admin" | "patient">("patient");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");

    const load = useCallback(async () => {
        try {
            const [orgRes, memRes] = await Promise.all([
                fetch("/api/organization"),
                fetch("/api/organization-membership"),
            ]);
            if (orgRes.ok) setOrganizations(await orgRes.json());
            if (memRes.ok) setMemberships(await memRes.json());
        } catch (error) {
            console.error("Failed to load org data:", error);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const userMemberships = memberships.filter((m) => m.user_id === selectedUserId);

    const asOrg = (o?: Organization | Organization[]) =>
        Array.isArray(o) ? o[0] : o;

    const assign = async () => {
        if (!selectedUserId || !orgId) return;
        setBusy(true);
        setMessage("");
        try {
            const res = await fetch("/api/organization-membership", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organization_id: orgId, user_id: selectedUserId, role }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || res.statusText);
            }
            setOrgId("");
            await load();
            setMessage("✅ Assigned");
        } catch (error) {
            setMessage(`❌ ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setBusy(false);
        }
    };

    const deassign = async (id: string) => {
        setBusy(true);
        setMessage("");
        try {
            const res = await fetch(`/api/organization-membership?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error(res.statusText);
            await load();
            setMessage("✅ Removed");
        } catch (error) {
            setMessage(`❌ ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className='bg-white rounded-lg shadow p-6 mb-6'>
            <h2 className='text-xl font-semibold mb-4'>Organization Membership</h2>
            {!selectedUserId ? (
                <p className='text-sm text-gray-600'>Select a test user to manage their organization membership.</p>
            ) : (
                <>
                    <div className='mb-4'>
                        <h3 className='text-sm font-medium text-gray-700 mb-2'>Current memberships</h3>
                        {userMemberships.length === 0 ? (
                            <p className='text-sm text-gray-500 italic'>No memberships.</p>
                        ) : (
                            <ul className='space-y-2'>
                                {userMemberships.map((m) => (
                                    <li key={m.id} className='flex items-center justify-between bg-gray-50 rounded-md px-3 py-2'>
                                        <span className='text-sm'>
                                            {asOrg(m.organizations)?.name ?? m.organization_id}
                                            <span className='ml-2 text-xs text-gray-500 uppercase'>{m.role}</span>
                                        </span>
                                        <button
                                            onClick={() => deassign(m.id)}
                                            disabled={busy}
                                            className='px-3 py-1 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300'
                                        >
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className='flex flex-wrap items-end gap-3'>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Organization</label>
                            <select
                                value={orgId}
                                onChange={(e) => setOrgId(e.target.value)}
                                className='p-3 border border-gray-300 rounded-md'
                            >
                                <option value=''>Select org...</option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as "admin" | "patient")}
                                className='p-3 border border-gray-300 rounded-md'
                            >
                                <option value='patient'>Patient</option>
                                <option value='admin'>Admin</option>
                            </select>
                        </div>
                        <button
                            onClick={assign}
                            disabled={busy || !orgId}
                            className={`px-4 py-3 rounded-md font-medium transition-colors ${
                                busy || !orgId
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                        >
                            {busy ? "Working..." : "Assign"}
                        </button>
                        {message && <span className={`text-sm font-medium ${message.includes("✅") ? "text-green-600" : "text-red-600"}`}>{message}</span>}
                    </div>
                </>
            )}
        </div>
    );
}
