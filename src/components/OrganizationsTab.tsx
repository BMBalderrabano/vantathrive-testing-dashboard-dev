"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";

interface Organization {
    id: string;
    name: string;
    created_at: string;
}

interface OrganizationMembership {
    id: string;
    organization_id: string;
    user_id: string;
    role: string;
    created_at: string;
    organizations?: Organization;
    profiles?: User;
}

export default function OrganizationsTab() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [orgName, setOrgName] = useState("");
    const [selectedOrg, setSelectedOrg] = useState("");
    const [selectedUser, setSelectedUser] = useState("");
    const [role, setRole] = useState<"admin" | "patient">("patient");
    const [loading, setLoading] = useState(false);

    const loadOrganizations = async () => {
        try {
            const res = await fetch("/api/organization");
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setOrganizations(data);
            } else {
                console.error("Failed to load organizations:", data.error || "Unknown error");
                setOrganizations([]);
            }
        } catch (error) {
            console.error("Failed to load organizations:", error);
            setOrganizations([]);
        }
    };

    const loadMemberships = async () => {
        try {
            const res = await fetch("/api/organization-membership");
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setMemberships(data);
            } else {
                console.error("Failed to load memberships:", data.error || "Unknown error");
                setMemberships([]);
            }
        } catch (error) {
            console.error("Failed to load memberships:", error);
            setMemberships([]);
        }
    };

    const loadUsers = async () => {
        try {
            const res = await fetch("/api/users");
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users:", error);
        }
    };

    const createOrganization = async () => {
        if (!orgName) return;
        setLoading(true);
        try {
            await fetch("/api/organization", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: orgName }),
            });
            setOrgName("");
            await loadOrganizations();
        } catch (error) {
            console.error("Failed to create organization:", error);
        } finally {
            setLoading(false);
        }
    };

    const addMembership = async () => {
        if (!selectedOrg || !selectedUser) return;
        setLoading(true);
        try {
            await fetch("/api/organization-membership", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organization_id: selectedOrg,
                    user_id: selectedUser,
                    role,
                }),
            });
            setSelectedOrg("");
            setSelectedUser("");
            setRole("patient");
            await loadMemberships();
        } catch (error) {
            console.error("Failed to add membership:", error);
        } finally {
            setLoading(false);
        }
    };

    const deleteMembership = async (id: string) => {
        if (!confirm("Remove this membership?")) return;
        try {
            await fetch(`/api/organization-membership?id=${id}`, { method: "DELETE" });
            await loadMemberships();
        } catch (error) {
            console.error("Failed to delete membership:", error);
        }
    };

    useEffect(() => {
        loadOrganizations();
        loadMemberships();
        loadUsers();
    }, []);

    return (
        <div className="space-y-8">
            {/* Create Organization */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Create Organization</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Organization Name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="flex-1 p-2 border rounded"
                    />
                    <button
                        onClick={createOrganization}
                        disabled={loading || !orgName}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
                    >
                        {loading ? "Creating..." : "Create"}
                    </button>
                </div>
            </div>

            {/* Organizations List */}
            {organizations.length > 0 && <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Organizations ({organizations.length})</h3>
                <table className="w-full border">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-2 text-left">Name</th>
                            <th className="p-2 text-left">Created</th>
                            <th className="p-2 text-left">ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {organizations.map((org) => (
                            <tr key={org.id} className="border-t">
                                <td className="p-2">{org.name}</td>
                                <td className="p-2 text-sm text-gray-600">
                                    {new Date(org.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-2 text-xs text-gray-500 font-mono">
                                    {org.id.slice(0, 8)}...
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>}

            {/* Add Membership */}
            {organizations.length > 0 && <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Add Organization Membership</h2>
                <div className="grid grid-cols-3 gap-4">
                    <select
                        value={selectedOrg}
                        onChange={(e) => setSelectedOrg(e.target.value)}
                        className="p-2 border rounded"
                    >
                        <option value="">Select Organization</option>
                        {organizations.length > 0 ? organizations.map((org) => (
                            <option key={org.id} value={org.id}>
                                {org.name}
                            </option>
                        )) : (
                            <option value="">No organizations found</option>
                        )}
                    </select>
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="p-2 border rounded"
                    >
                        <option value="">Select User</option>
                        {users.length > 0 ? users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.first_name} {user.last_name} ({user.email})
                            </option>
                        )) : (
                            <option value="">No users found</option>
                        )}
                    </select>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as "admin" | "patient")}
                        className="p-2 border rounded"
                    >
                        <option value="patient">Patient</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <button
                    onClick={addMembership}
                    disabled={loading || !selectedOrg || !selectedUser}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
                >
                    {loading ? "Adding..." : "Add Membership"}
                </button>
            </div>}

            {/* Memberships List */}
            {memberships.length > 0 && <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Memberships ({memberships.length})</h3>
                <table className="w-full border">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-2 text-left">Organization</th>
                            <th className="p-2 text-left">User</th>
                            <th className="p-2 text-left">Role</th>
                            <th className="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {memberships.length > 0 ? memberships.map((membership) => (
                            <tr key={membership.id} className="border-t">
                                <td className="p-2">{membership.organizations?.name || "N/A"}</td>
                                <td className="p-2">
                                    {membership.profiles
                                        ? `${membership.profiles.first_name} ${membership.profiles.last_name}`
                                        : "N/A"}
                                </td>
                                <td className="p-2">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                        {membership.role}
                                    </span>
                                </td>
                                <td className="p-2 text-center">
                                    <button
                                        onClick={() => deleteMembership(membership.id)}
                                        className="text-red-600 hover:underline"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="p-2 text-center">
                                    No memberships found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>}
        </div>
    );
}
