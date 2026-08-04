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
  at: string;
}

export default function TalonOneEvents() {
  const { selectedUserId, isHydrated } = useQaContext();
  const [loadingType, setLoadingType] = useState<TalonEventType | null>(null);
  const [lastResult, setLastResult] = useState<TalonEventResult | null>(null);

  const profileId = isHydrated ? selectedUserId : "";
  const buttonsDisabled = !profileId || loadingType !== null;

  const handleFireEvent = async (type: TalonEventType) => {
    if (!profileId) return;

    setLoadingType(type);

    try {
      const { status, body } = await trackTalonEvent(profileId, type);
      setLastResult({
        status,
        body,
        type,
        at: new Date().toISOString(),
      });
    } catch (err) {
      setLastResult({
        status: 0,
        body: { error: err instanceof Error ? err.message : String(err) },
        type,
        at: new Date().toISOString(),
      });
    } finally {
      setLoadingType(null);
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
              <div className="text-xs text-blue-600 mt-2">
                Home Advance Time also fires{" "}
                <code className="bg-blue-100 px-1 rounded">qa_advance_loyalty_expiry</code>{" "}
                (expiry rules must exist in Campaign Manager).
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TALON_EVENT_TYPES.map((type) => {
              const isActive = loadingType === type;
              const isReset = type === "reset_user";
              const isQaExpiry = type === "qa_advance_loyalty_expiry";
              const label = isReset
                ? "reset"
                : isQaExpiry
                  ? "qa_advance_loyalty_expiry (now)"
                  : type;

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
