"use client";

import CalendlyReset from "@/components/CalendlyReset";
import Header from "@/components/Header";

export default function CalendlyResetPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Calendly Reset</h2>
          <CalendlyReset />
        </div>
      </div>
    </>
  );
}
