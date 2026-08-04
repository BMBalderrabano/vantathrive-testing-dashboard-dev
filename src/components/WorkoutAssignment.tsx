"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAssignProgramOptions,
  assignProgram,
  clearProgram,
} from "@/lib/api";
import type {
  AssignableProgramTemplate,
  UserProgramAssignment,
} from "@/lib/types";
import { useQaContext } from "@/context/qa-context";

interface ProgramAssignmentProps {
  selectedUserId: string;
  onDataUpdate: () => Promise<void>;
}

export default function ProgramAssignment({
  selectedUserId,
  onDataUpdate,
}: ProgramAssignmentProps) {
  const { selectedOrgId } = useQaContext();
  const [templates, setTemplates] = useState<AssignableProgramTemplate[]>([]);
  const [activeAssignment, setActiveAssignment] =
    useState<UserProgramAssignment | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAssignProgramOptions({
        organizationId: selectedOrgId,
        userId: selectedUserId,
      });
      setTemplates(data.templates);
      setActiveAssignment(data.active_assignment);

      const assignable = data.templates.filter((t) => t.has_template_assignment);
      setSelectedTemplateId((current) => {
        if (current && assignable.some((t) => t.id === current)) {
          return current;
        }
        return assignable.length === 1 ? assignable[0].id : "";
      });
    } catch (error) {
      console.error("Failed to load program templates:", error);
      setMessage(
        `❌ ${error instanceof Error ? error.message : "Failed to load templates"}`
      );
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, selectedUserId]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const assignableTemplates = templates.filter((t) => t.has_template_assignment);

  const handleSubmit = async () => {
    if (!selectedTemplateId) {
      alert("Select a program template");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const result = await assignProgram({
        user_id: selectedUserId,
        program_template_id: selectedTemplateId,
        start_date: startDate,
        organization_id: selectedOrgId ?? undefined,
      });

      setMessage(`✅ ${result.message}`);
      await Promise.all([loadOptions(), onDataUpdate()]);
    } catch (error) {
      console.error("Failed to assign program:", error);
      setMessage(
        `❌ ${error instanceof Error ? error.message : "Failed to assign program"}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    const confirmed = window.confirm(
      "Clear active program assignment(s) for this user? Pre-program assignments will be kept."
    );
    if (!confirmed) return;

    setClearing(true);
    setMessage("");
    try {
      const result = await clearProgram(selectedUserId);
      setMessage(`✅ ${result.message ?? "Program cleared"}`);
      await Promise.all([loadOptions(), onDataUpdate()]);
    } catch (error) {
      console.error("Failed to clear program:", error);
      setMessage(
        `❌ ${error instanceof Error ? error.message : "Failed to clear program"}`
      );
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">🏋️ Assign Program</h2>

      {selectedOrgId && (
        <p className="text-sm text-gray-600 mb-4">
          Showing templates for the header-selected organization. Clear the org
          filter to see all templates.
        </p>
      )}

      {activeAssignment && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-1">Current assignment</h3>
          <p className="text-sm text-green-700">
            {activeAssignment.program_template?.name ?? "Program"} —{" "}
            {activeAssignment.start_date ?? "?"} to{" "}
            {activeAssignment.end_date ?? "?"}
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Program template
        </label>
        <select
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          disabled={loading || assignableTemplates.length === 0}
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        >
          <option value="">
            {loading
              ? "Loading templates..."
              : assignableTemplates.length === 0
                ? "No assignable templates found"
                : "Select a template..."}
          </option>
          {assignableTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.weeks} wk
              {template.weeks !== 1 ? "s" : ""}
              {template.organization_name
                ? ` — ${template.organization_name}`
                : ""}
              )
            </option>
          ))}
        </select>
        {templates.some((t) => !t.has_template_assignment) && (
          <p className="text-xs text-amber-700 mt-1">
            Templates without a builder schedule (status=template assignment) are
            hidden. Create/edit them under Programs.
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Start date
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {selectedTemplate && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Summary</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Template: {selectedTemplate.name}</p>
            <p>• Duration: {selectedTemplate.weeks} week(s)</p>
            <p>• Start: {startDate}</p>
            {selectedTemplate.organization_name && (
              <p>• Org: {selectedTemplate.organization_name}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={handleSubmit}
          disabled={
            submitting ||
            loading ||
            !selectedTemplateId ||
            assignableTemplates.length === 0
          }
          className="col-span-3 w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
        >
          {submitting ? "Assigning..." : "🏋️ Assign Program"}
        </button>
        <button
          onClick={handleClear}
          disabled={clearing || loading}
          className="col-span-1 w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors font-medium"
        >
          {clearing ? "Clearing..." : "🧹 Clear"}
        </button>
      </div>

      {message && (
        <p
          className={`mt-3 text-sm font-medium ${
            message.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      <div className="mt-3 text-xs text-gray-500">
        Assigns a <code className="bg-gray-100 px-1 rounded">program_template</code>{" "}
        to the header-selected user via an active{" "}
        <code className="bg-gray-100 px-1 rounded">program_assignment</code> row
        (copied from the template&apos;s builder schedule). Gate checks are skipped
        for QA.
      </div>
    </div>
  );
}
