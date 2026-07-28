"use client";

import Header from "@/components/Header";
import TalonOneEvents from "@/components/TalonOneEvents";

export default function TalonOnePage() {
    return (
        <>
            <Header />
            <div className="min-h-screen p-8">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">TalonOne</h2>
                    <TalonOneEvents />
                </div>
            </div>
        </>
    );
}
