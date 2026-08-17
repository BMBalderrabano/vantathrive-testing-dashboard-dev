"use client";

import { useCallback, useEffect, useState } from "react";
import { useQaContext } from "@/context/qa-context";
import {
  TALON_EVENT_TYPES,
  TALON_V2_CAMPAIGN_LABELS,
  advanceTimeV2,
  assignProgramV2,
  completeExerciseV2,
  getAssignProgramOptions,
  getTalonV2TodayExercises,
  trackTalonEvent,
  trackTalonV2Event,
  type TalonEventType,
  type TalonV2TodayExercise,
} from "@/lib/api";
import type { AssignableProgramTemplate } from "@/lib/types";

interface TalonEventResult {
  status: number;
  body: unknown;
  label: string;
  at: string;
}

const STANDARD_EVENT_TYPES = TALON_EVENT_TYPES.filter(
  (type) => type !== "qa_advance_time",
);

const V2_SIMPLE_TYPES = ["onboarded", "reset_user"] as const;

export default function TalonOneEvents() {
  const { selectedUserId, selectedOrgId, isHydrated } = useQaContext();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TalonEventResult | null>(null);

  const [todayExercises, setTodayExercises] = useState<TalonV2TodayExercise[]>(
    [],
  );
  const [todayMeta, setTodayMeta] = useState<{
    localDate: string;
    timezone: string;
    detail?: string;
  } | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | "">(
    "",
  );
  const [exercisesLoading, setExercisesLoading] = useState(false);

  const [templates, setTemplates] = useState<AssignableProgramTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [needsAssign, setNeedsAssign] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  const profileId = isHydrated ? selectedUserId : "";
  const buttonsDisabled = !profileId || loadingKey !== null;

  const refreshTodayExercises = useCallback(async () => {
    if (!profileId) {
      setTodayExercises([]);
      setTodayMeta(null);
      setSelectedExerciseId("");
      return;
    }
    setExercisesLoading(true);
    try {
      const data = await getTalonV2TodayExercises(profileId);
      setTodayExercises(data.exercises);
      setTodayMeta({
        localDate: data.localDate,
        timezone: data.timezone,
        detail: data.detail,
      });
      setSelectedExerciseId((current) => {
        if (
          typeof current === "number" &&
          data.exercises.some((e) => e.exerciseId === current)
        ) {
          return current;
        }
        return data.exercises.length === 1 ? data.exercises[0].exerciseId : "";
      });
    } catch (error) {
      console.warn("Failed to load today's exercises:", error);
      setTodayExercises([]);
      setTodayMeta(null);
      setSelectedExerciseId("");
    } finally {
      setExercisesLoading(false);
    }
  }, [profileId]);

  const refreshAssignOptions = useCallback(async () => {
    if (!profileId) {
      setTemplates([]);
      setNeedsAssign(false);
      setSelectedTemplateId("");
      return;
    }
    setAssignLoading(true);
    try {
      const data = await getAssignProgramOptions({
        organizationId: selectedOrgId,
        userId: profileId,
      });
      setTemplates(data.templates.filter((t) => t.has_template_assignment));
      setNeedsAssign(!data.active_assignment);
      setSelectedTemplateId((current) => {
        const assignable = data.templates.filter((t) => t.has_template_assignment);
        if (current && assignable.some((t) => t.id === current)) return current;
        return assignable.length === 1 ? assignable[0].id : "";
      });
    } catch (error) {
      console.warn("Failed to load assign-program options:", error);
      setTemplates([]);
      setNeedsAssign(true);
    } finally {
      setAssignLoading(false);
    }
  }, [profileId, selectedOrgId]);

  useEffect(() => {
    void refreshTodayExercises();
    void refreshAssignOptions();
  }, [refreshTodayExercises, refreshAssignOptions]);

  const setResult = (label: string, status: number, body: unknown) => {
    setLastResult({
      status,
      body,
      label,
      at: new Date().toISOString(),
    });
  };

  const handleFireV1 = async (
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
      setResult(
        type === "qa_advance_time"
          ? options?.advanceWeek
            ? "V1 qa_advance_time (day+week)"
            : "V1 qa_advance_time (day)"
          : `V1 ${type}`,
        status,
        body,
      );
    } catch (err) {
      setResult(
        `V1 ${type}`,
        0,
        { error: err instanceof Error ? err.message : String(err) },
      );
    } finally {
      setLoadingKey(null);
    }
  };

  const handleV2Simple = async (type: "onboarded" | "reset_user") => {
    if (!profileId) return;
    setLoadingKey(`v2:${type}`);
    try {
      const { status, body } = await trackTalonV2Event(profileId, type);
      setResult(`V2 ${TALON_V2_CAMPAIGN_LABELS[type]}`, status, body);
    } catch (err) {
      setResult(`V2 ${type}`, 0, {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoadingKey(null);
    }
  };

  const handleV2Assign = async () => {
    if (!profileId) return;
    if (needsAssign && !selectedTemplateId) {
      setResult("V2 Assign Program (84)", 0, {
        error: "Select a program template to assign (Monday start in profile TZ)",
      });
      return;
    }
    setLoadingKey("v2:program_change");
    try {
      const { status, body } = await assignProgramV2(profileId, {
        program_template_id: needsAssign ? selectedTemplateId : undefined,
        organization_id: selectedOrgId ?? undefined,
      });
      setResult("V2 Assign Program (84)", status, body);
      await refreshAssignOptions();
    } catch (err) {
      setResult("V2 Assign Program (84)", 0, {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoadingKey(null);
    }
  };

  const handleV2Advance = async () => {
    if (!profileId) return;
    setLoadingKey("v2:qa_advance_time");
    try {
      const { status, body } = await advanceTimeV2(profileId);
      setResult("V2 Advance Time (83)", status, body);
    } catch (err) {
      setResult("V2 Advance Time (83)", 0, {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoadingKey(null);
    }
  };

  const handleV2Complete = async () => {
    if (!profileId || typeof selectedExerciseId !== "number") return;
    setLoadingKey("v2:exercise_completed");
    try {
      const { status, body } = await completeExerciseV2(
        profileId,
        selectedExerciseId,
      );
      setResult("V2 Complete Exercise (82)", status, body);
      await refreshTodayExercises();
    } catch (err) {
      setResult("V2 Complete Exercise (82)", 0, {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoadingKey(null);
    }
  };

  const completeDisabled =
    buttonsDisabled ||
    exercisesLoading ||
    todayExercises.length === 0 ||
    typeof selectedExerciseId !== "number";

  const assignDisabled =
    buttonsDisabled ||
    assignLoading ||
    (needsAssign && !selectedTemplateId);

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
        <div className="space-y-8">
          {profileId && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800">Testing Mode</div>
              <div className="text-xs text-blue-600 mt-1">
                profileId: {profileId}
              </div>
            </div>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              V1 — app 1 / TALON_ONE_VANTATHRIVE_DEV
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STANDARD_EVENT_TYPES.map((type) => {
                const isActive = loadingKey === type;
                const isReset = type === "reset_user";
                const label = isReset ? "reset" : type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleFireV1(type)}
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
                onClick={() => handleFireV1("qa_advance_time")}
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
                  handleFireV1("qa_advance_time", { advanceWeek: true })
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
          </section>

          <section className="space-y-3 border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              V2 — app 2 / TALON_ONE_VANTATHRIVE_DEV_2 (VP only)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {V2_SIMPLE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleV2Simple(type)}
                  disabled={buttonsDisabled}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                    buttonsDisabled
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : type === "reset_user"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-emerald-700 text-white hover:bg-emerald-800"
                  }`}
                >
                  {loadingKey === `v2:${type}`
                    ? "Sending..."
                    : TALON_V2_CAMPAIGN_LABELS[type]}
                </button>
              ))}

              <button
                type="button"
                onClick={() => void handleV2Advance()}
                disabled={buttonsDisabled}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  buttonsDisabled
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-emerald-700 text-white hover:bg-emerald-800"
                }`}
              >
                {loadingKey === "v2:qa_advance_time"
                  ? "Advancing 168h + Talon..."
                  : TALON_V2_CAMPAIGN_LABELS.qa_advance_time}
              </button>
            </div>

            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 space-y-2">
              <div className="text-sm font-medium text-emerald-900">
                {TALON_V2_CAMPAIGN_LABELS.program_change}
              </div>
              {needsAssign ? (
                <>
                  <p className="text-xs text-emerald-800">
                    No active assignment — pick a template (start = Monday in
                    profile TZ), then fire.
                  </p>
                  <select
                    className="w-full border rounded-md px-2 py-1.5 text-sm"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    disabled={buttonsDisabled || assignLoading || templates.length === 0}
                  >
                    <option value="">
                      {assignLoading
                        ? "Loading templates..."
                        : templates.length === 0
                          ? "No assignable templates"
                          : "Select program template"}
                    </option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.organization_name ? ` (${t.organization_name})` : ""}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <p className="text-xs text-emerald-800">
                  Active assignment found — will send program_change with its
                  start_date only.
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleV2Assign()}
                disabled={assignDisabled}
                className={`w-full px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  assignDisabled
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-emerald-700 text-white hover:bg-emerald-800"
                }`}
              >
                {loadingKey === "v2:program_change"
                  ? "Sending..."
                  : needsAssign
                    ? "Assign (Monday) + fire program_change"
                    : "Fire program_change"}
              </button>
            </div>

            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 space-y-2">
              <div className="text-sm font-medium text-emerald-900">
                {TALON_V2_CAMPAIGN_LABELS.exercise_completed}
              </div>
              <p className="text-xs text-emerald-800">
                Today&apos;s incomplete exercises
                {todayMeta
                  ? ` (${todayMeta.localDate}, ${todayMeta.timezone})`
                  : ""}
                . Marks sets complete, then fires exercise_completed with
                externalSessionID.
              </p>
              <select
                className="w-full border rounded-md px-2 py-1.5 text-sm"
                value={selectedExerciseId === "" ? "" : String(selectedExerciseId)}
                onChange={(e) =>
                  setSelectedExerciseId(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                disabled={
                  buttonsDisabled ||
                  exercisesLoading ||
                  todayExercises.length === 0
                }
              >
                <option value="">
                  {exercisesLoading
                    ? "Loading..."
                    : todayExercises.length === 0
                      ? todayMeta?.detail || "No incomplete exercises today"
                      : "Select exercise"}
                </option>
                {todayExercises.map((ex) => (
                  <option key={ex.exerciseId} value={ex.exerciseId}>
                    {ex.name} (#{ex.exerciseId})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleV2Complete()}
                disabled={completeDisabled}
                className={`w-full px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  completeDisabled
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-emerald-700 text-white hover:bg-emerald-800"
                }`}
              >
                {loadingKey === "v2:exercise_completed"
                  ? "Completing + Talon..."
                  : "Complete sets + fire exercise_completed"}
              </button>
            </div>
          </section>
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
                  <span className="font-medium">Action:</span> {lastResult.label}
                </div>
                <div className="text-xs text-gray-500">{lastResult.at}</div>
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
