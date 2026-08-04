"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getUsers,
  advanceTime,
  getUserTransactions,
  resetUserData,
  trackTalonEvent,
  addChosenOne,
  getOrganizations,
  type Organization,
} from "@/lib/api";
import {
  User,
  HpTransaction,
  IpTransaction,
  AdvanceTimeResponse,
  AddChosenOneRequest,
} from "@/lib/types";
import Timeline from "@/components/Timeline";
import CalendlyIntegration from "@/components/CalendlyIntegration";
import ServeQuestion from "@/components/ServeQuestion";
import ProcessHabit from "@/components/ProcessHabit";
import ProgramAssignment from "@/components/WorkoutAssignment";
import ReminderPreferences from "@/components/ReminderPreferences";
import Header from "@/components/Header";
import { useQaContext } from "@/context/qa-context";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    selectedUserId: selectedUser,
    selectedOrgId,
    setSelectedUserId,
    isHydrated,
  } = useQaContext();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userTransactions, setUserTransactions] = useState<HpTransaction[]>([]);
  const [userIpTransactions, setUserIpTransactions] = useState<IpTransaction[]>(
    []
  );
  const [hours, setHours] = useState<number>(24);
  const [userLoggedIn, setUserLoggedIn] = useState<boolean>(false);
  const [processWorkouts, setProcessWorkouts] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<AdvanceTimeResponse | null>(
    null
  );
  const [timelineMode, setTimelineMode] = useState<"selected" | "all">("all");
  const [timelineRefetch, setTimelineRefetch] = useState<
    (() => Promise<void>) | null
  >(null);
  const [hpHistoryExpanded, setHpHistoryExpanded] = useState<boolean>(false);
  const [ipHistoryExpanded, setIpHistoryExpanded] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [hardReset, setHardReset] = useState<boolean>(false);
  const [resetTalonOne, setResetTalonOne] = useState<boolean>(true);
  const [chosenOneForm, setChosenOneForm] = useState<AddChosenOneRequest>({
    email: '',
    first_name: '',
    last_name: ''
  });
  const [chosenOneOrgId, setChosenOneOrgId] = useState<string>("");
  const [addingChosenOne, setAddingChosenOne] = useState<boolean>(false);
  const [chosenOneMessage, setChosenOneMessage] = useState<string>('');
  const [calendlyTab, setCalendlyTab] = useState<"screening" | "consultation" | "reschedule" | null>(null);
  const [rescheduleUrl, setRescheduleUrl] = useState<string | undefined>(undefined);
  /** Blocks URL→context while our context→URL replace is in flight (avoids A↔B flicker). */
  const pendingUrlUserId = useRef<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  }, []);

  const loadOrganizations = useCallback(async () => {
    try {
      const orgs = await getOrganizations();
      setOrganizations(orgs);
    } catch (error) {
      console.error("Failed to load organizations:", error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadOrganizations();
  }, [loadUsers, loadOrganizations]);

  // Keep ?userId= in sync when header/context selection changes on home.
  // Depend only on selectedUser — not searchParams — so back/forward isn't overwritten.
  useEffect(() => {
    if (!isHydrated) return;
    const current = new URLSearchParams(window.location.search);
    const userIdFromUrl = current.get("userId") ?? "";
    if (selectedUser === userIdFromUrl) {
      pendingUrlUserId.current = null;
      return;
    }

    pendingUrlUserId.current = selectedUser;
    if (selectedUser) {
      current.set("userId", selectedUser);
    } else {
      current.delete("userId");
    }
    const query = current.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }, [selectedUser, isHydrated, router]);

  // Apply external URL changes (back/forward, shared links) without fighting our own replace
  useEffect(() => {
    if (!isHydrated) return;
    const userIdFromUrl = searchParams.get("userId") ?? "";

    if (pendingUrlUserId.current !== null) {
      if (userIdFromUrl === pendingUrlUserId.current) {
        pendingUrlUserId.current = null;
      }
      return;
    }

    if (userIdFromUrl !== selectedUser) {
      setSelectedUserId(userIdFromUrl);
    }
  }, [isHydrated, searchParams, selectedUser, setSelectedUserId]);

  // Default chosen-one org from header context when unset
  useEffect(() => {
    if (selectedOrgId && !chosenOneOrgId) {
      setChosenOneOrgId(selectedOrgId);
    }
  }, [selectedOrgId, chosenOneOrgId]);

  const loadUserTransactions = useCallback(async () => {
    if (!selectedUser) return;

    try {
      const transactions = await getUserTransactions(selectedUser);
      setUserTransactions(transactions);

      // Also load IP transactions
      const ipResponse = await fetch(`/api/ip-transactions/${selectedUser}`);
      if (ipResponse.ok) {
        const ipTransactions = await ipResponse.json();
        setUserIpTransactions(ipTransactions);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      loadUserTransactions();
    }
  }, [selectedUser, loadUserTransactions]);

  // Auto-set timeline mode based on user selection
  useEffect(() => {
    if (selectedUser) {
      setTimelineMode("selected");
    } else {
      setTimelineMode("all");
    }
  }, [selectedUser]);

  const handleAdvanceTime = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const result = await advanceTime(selectedUser, hours, userLoggedIn, processWorkouts);
      setLastResult(result);

      await Promise.all([
        loadUsers(),
        loadUserTransactions(),
        timelineRefetch ? timelineRefetch() : Promise.resolve(),
      ]);
    } catch (error) {
      console.error("Failed to advance time:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedUserData = users.find((u) => u.id === selectedUser);

  const reloadUserStats = useCallback(async () => {
    // Reload users to get updated stats
    await loadUsers();

    // Also reload transactions and timeline if a user is selected
    if (selectedUser) {
      await loadUserTransactions();
      if (timelineRefetch) {
        await timelineRefetch();
      }
    }
  }, [selectedUser, timelineRefetch, loadUsers, loadUserTransactions]);

  const handleTimelineRefetchReady = useCallback(
    (refetch: () => Promise<void>) => {
      setTimelineRefetch(() => refetch);
    },
    []
  );

  const handleCalendlyModalClose = useCallback(async () => {
    if (timelineRefetch) {
      await timelineRefetch();
    }
    // Also reload user stats in case appointments affected user data
    await reloadUserStats();
    setCalendlyTab(null);
    setRescheduleUrl(undefined);
  }, [timelineRefetch, reloadUserStats]);

  const handleRescheduleClick = useCallback((url: string) => {
    // Set the reschedule URL and tab
    setRescheduleUrl(url);
    // Reset to null first, then set to reschedule to ensure the change is detected
    setCalendlyTab(null);
    setTimeout(() => {
      setCalendlyTab("reschedule");
      // Scroll to CalendlyIntegration component after a short delay to ensure it's rendered
      setTimeout(() => {
        const element = document.getElementById("calendly-integration");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }, 10);
  }, []);


  const updateSelectedUser = useCallback(
    (userId: string) => {
      setSelectedUserId(userId);
    },
    [setSelectedUserId]
  );

  const handleResetUserData = async () => {
    if (!selectedUser) return;

    const confirmed = window.confirm(`Are you sure fr fr?`);

    if (!confirmed) return;

    setResetting(true);
    try {
      let talonResetWarning: string | undefined;
      if (resetTalonOne) {
        try {
          const { status, body } = await trackTalonEvent(selectedUser, "reset_user");
          if (status < 200 || status >= 300) {
            talonResetWarning = `Talon.One reset_user returned status ${status}`;
            console.warn("Talon.One reset_user failed:", body);
          }
        } catch (error) {
          talonResetWarning =
            error instanceof Error ? error.message : "Failed to call Talon.One reset_user";
          console.warn("Talon.One reset_user error:", error);
        }
      }

      const result = await resetUserData(selectedUser, hardReset);

      if (result.success) {
        let successMessage = `User data reset successfully: ${result.message}`;
        if (talonResetWarning) {
          successMessage += `\n\nTalon.One: ${talonResetWarning}`;
        } else if (resetTalonOne) {
          successMessage += "\n\nTalon.One: reset_user event sent";
        }
        if (result.pushfire?.warning) {
          successMessage += `\n\nPushfire: ${result.pushfire.warning}`;
        } else if (result.pushfire?.skipped) {
          successMessage += `\n\nPushfire: tags not cleared (${result.pushfire.reason ?? "skipped"})`;
        } else if (result.pushfire?.queued) {
          successMessage += "\n\nPushfire: tag removal queued";
        }
        alert(successMessage);
        // Clear selected user and URL parameter
        updateSelectedUser("");
        // Reload all data
        await loadUsers();
        if (timelineRefetch) {
          await timelineRefetch();
        }
      } else {
        alert(`Failed to reset user data: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to reset user data:", error);
      alert(
        `Error resetting user data: ${error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setResetting(false);
    }
  };

  const handleAddChosenOne = async () => {
    if (!chosenOneForm.email || !chosenOneForm.first_name || !chosenOneForm.last_name) {
      setChosenOneMessage('Please fill in all fields');
      return;
    }

    setAddingChosenOne(true);
    setChosenOneMessage('');

    try {
      const result = await addChosenOne({
        ...chosenOneForm,
        organization_id: chosenOneOrgId || undefined,
      });

      if (result.success) {
        setChosenOneMessage('✅ Chosen One added successfully!');
        setChosenOneForm({ email: '', first_name: '', last_name: '' });
        await loadUsers();
        window.dispatchEvent(new Event('qa-users-changed'));
      } else {
        setChosenOneMessage(`❌ Error: ${result.error || 'Failed to add Chosen One'}`);
      }
    } catch (error) {
      console.error('Failed to add Chosen One:', error);
      setChosenOneMessage(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setAddingChosenOne(false);
    }
  };

  return (
    <>
      <Header />
      <div className='min-h-screen p-8'>
        <div className='max-w-6xl mx-auto'>

          {/* User actions (picker lives in Header) */}
          <div className='bg-white rounded-lg shadow p-6 mb-6'>
            <h2 className='text-xl font-semibold mb-4'>User Actions</h2>
            {!selectedUser && (
              <p className='text-sm text-gray-600 mb-4'>
                Select a test user from the header to run QA tools.
              </p>
            )}

            <div className='flex gap-4'>
              <button
                onClick={handleResetUserData}
                disabled={!selectedUser || resetting}
                className={`px-4 py-3 rounded-md font-medium transition-colors flex items-center gap-2 ${!selectedUser || resetting
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                title={
                  !selectedUser
                    ? "Select a user first"
                    : "Reset all user data (cannot be undone)"
                }
              >
                {resetting ? (
                  <>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                    Resetting...
                  </>
                ) : (
                  <>🗑️ Reset User Data</>
                )}
              </button>
            </div>

            <div className='mt-4 flex flex-wrap items-center gap-6'>
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='hardReset'
                  checked={hardReset}
                  onChange={(e) => setHardReset(e.target.checked)}
                  className='w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500'
                />
                <label htmlFor='hardReset' className='text-sm text-gray-700 flex items-center gap-1'>
                  <span>Hard Reset</span>
                  <span
                    className='text-gray-400 cursor-help'
                    title='This method will need the user to re-subscribe to the application'
                  >
                    ⓘ
                  </span>
                </label>
              </div>
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='resetTalonOne'
                  checked={resetTalonOne}
                  onChange={(e) => setResetTalonOne(e.target.checked)}
                  className='w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500'
                />
                <label htmlFor='resetTalonOne' className='text-sm text-gray-700'>
                  Reset TalonOne
                </label>
              </div>
            </div>

            {/* Chosen Ones Section */}
            <div className='mt-6 pt-6 border-t border-gray-200'>
              <h3 className='text-lg font-semibold mb-4 text-purple-800'>Add Chosen Ones :D</h3>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Email Address
                  </label>
                  <input
                    type='email'
                    value={chosenOneForm.email}
                    onChange={(e) => setChosenOneForm(prev => ({ ...prev, email: e.target.value }))}
                    className='w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                    placeholder='user@example.com'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    First Name
                  </label>
                  <input
                    type='text'
                    value={chosenOneForm.first_name}
                    onChange={(e) => setChosenOneForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className='w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                    placeholder='John'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Last Name
                  </label>
                  <input
                    type='text'
                    value={chosenOneForm.last_name}
                    onChange={(e) => setChosenOneForm(prev => ({ ...prev, last_name: e.target.value }))}
                    className='w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                    placeholder='Doe'
                  />
                </div>
              </div>

              <div className='mb-4 max-w-md'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Organization membership (optional)
                </label>
                <select
                  value={chosenOneOrgId}
                  onChange={(e) => setChosenOneOrgId(e.target.value)}
                  className='w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                >
                  <option value=''>No org membership</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <p className='mt-1 text-xs text-gray-500'>
                  Pre-filled from header org when set. Leave empty to create without membership.
                </p>
              </div>

              <div className='flex items-center justify-between'>
                <button
                  onClick={handleAddChosenOne}
                  disabled={addingChosenOne || !chosenOneForm.email || !chosenOneForm.first_name || !chosenOneForm.last_name}
                  className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${addingChosenOne || !chosenOneForm.email || !chosenOneForm.first_name || !chosenOneForm.last_name
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg transform hover:-translate-y-0.5'
                    }`}
                >
                  {addingChosenOne ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      Add Chosen One
                    </>
                  )}
                </button>

                {chosenOneMessage && (
                  <div className={`text-sm font-medium ${chosenOneMessage.includes('✅') ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {chosenOneMessage}
                  </div>
                )}
              </div>

              {/* Legend about email testing */}
              <div className='mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md'>
                <div className='flex items-start gap-2'>
                  <span className='text-blue-600 text-sm'>💡</span>
                  <div className='text-sm text-blue-800'>
                    <strong>Testing Tip:</strong> Supabase allows adding &quot;+&quot; to email addresses for testing.
                    For example, use <code className='bg-blue-100 px-1 rounded'>bruno+test@flywheel.so</code> to create
                    multiple test accounts with the same base email, OTPs will be sent to the same email address. The text after
                    the &quot;+&quot; is not important, it can be whatever you want.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Stats */}
          {selectedUserData && (
            <div className='bg-white rounded-lg shadow p-6 mb-6'>
              <h2 className='text-xl font-semibold mb-4'>User Stats</h2>
              <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-blue-600'>
                    {selectedUserData.current_level}
                  </div>
                  <div className='text-sm text-gray-600'>Level</div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-green-600'>
                    {selectedUserData.hp_points}
                  </div>
                  <div className='text-sm text-gray-600'>HP Points</div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-purple-600'>
                    {selectedUserData.empowerment}
                  </div>
                  <div className='text-sm text-gray-600'>Empowerment</div>
                </div>
                <div className='text-center'>
                  <div className='text-lg font-bold text-orange-600'>
                    {selectedUserData.current_phase}
                  </div>
                  <div className='text-sm text-gray-600'>Phase</div>
                </div>
                <div className='text-center'>
                  <div className='text-xl font-bold text-indigo-600'>
                    {selectedUserData.max_gate_unlocked || 0}
                  </div>
                  <div className='text-sm text-gray-600'>Max Gate</div>
                  {selectedUserData.max_gate_type && (
                    <div className='text-xs text-gray-500 mt-1'>
                      {selectedUserData.max_gate_type}
                    </div>
                  )}
                </div>
                <div className='text-center'>
                  <div className='text-lg font-bold text-pink-600'>
                    {selectedUserData.empowerment_threshold_title || "N/A"}
                  </div>
                  <div className='text-sm text-gray-600'>Threshold</div>
                  {selectedUserData.empowerment_threshold && (
                    <div className='text-xs text-gray-500 mt-1'>
                      ID: {selectedUserData.empowerment_threshold}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Time Advancement Controls */}
          <div className='bg-white rounded-lg shadow p-6 mb-6'>
            <h2 className='text-xl font-semibold mb-4'>Time Advancement</h2>
            <p className='text-sm text-gray-600 mb-4'>
              Also fires Talon event <code className='text-xs bg-gray-100 px-1 rounded'>qa_advance_loyalty_expiry</code> with
              simulated <code className='text-xs bg-gray-100 px-1 rounded'>start_of_day</code> /{' '}
              <code className='text-xs bg-gray-100 px-1 rounded'>start_of_week</code>. Campaign Manager needs rules that
              run <strong>Update loyalty points expiry date</strong> for subledgers{' '}
              <code className='text-xs bg-gray-100 px-1 rounded'>current_day_vp</code> and{' '}
              <code className='text-xs bg-gray-100 px-1 rounded'>info_points_weekly</code>.
            </p>
            <div className='flex flex-col md:flex-row gap-4 items-end'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Hours to Advance
                </label>
                <input
                  type='number'
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className='p-3 border border-gray-300 rounded-md w-32'
                  min='1'
                  max='168'
                />
              </div>
              <div className='flex flex-col gap-2'>
                <div className='flex items-center'>
                  <input
                    type='checkbox'
                    id='processWorkouts'
                    checked={processWorkouts}
                    onChange={(e) => setProcessWorkouts(e.target.checked)}
                    className='mr-2'
                  />
                  <label htmlFor='processWorkouts' className='text-sm text-gray-700'>
                    Process Workouts
                  </label>
                </div>
                <div className='flex items-center'>
                  <input
                    type='checkbox'
                    id='userLoggedIn'
                    checked={userLoggedIn}
                    onChange={(e) => setUserLoggedIn(e.target.checked)}
                    className='mr-2'
                  />
                  <label htmlFor='userLoggedIn' className='text-sm text-gray-700'>
                    Simulate User Login
                  </label>
                </div>
              </div>
              <button
                onClick={handleAdvanceTime}
                disabled={!selectedUser || loading}
                className='px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400'
              >
                {loading ? "Advancing..." : "Advance Time"}
              </button>
            </div>
          </div>

          {/* Last Result */}
          {lastResult && (
            <div className='bg-white rounded-lg shadow p-6 mb-6'>
              <h2 className='text-xl font-semibold mb-4'>
                Last Operation Result
              </h2>
              <div
                className={`p-4 rounded-md ${lastResult.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
                  }`}
              >
                <div className='font-medium mb-2'>{lastResult.message}</div>
                <div className='text-sm text-gray-600 space-y-1'>
                  <div>Hours Advanced: {lastResult.hours_advanced}</div>
                  <div>Records Modified: {lastResult.total_records_modified}</div>
                  {(() => {
                    const workoutsResult = lastResult.results.find(
                      (r) => r.table_name === 'workouts'
                    );
                    return workoutsResult ? (
                      <div className='font-semibold text-blue-600'>
                        Workouts Updated: {workoutsResult.records_modified}{' '}
                        {workoutsResult.success ? '✓' : '✗'}
                      </div>
                    ) : null;
                  })()}
                  <div>
                    Boundary Crossed: {lastResult.boundary_crossed ? "Yes" : "No"}
                  </div>
                  <div>
                    Cron Triggered: {lastResult.cron_triggered ? "Yes" : "No"}
                  </div>
                  {lastResult.talon && (
                    <div
                      className={
                        lastResult.talon.skipped ||
                        (lastResult.talon.status !== undefined &&
                          lastResult.talon.status >= 400)
                          ? 'text-amber-700'
                          : 'text-green-700'
                      }
                    >
                      Talon loyalty expiry:{' '}
                      {lastResult.talon.skipped
                        ? `skipped (${lastResult.talon.reason ?? 'unknown'})`
                        : `HTTP ${lastResult.talon.status ?? '?'}`}
                      {lastResult.talon.attributes && (
                        <pre className='mt-1 text-xs text-gray-600 whitespace-pre-wrap'>
                          {JSON.stringify(lastResult.talon.attributes, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                  {lastResult.results.map((result, index) => (
                    <div
                      key={index}
                      className={`ml-4 ${result.success ? "text-green-600" : "text-red-600"
                        }`}
                    >
                      {result.table_name}: {result.records_modified} records{" "}
                      {result.success ? "✓" : "✗"}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transaction History */}
          {(userTransactions.length > 0 || userIpTransactions.length > 0) && (
            <div className='bg-white rounded-lg shadow p-6 mb-6'>
              <h2 className='text-xl font-semibold mb-4'>Transaction History</h2>

              {/* HP Transactions */}
              {userTransactions.length > 0 && (
                <div className='mb-6'>
                  <button
                    onClick={() => setHpHistoryExpanded(!hpHistoryExpanded)}
                    className='flex items-center justify-between w-full p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors'
                  >
                    <div className='flex items-center'>
                      <span className='text-lg mr-2'>⚡</span>
                      <span className='font-semibold text-blue-800'>
                        HP Transactions ({userTransactions.length})
                      </span>
                    </div>
                    <span
                      className={`transform transition-transform ${hpHistoryExpanded ? "rotate-180" : ""
                        }`}
                    >
                      ▼
                    </span>
                  </button>

                  {hpHistoryExpanded && (
                    <div className='mt-3 overflow-x-auto'>
                      <table className='w-full text-sm'>
                        <thead>
                          <tr className='border-b'>
                            <th className='text-left p-2'>Type</th>
                            <th className='text-left p-2'>Points</th>
                            <th className='text-left p-2'>Date</th>
                            <th className='text-left p-2'>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userTransactions.slice(0, 10).map((transaction) => (
                            <tr key={transaction.id} className='border-b'>
                              <td className='p-2 font-medium'>
                                {transaction.transaction_type}
                              </td>
                              <td className='p-2 text-green-600'>
                                +{transaction.points_earned}
                              </td>
                              <td className='p-2 text-gray-600'>
                                {new Date(
                                  transaction.created_at
                                ).toLocaleString()}
                              </td>
                              <td className='p-2 text-gray-600'>
                                {transaction.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* IP Transactions */}
              {userIpTransactions.length > 0 && (
                <div>
                  <button
                    onClick={() => setIpHistoryExpanded(!ipHistoryExpanded)}
                    className='flex items-center justify-between w-full p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors'
                  >
                    <div className='flex items-center'>
                      <span className='text-lg mr-2'>💪</span>
                      <span className='font-semibold text-purple-800'>
                        IP Transactions ({userIpTransactions.length})
                      </span>
                    </div>
                    <span
                      className={`transform transition-transform ${ipHistoryExpanded ? "rotate-180" : ""
                        }`}
                    >
                      ▼
                    </span>
                  </button>

                  {ipHistoryExpanded && (
                    <div className='mt-3 overflow-x-auto'>
                      <table className='w-full text-sm'>
                        <thead>
                          <tr className='border-b'>
                            <th className='text-left p-2'>Type</th>
                            <th className='text-left p-2'>Amount</th>
                            <th className='text-left p-2'>Date</th>
                            <th className='text-left p-2'>Metadata</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userIpTransactions.slice(0, 10).map((transaction) => (
                            <tr key={transaction.id} className='border-b'>
                              <td className='p-2 font-medium'>
                                {transaction.transaction_type}
                              </td>
                              <td
                                className={`p-2 ${transaction.amount >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                                  }`}
                              >
                                {transaction.amount >= 0 ? "+" : ""}
                                {transaction.amount}
                              </td>
                              <td className='p-2 text-gray-600'>
                                {new Date(
                                  transaction.created_at
                                ).toLocaleString()}
                              </td>
                              <td className='p-2 text-gray-600'>
                                <div className='flex items-start justify-between gap-2'>
                                  <div className='flex-1 min-w-0'>
                                    {transaction.metadata ? (
                                      <div className='text-xs bg-gray-100 p-2 rounded max-w-md'>
                                        <pre className='whitespace-pre-wrap break-words overflow-hidden'>
                                          {JSON.stringify(
                                            transaction.metadata,
                                            null,
                                            2
                                          )}
                                        </pre>
                                      </div>
                                    ) : (
                                      <span className='text-gray-400 italic'>
                                        No metadata
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      const textToCopy = transaction.metadata
                                        ? JSON.stringify(
                                          transaction.metadata,
                                          null,
                                          2
                                        )
                                        : "No metadata available";
                                      navigator.clipboard.writeText(textToCopy);
                                    }}
                                    className='flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors'
                                    title='Copy metadata to clipboard'
                                  >
                                    📋
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Timeline Controls */}
          <div className='bg-white rounded-lg shadow p-6 mb-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-xl font-semibold'>Timeline View</h2>
              <div className='flex space-x-2'>
                <button
                  onClick={() => setTimelineMode("selected")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${timelineMode === "selected"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  disabled={!selectedUser}
                >
                  Selected User
                </button>
                <button
                  onClick={() => setTimelineMode("all")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${timelineMode === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  All Users
                </button>
              </div>
            </div>

            <Timeline
              selectedUserId={selectedUser || undefined}
              showAllUsers={timelineMode === "all"}
              onRefetchReady={handleTimelineRefetchReady}
              onRescheduleClick={handleRescheduleClick}
            />
          </div>

          {/* Calendly Integration */}
          {selectedUser && (
            <CalendlyIntegration
              selectedUserId={selectedUser || undefined}
              selectedUserName={
                selectedUserData
                  ? `${selectedUserData.first_name} ${selectedUserData.last_name}`
                  : undefined
              }
              onModalClose={handleCalendlyModalClose}
              onDataUpdate={reloadUserStats}
              initialTab={calendlyTab}
              rescheduleUrl={rescheduleUrl}
              onTabChange={() => {
                // Reset the tab state after it's been set to allow re-triggering
                if (calendlyTab) {
                  setTimeout(() => {
                    setCalendlyTab(null);
                    // Keep rescheduleUrl until tab is closed via handleCalendlyModalClose
                  }, 0);
                }
              }}
            />
          )}

          {/* Serve Question - Only show if user is selected */}
          {selectedUser && (
            <ServeQuestion onDataUpdate={reloadUserStats} userId={selectedUser} />
          )}
          <br />
          {/* Process Habit - Only show if user is selected */}
          {selectedUser && (
            <ProcessHabit
              selectedUserId={selectedUser}
              onDataUpdate={reloadUserStats}
            />
          )}
          <br />
          {/* Program Assignment - Only show if user is selected */}
          {selectedUser && (
            <ProgramAssignment
              selectedUserId={selectedUser}
              onDataUpdate={reloadUserStats}
            />
          )}
          <br />
          {/* Reminder Preferences - Only show if user is selected */}
          {selectedUser && (
            <ReminderPreferences
              selectedUserId={selectedUser}
              onDataUpdate={reloadUserStats}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className='min-h-screen p-8'>
        <div className='max-w-6xl mx-auto'>
          <h1 className='text-3xl font-bold text-gray-900 mb-8'>
            Testing Dashboard (dev)
          </h1>
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
              <span className='ml-3 text-gray-600'>Loading dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
