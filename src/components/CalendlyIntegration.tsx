"use client";

import { useState, useEffect, useCallback } from "react";
import { Appointment } from "@/lib/types";
import {
  cancelAppointment,
  forceDeleteAppointment,
  forceInsertAppointment,
  markAppointmentAsAttended,
  rescheduleAppointment,
} from "@/lib/api";

interface CalendlyIntegrationProps {
  selectedUserId?: string;
  selectedUserName?: string;
  onModalClose?: () => Promise<void>;
  onDataUpdate?: () => Promise<void>;
  initialTab?: "screening" | "consultation" | "reschedule" | null;
  rescheduleUrl?: string;
  onTabChange?: () => void;
}

type OnboardingAppointmentType =
  | "onboarding_screening"
  | "onboarding_consultation";

const ONBOARDING_TYPES: OnboardingAppointmentType[] = [
  "onboarding_screening",
  "onboarding_consultation",
];

function formatDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatAppointmentType(type: string): string {
  if (type === "onboarding_screening") return "Screening";
  if (type === "onboarding_consultation") return "Consultation";
  return type;
}

function formatDisplayDate(value?: string): string {
  if (!value) return "No start time";
  return new Date(value).toLocaleString();
}

export default function CalendlyIntegration({
  selectedUserId,
  selectedUserName,
  onModalClose,
  onDataUpdate,
  initialTab = null,
  rescheduleUrl,
  onTabChange,
}: CalendlyIntegrationProps) {
  const [activeTab, setActiveTab] = useState<
    "screening" | "consultation" | "reschedule" | null
  >(initialTab);
  const [lastInitialTab, setLastInitialTab] = useState<
    "screening" | "consultation" | "reschedule" | null
  >(initialTab);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [insertStartTime, setInsertStartTime] = useState("");
  const [insertingType, setInsertingType] =
    useState<OnboardingAppointmentType | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelModalAppointment, setCancelModalAppointment] =
    useState<Appointment | null>(null);
  const [rescheduleModalType, setRescheduleModalType] =
    useState<OnboardingAppointmentType | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [markingAttendedId, setMarkingAttendedId] = useState<number | null>(
    null
  );
  const [reschedulingType, setReschedulingType] =
    useState<OnboardingAppointmentType | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!selectedUserId) {
      setAppointments([]);
      return;
    }

    setLoadingAppointments(true);
    try {
      const response = await fetch(`/api/appointments/${selectedUserId}`);
      if (!response.ok) {
        throw new Error("Failed to load appointments");
      }

      const data: Appointment[] = await response.json();
      setAppointments(
        data.filter((appointment) =>
          ONBOARDING_TYPES.includes(appointment.type as OnboardingAppointmentType)
        )
      );
    } catch (error) {
      console.error("Failed to load appointments:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to load appointments"
      );
    } finally {
      setLoadingAppointments(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    const defaultStart = new Date();
    defaultStart.setMinutes(defaultStart.getMinutes() + 1);
    setInsertStartTime(formatDateTimeLocal(defaultStart));
    setActionMessage(null);
    setActionError(null);
    void loadAppointments();
  }, [selectedUserId, loadAppointments]);

  useEffect(() => {
    if (initialTab !== null && initialTab !== lastInitialTab) {
      setActiveTab(initialTab);
      setLastInitialTab(initialTab);
      if (onTabChange) {
        onTabChange();
      }
    }
  }, [initialTab, lastInitialTab, onTabChange]);

  const screeningUrl = `https://calendly.com/devsvc-medvanta/screening?utm_term=${selectedUserId}&utm_content=onboarding_screening`;
  const consultationUrl = `https://calendly.com/devsvc-medvanta/consultation?utm_term=${selectedUserId}&utm_content=onboarding_consultation`;

  const hasScheduledOfType = (type: OnboardingAppointmentType) =>
    appointments.some(
      (appointment) =>
        appointment.type === type && appointment.status === "scheduled"
    );

  const hasAnyOfType = (type: OnboardingAppointmentType) =>
    appointments.some((appointment) => appointment.type === type);

  const refreshAfterMutation = async () => {
    await loadAppointments();
    if (onDataUpdate) {
      await onDataUpdate();
    }
  };

  const handleCloseModal = async () => {
    setActiveTab(null);
    if (onModalClose) {
      await onModalClose();
    }
  };

  const handleForceInsert = async (insertType: OnboardingAppointmentType) => {
    if (!selectedUserId || !insertStartTime) return;

    setInsertingType(insertType);
    setActionMessage(null);
    setActionError(null);

    try {
      const startDate = new Date(insertStartTime);
      const result = await forceInsertAppointment({
        user_id: selectedUserId,
        appointment_type: insertType,
        start_time: startDate.toISOString(),
      });

      if (!result.success) {
        setActionError(result.error || "Failed to insert appointment");
        return;
      }

      setActionMessage(
        result.message ||
          `Inserted ${formatAppointmentType(insertType)} appointment`
      );
      await refreshAfterMutation();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to insert appointment"
      );
    } finally {
      setInsertingType(null);
    }
  };

  const handleMarkAsAttended = async (appointment: Appointment) => {
    setMarkingAttendedId(appointment.id);
    setActionMessage(null);
    setActionError(null);

    try {
      const result = await markAppointmentAsAttended(appointment.id);

      if (!result.success) {
        setActionError(result.error || "Failed to mark appointment as attended");
        return;
      }

      setActionMessage(
        result.message ||
          `Marked ${formatAppointmentType(appointment.type)} as attended`
      );
      await refreshAfterMutation();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to mark appointment as attended"
      );
    } finally {
      setMarkingAttendedId(null);
    }
  };

  const isAppointmentActionInProgress = (appointmentId: number) =>
    deletingId === appointmentId ||
    cancellingId === appointmentId ||
    markingAttendedId === appointmentId;

  const openCancelModal = (appointment: Appointment) => {
    setCancelModalAppointment(appointment);
    setCancellationReason("");
    setActionMessage(null);
    setActionError(null);
  };

  const closeCancelModal = () => {
    if (cancellingId !== null) return;
    setCancelModalAppointment(null);
    setCancellationReason("");
  };

  const openRescheduleModal = (type: OnboardingAppointmentType) => {
    setRescheduleModalType(type);
    setActionMessage(null);
    setActionError(null);
  };

  const closeRescheduleModal = () => {
    if (reschedulingType !== null) return;
    setRescheduleModalType(null);
  };

  const handleRescheduleAppointment = async () => {
    if (!selectedUserId || !rescheduleModalType || !insertStartTime) return;

    setReschedulingType(rescheduleModalType);
    setActionMessage(null);
    setActionError(null);

    try {
      const startDate = new Date(insertStartTime);
      const result = await rescheduleAppointment({
        user_id: selectedUserId,
        appointment_type: rescheduleModalType,
        start_time: startDate.toISOString(),
      });

      if (!result.success) {
        setActionError(result.error || "Failed to reschedule appointment");
        return;
      }

      setActionMessage(
        result.message ||
          `Rescheduled ${formatAppointmentType(rescheduleModalType)} appointment`
      );
      setRescheduleModalType(null);
      await refreshAfterMutation();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to reschedule appointment"
      );
    } finally {
      setReschedulingType(null);
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancelModalAppointment) return;

    const reason = cancellationReason.trim();
    if (!reason) {
      setActionError("Please provide a cancellation reason");
      return;
    }

    setCancellingId(cancelModalAppointment.id);
    setActionMessage(null);
    setActionError(null);

    try {
      const result = await cancelAppointment({
        appointmentId: cancelModalAppointment.id,
        cancellation_reason: reason,
      });

      if (!result.success) {
        setActionError(result.error || "Failed to cancel appointment");
        return;
      }

      setActionMessage(
        result.message ||
          `Canceled ${formatAppointmentType(cancelModalAppointment.type)} appointment`
      );
      setCancelModalAppointment(null);
      setCancellationReason("");
      await refreshAfterMutation();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to cancel appointment"
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleForceDelete = async (appointment: Appointment) => {
    const confirmed = window.confirm(
      `Delete ${formatAppointmentType(appointment.type)} appointment?\n\nStatus: ${appointment.status}\nStart: ${formatDisplayDate(appointment.start_time)}\nID: ${appointment.id}\n\nThis permanently removes the row.`
    );

    if (!confirmed) return;

    setDeletingId(appointment.id);
    setActionMessage(null);
    setActionError(null);

    try {
      const result = await forceDeleteAppointment(appointment.id);

      if (!result.success) {
        setActionError(result.error || "Failed to delete appointment");
        return;
      }

      setActionMessage(result.message || "Appointment deleted");
      await refreshAfterMutation();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to delete appointment"
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!selectedUserId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8 text-gray-500">
          <div className="text-lg font-medium mb-2">Calendly Integration</div>
          <div className="text-sm">Please select a user to book appointments</div>
        </div>
      </div>
    );
  }

  return (
    <div id="calendly-integration" className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Book Appointments</h2>
        <div className="text-sm text-gray-600">
          For: {selectedUserName || "Selected User"}
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-amber-900">
          Force Insert Appointment (Testing)
        </h3>
        <label className="mb-3 block text-sm text-gray-700">
          <span className="mb-1 block font-medium">Start time</span>
          <input
            type="datetime-local"
            value={insertStartTime}
            onChange={(event) => setInsertStartTime(event.target.value)}
            className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => void handleForceInsert("onboarding_screening")}
            disabled={
              insertingType !== null ||
              !insertStartTime ||
              hasScheduledOfType("onboarding_screening")
            }
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {insertingType === "onboarding_screening"
              ? "Inserting..."
              : "Force Insert Screening"}
          </button>
          <button
            onClick={() => void handleForceInsert("onboarding_consultation")}
            disabled={
              insertingType !== null ||
              !insertStartTime ||
              hasScheduledOfType("onboarding_consultation")
            }
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
          >
            {insertingType === "onboarding_consultation"
              ? "Inserting..."
              : "Force Insert Consultation"}
          </button>
          <button
            onClick={() => openRescheduleModal("onboarding_screening")}
            disabled={
              insertingType !== null ||
              reschedulingType !== null ||
              !insertStartTime ||
              !hasAnyOfType("onboarding_screening")
            }
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
          >
            {reschedulingType === "onboarding_screening"
              ? "Rescheduling..."
              : "Reschedule Screening"}
          </button>
          <button
            onClick={() => openRescheduleModal("onboarding_consultation")}
            disabled={
              insertingType !== null ||
              reschedulingType !== null ||
              !insertStartTime ||
              !hasAnyOfType("onboarding_consultation")
            }
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
          >
            {reschedulingType === "onboarding_consultation"
              ? "Rescheduling..."
              : "Reschedule Consultation"}
          </button>
        </div>
        {(hasScheduledOfType("onboarding_screening") ||
          hasScheduledOfType("onboarding_consultation")) && (
          <p className="mt-3 text-xs text-amber-800">
            Force insert buttons are disabled when the user already has a scheduled appointment
            of that type. Cancel, delete, mark as attended, or reschedule first.
          </p>
        )}
        {(!hasAnyOfType("onboarding_screening") ||
          !hasAnyOfType("onboarding_consultation")) && (
          <p className="mt-3 text-xs text-amber-800">
            Reschedule buttons are enabled when at least one appointment of that type exists.
          </p>
        )}
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Onboarding Appointments
          </h3>
          <button
            onClick={() => void loadAppointments()}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>

        {loadingAppointments ? (
          <p className="text-sm text-gray-500">Loading appointments...</p>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-gray-500">
            No screening or consultation appointments for this user.
          </p>
        ) : (
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="text-sm text-gray-700">
                  <div className="font-medium text-gray-900">
                    {formatAppointmentType(appointment.type)} ·{" "}
                    <span className="capitalize">{appointment.status}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    ID {appointment.id} ·{" "}
                    {formatDisplayDate(appointment.start_time)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {appointment.status === "scheduled" && (
                    <>
                      <button
                        onClick={() => void handleMarkAsAttended(appointment)}
                        disabled={isAppointmentActionInProgress(appointment.id)}
                        className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {markingAttendedId === appointment.id
                          ? "Marking..."
                          : "Mark as Attended"}
                      </button>
                      <button
                        onClick={() => openCancelModal(appointment)}
                        disabled={isAppointmentActionInProgress(appointment.id)}
                        className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cancellingId === appointment.id
                          ? "Canceling..."
                          : "Cancel"}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => void handleForceDelete(appointment)}
                    disabled={isAppointmentActionInProgress(appointment.id)}
                    className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === appointment.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rescheduleModalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeRescheduleModal();
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Reschedule {formatAppointmentType(rescheduleModalType)}
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              New start time:{" "}
              {insertStartTime
                ? new Date(insertStartTime).toLocaleString()
                : "Not set"}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeRescheduleModal}
                disabled={reschedulingType !== null}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
              <button
                onClick={() => void handleRescheduleAppointment()}
                disabled={reschedulingType !== null || !insertStartTime}
                className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
              >
                {reschedulingType !== null ? "Rescheduling..." : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModalAppointment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCancelModal();
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Cancel Appointment
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              {formatAppointmentType(cancelModalAppointment.type)} · ID{" "}
              {cancelModalAppointment.id} ·{" "}
              {formatDisplayDate(cancelModalAppointment.start_time)}
            </p>
            <label className="mb-4 block text-sm text-gray-700">
              <span className="mb-1 block font-medium">Cancellation reason</span>
              <textarea
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
                rows={4}
                placeholder="Why is this appointment being canceled?"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                disabled={cancellingId !== null}
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeCancelModal}
                disabled={cancellingId !== null}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
              <button
                onClick={() => void handleCancelAppointment()}
                disabled={
                  cancellingId !== null || cancellationReason.trim().length === 0
                }
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
              >
                {cancellingId !== null ? "Canceling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMessage && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {actionError}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() =>
            activeTab === "screening"
              ? void handleCloseModal()
              : setActiveTab("screening")
          }
          className={`rounded-lg px-6 py-3 font-medium transition-all duration-200 ${
            activeTab === "screening"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          }`}
        >
          📋 Screening Appointment
        </button>
        <button
          onClick={() =>
            activeTab === "consultation"
              ? void handleCloseModal()
              : setActiveTab("consultation")
          }
          className={`rounded-lg px-6 py-3 font-medium transition-all duration-200 ${
            activeTab === "consultation"
              ? "bg-green-600 text-white shadow-md"
              : "bg-green-100 text-green-700 hover:bg-green-200"
          }`}
        >
          🩺 Consultation Appointment
        </button>
        {rescheduleUrl && (
          <button
            onClick={() =>
              activeTab === "reschedule"
                ? void handleCloseModal()
                : setActiveTab("reschedule")
            }
            className={`rounded-lg px-4 py-3 font-medium transition-all duration-200 ${
              activeTab === "reschedule"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            }`}
          >
            🔄 Reschedule Appointment
          </button>
        )}
      </div>

      {activeTab && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                {activeTab === "screening"
                  ? "Screening Appointment"
                  : activeTab === "consultation"
                    ? "Consultation Appointment"
                    : "Reschedule Appointment"}
              </h3>
              <button
                onClick={() => void handleCloseModal()}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div className="h-96">
            <iframe
              src={
                activeTab === "screening"
                  ? screeningUrl
                  : activeTab === "consultation"
                    ? consultationUrl
                    : rescheduleUrl || consultationUrl
              }
              width="100%"
              height="100%"
              frameBorder="0"
              title={
                activeTab === "screening"
                  ? "Screening Appointment Booking"
                  : activeTab === "consultation"
                    ? "Consultation Appointment Booking"
                    : "Reschedule Appointment"
              }
              className="border-0"
            />
          </div>

          <div className="bg-gray-50 px-4 py-2 border-t">
            <div className="text-xs text-gray-600">
              Powered by{" "}
              <a
                href={
                  activeTab === "screening"
                    ? screeningUrl
                    : activeTab === "consultation"
                      ? consultationUrl
                      : rescheduleUrl || consultationUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Calendly
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
