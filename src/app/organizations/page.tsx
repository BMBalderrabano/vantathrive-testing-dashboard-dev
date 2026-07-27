"use client";

import Header from "@/components/Header";
import OrganizationsTab from "@/components/OrganizationsTab";

export default function OrganizationsPage() {
    return (
        <>
            <Header />
            <div className="min-h-screen p-8">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">Organizations</h2>
                    <OrganizationsTab />
                </div>
            </div>
        </>
    );
}

