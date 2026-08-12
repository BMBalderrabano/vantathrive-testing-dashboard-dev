"use client";

import { useState } from "react";
import { useQaContext } from "@/context/qa-context";
import {
  TALON_EVENT_TYPES,
  trackTalonEvent,
  type TalonEventType,
} from "@/lib/api";

interface TalonEventResult {
  status: number;
  body: unknown;
  type: TalonEventType;
  advanceWeek?: boolean;
  at: string;
}

const STANDARD_EVENT_TYPES = TALON_EVENT_TYPES.filter(
  (type) => type !== "qa_advance_time",
);

export default function TalonOneEvents() {
  const { selectedUserId, isHydrated } = useQaContext();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TalonEventResult | null>(null);

  const profileId = isHydrated ? selectedUserId : "";
  const buttonsDisabled = !profileId || loadingKey !== null;

  const handleFireEvent = async (
    type: TalonEventType,
    options?: { advanceWeek?: boolean },
  ) => {
    if (!profileId) return;

    const loadingId =
      type === "qa_advance_time"
        ? options?.advanceWeek
          ? "qa_advance_time:week"
          : "qa_advance_time:day"
        : type;

    setLoadingKey(loadingId);

    try {
      const { status, body } = await trackTalonEvent(profileId, type, options);
      setLastResult({
        status,
        body,
        type,
        advanceWeek: options?.advanceWeek,
        at: new Date().toISOString(),
      });
    } catch (err) {
      setLastResult({
        status: 0,
        body: { error: err instanceof Error ? err.message : String(err) },
        type,
        advanceWeek: options?.advanceWeek,
        at: new Date().toISOString(),
      });
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Talon.One Events</h2>
        <div className="text-sm text-gray-600">
          {profileId ? (
            <>profileId: {profileId}</>
          ) : (
            <>Choose a Test user in the header</>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {profileId && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800">Testing Mode</div>
              <div className="text-xs text-blue-600 mt-1">
                profileId: {profileId}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STANDARD_EVENT_TYPES.map((type) => {
              const isActive = loadingKey === type;
              const isReset = type === "reset_user";
              const label = isReset ? "reset" : type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleFireEvent(type)}
                  disabled={buttonsDisabled}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                    buttonsDisabled
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : isReset
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isActive ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Sending...
                    </span>
                  ) : (
                    label
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => handleFireEvent("qa_advance_time")}
              disabled={buttonsDisabled}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                buttonsDisabled
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loadingKey === "qa_advance_time:day" ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </span>
              ) : (
                "qa_advance_time (day)"
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                handleFireEvent("qa_advance_time", { advanceWeek: true })
              }
              disabled={buttonsDisabled}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                buttonsDisabled
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loadingKey === "qa_advance_time:week" ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </span>
              ) : (
                "qa_advance_time (day+week)"
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Response:</h3>
          <div className="bg-gray-50 border rounded-lg p-4 min-h-[200px]">
            {lastResult ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Status:</span> {lastResult.status}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Event:</span> {lastResult.type}
                  {lastResult.type === "qa_advance_time"
                    ? lastResult.advanceWeek
                      ? " (day+week)"
                      : " (day)"
                    : null}
                </div>
                <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                  {JSON.stringify(lastResult.body, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-gray-400 text-sm italic">
                Fire an event to see the response
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
