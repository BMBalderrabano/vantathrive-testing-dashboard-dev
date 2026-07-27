"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getUserTransactions,
  getUsers,
  markAppointmentAsAttended,
} from "@/lib/api";
import {
  HpTransaction,
  IpTransaction,
  CheckInQuestion,
  Appointment,
  Workout,
} from "@/lib/types";

interface GroupedWorkout {
  workout_id?: number;
  workout_date?: string;
  workout_name?: string;
  status?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  exercises: Array<{
    exercise: string;
    exercise_id: number;
    set_type?: string;
    set_id?: number;
    assigned_reps?: number;
    assigned_weight_lbs?: number;
    assigned_time?: number;
    note?: string;
  }>;
}

interface TimelineEvent {
  id: string;
  type:
    | "hp_transaction"
    | "ip_transaction"
    | "check_in_question"
    | "appointment"
    | "workout";
  timestamp: string;
  user_id: string;
  user_name: string;
  title: string;
  description: string;
  points?: number;
  transaction_type?: string;
  adjustedPosition?: number;
  isClustered?: boolean;
  clusterIndex?: number;
  verticalOffset?: number;
  clusterKey?: string;
  clusterSize?: number;
  isClusterRepresentative?: boolean;
  // Appointment-specific fields
  appointment_type?: string;
  status?: string;
  location_value?: string;
  invitee_name?: string;
  invitee_email?: string;
  appointment_id?: number;
  reschedule_url?: string;
  // Workout-specific fields
  exercise_name?: string;
  workout_id?: number;
  exercise_id?: number;
  library_tip?: string;
  library_check_in_question?: string;
}

interface TimelineProps {
  selectedUserId?: string;
  showAllUsers?: boolean;
  onRefetchReady?: (refetch: () => Promise<void>) => void;
  onRescheduleClick?: (rescheduleUrl: string) => void;
}

export default function Timeline({
  selectedUserId,
  showAllUsers = false,
  onRefetchReady,
  onRescheduleClick,
}: TimelineProps) {
  const [allEvents, setAllEvents] = useState<TimelineEvent[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startDateInput, setStartDateInput] = useState<string>("");
  const [endDateInput, setEndDateInput] = useState<string>("");
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    new Set()
  );
  const [markingAttended, setMarkingAttended] = useState<Set<number>>(
    new Set()
  );
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);

  const spreadOverlappingEvents = useCallback(
    (events: TimelineEvent[]): TimelineEvent[] => {
      if (events.length <= 1) return events;

      const spreadEvents: TimelineEvent[] = [];
      const clusters: TimelineEvent[][] = [];

      // Group events into clusters based on proximity (within 2% of timeline)
      let currentCluster: TimelineEvent[] = [events[0]];

      for (let i = 1; i < events.length; i++) {
        const prevEvent = events[i - 1];
        const currentEvent = events[i];

        const prevTime = new Date(prevEvent.timestamp).getTime();
        const currentTime = new Date(currentEvent.timestamp).getTime();
        const oldestTime = new Date(
          events[events.length - 1].timestamp
        ).getTime();
        const newestTime = new Date(events[0].timestamp).getTime();
        const timeRange = newestTime - oldestTime;

        if (timeRange === 0) {
          currentCluster.push(currentEvent);
          continue;
        }

        const prevPosition = ((prevTime - oldestTime) / timeRange) * 100;
        const currentPosition = ((currentTime - oldestTime) / timeRange) * 100;

        // If events are within 2% of each other, they're in the same cluster
        if (Math.abs(prevPosition - currentPosition) < 2) {
          currentCluster.push(currentEvent);
        } else {
          clusters.push(currentCluster);
          currentCluster = [currentEvent];
        }
      }

      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }

      // Assign vertical lanes to clusters and process events
      clusters.forEach((cluster, clusterIndex) => {
        // Calculate the horizontal position for this cluster (same for all events in cluster)
        const clusterEvent = cluster[0]; // Use first event as reference
        const eventTime = new Date(clusterEvent.timestamp).getTime();
        const oldestTime = new Date(
          events[events.length - 1].timestamp
        ).getTime();
        const newestTime = new Date(events[0].timestamp).getTime();
        const timeRange = newestTime - oldestTime;
        const horizontalPosition =
          timeRange === 0 ? 50 : ((eventTime - oldestTime) / timeRange) * 100;

        // Create cluster key for identification
        const clusterKey = `cluster-${clusterIndex}-${Math.round(
          horizontalPosition
        )}`;
        const isExpanded = expandedClusters.has(clusterKey);

        cluster.forEach((event, eventIndex) => {
          let verticalOffset = 0;
          if (cluster.length > 1) {
            if (isExpanded) {
              // When expanded, spread events vertically within cluster starting from timeline
              verticalOffset = eventIndex * 30; // 30px vertical spacing from timeline
            } else {
              // When collapsed, all events at timeline level, but only show first one
              verticalOffset = 0;
            }
          }

          // Only process the first event when collapsed, all events when expanded
          if (cluster.length === 1 || isExpanded || eventIndex === 0) {
            const adjustedEvent = {
              ...event,
              adjustedPosition: horizontalPosition,
              isClustered: cluster.length > 1,
              clusterIndex,
              verticalOffset,
              clusterKey,
              clusterSize: cluster.length,
              isClusterRepresentative: cluster.length > 1 && eventIndex === 0, // Only first event is clickable when collapsed
            };
            spreadEvents.push(adjustedEvent);
          }
        });
      });

      // Sort by original timestamp to maintain chronological order
      const result = spreadEvents.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return result;
    },
    [expandedClusters]
  );

  useEffect(() => {
    loadTimelineData();
  }, [selectedUserId, showAllUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
    };
  }, [tooltipTimeout]);

  useEffect(() => {
    // Re-process events when cluster expansion changes
    if (allEvents.length > 0) {
      const endOfDay = endDate ? new Date(endDate) : null;
      if (endOfDay) endOfDay.setHours(23, 59, 59, 999);

      const filteredEvents = allEvents.filter((event) => {
        if (!startDate || !endDate) return true;
        const eventDate = new Date(event.timestamp);
        return eventDate >= startDate && eventDate <= endOfDay!;
      });
      setEvents(spreadOverlappingEvents(filteredEvents));
    }
  }, [
    expandedClusters,
    allEvents,
    startDate,
    endDate,
    spreadOverlappingEvents,
  ]);

  useEffect(() => {
    // Re-filter events when date range changes
    if (startDate && endDate && allEvents.length > 0) {
      // Set end date to end of day to include events from that day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const filteredEvents = allEvents.filter((event) => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= startDate && eventDate <= endOfDay;
      });
      setEvents(spreadOverlappingEvents(filteredEvents));
    }
  }, [startDate, endDate, allEvents, spreadOverlappingEvents]);

  const applyDateRange = async () => {
    try {
      const newStartDate = startDateInput
        ? parseDateFromInput(startDateInput)
        : null;
      const newEndDate = endDateInput ? parseDateFromInput(endDateInput) : null;

      if (newStartDate && newEndDate) {
        setStartDate(newStartDate);
        setEndDate(newEndDate);
        
        // Reload timeline data with the new date range
        await loadTimelineData({ startDate: newStartDate, endDate: newEndDate });
      }
    } catch (error) {
      console.error("Invalid date format:", error);
    }
  };

  const toggleClusterExpansion = (clusterKey: string) => {
    setExpandedClusters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clusterKey)) {
        newSet.delete(clusterKey);
      } else {
        newSet.add(clusterKey);
      }
      return newSet;
    });
  };

  const handleMarkAsAttended = async (appointmentId: number) => {
    setMarkingAttended((prev) => new Set(prev).add(appointmentId));

    try {
      const result = await markAppointmentAsAttended(appointmentId);

      if (result.success) {
        // Reload timeline data to reflect the status change
        await loadTimelineData();
      } else {
        console.error("Failed to mark appointment as attended:", result.error);
        alert(`Failed to mark appointment as attended: ${result.error}`);
      }
    } catch (error) {
      console.error("Error marking appointment as attended:", error);
      alert(
        `Error marking appointment as attended: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setMarkingAttended((prev) => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
    }
  };

  const handleMarkerMouseEnter = (eventId: string) => {
    // Clear any existing timeout
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setHoveredEventId(eventId);
  };

  const handleMarkerMouseLeave = () => {
    // Start delay timer only if not hovering over tooltip
    if (!isHoveringTooltip) {
      const timeout = setTimeout(() => {
        setHoveredEventId(null);
      }, 500); // 500ms delay
      setTooltipTimeout(timeout);
    }
  };

  const handleTooltipMouseEnter = () => {
    // Clear timeout when entering tooltip
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setIsHoveringTooltip(true);
  };

  const handleTooltipMouseLeave = () => {
    setIsHoveringTooltip(false);
    // Start delay timer when leaving tooltip
    const timeout = setTimeout(() => {
      setHoveredEventId(null);
    }, 300); // 300ms delay when leaving tooltip
    setTooltipTimeout(timeout);
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const parseDateFromInput = (dateString: string) => {
    // Parse date in local timezone to avoid timezone issues
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0);
  };

  const loadTimelineData = useCallback(async (dateRange?: { startDate: Date; endDate: Date }) => {
    setLoading(true);
    setError(null);

    try {
      const allEvents: TimelineEvent[] = [];

      if (showAllUsers) {
        // Load data for all users - fetch all transactions at once
        const users = await getUsers();
        const userMap = new Map(users.map((user) => [user.id, user]));

        // Fetch all HP transactions for all users
        const response = await fetch("/api/transactions/all");
        if (!response.ok) {
          throw new Error(
            `Failed to fetch all transactions: ${response.status}`
          );
        }
        const allTransactions = await response.json();

        const hpEvents: TimelineEvent[] = allTransactions.map(
          (transaction: HpTransaction) => {
            const user = userMap.get(transaction.user_id);
            return {
              id: transaction.id,
              type: "hp_transaction",
              timestamp: transaction.created_at,
              user_id: transaction.user_id,
              user_name: user
                ? `${user.first_name} ${user.last_name}`
                : "Unknown User",
              title: `HP Transaction: ${transaction.transaction_type}`,
              description: transaction.description || "No description",
              points: transaction.points_earned,
              transaction_type: transaction.transaction_type,
            };
          }
        );

        allEvents.push(...hpEvents);

        // Fetch all IP transactions for all users
        const ipResponse = await fetch("/api/ip-transactions/all");
        if (ipResponse.ok) {
          const allIpTransactions = await ipResponse.json();

          const ipEvents: TimelineEvent[] = allIpTransactions.map(
            (transaction: IpTransaction) => {
              const user = userMap.get(transaction.user_id);
              return {
                id: transaction.id,
                type: "ip_transaction",
                timestamp: transaction.created_at,
                user_id: transaction.user_id,
                user_name: user
                  ? `${user.first_name} ${user.last_name}`
                  : "Unknown User",
                title: `IP Transaction: ${transaction.transaction_type}`,
                description: transaction.metadata
                  ? JSON.stringify(transaction.metadata)
                  : "No metadata",
                points: transaction.amount,
                transaction_type: transaction.transaction_type,
              };
            }
          );

          allEvents.push(...ipEvents);
        }

        // Fetch all check-in questions for all users
        const checkInResponse = await fetch("/api/check-in-questions/all");
        if (checkInResponse.ok) {
          const allCheckIns = await checkInResponse.json();

          const checkInEvents: TimelineEvent[] = allCheckIns.map(
            (checkIn: CheckInQuestion) => {
              const user = userMap.get(checkIn.user_id);
              return {
                id: checkIn.id,
                type: "check_in_question",
                timestamp: checkIn.created_at,
                user_id: checkIn.user_id,
                user_name: user
                  ? `${user.first_name} ${user.last_name}`
                  : "Unknown User",
                title: `Check-in Question`,
                description:
                  checkIn.question_text || "Check-in question answered",
                transaction_type: "check_in_question",
              };
            }
          );

          allEvents.push(...checkInEvents);
        }

        // Fetch all appointments for all users
        const appointmentsResponse = await fetch("/api/appointments/all");
        if (appointmentsResponse.ok) {
          const allAppointments = await appointmentsResponse.json();

          const appointmentEvents: TimelineEvent[] = allAppointments.map(
            (appointment: Appointment) => {
              const user = userMap.get(appointment.user_id);

              // Use start_time if available, otherwise created_at
              // Both should be in UTC from the database
              const timestamp =
                appointment.created_at || appointment.start_time;

              return {
                id: `appointment-${appointment.id}`,
                type: "appointment",
                timestamp: timestamp,
                user_id: appointment.user_id,
                user_name: user
                  ? `${user.first_name} ${user.last_name}`
                  : "Unknown User",
                title: `Appointment: ${
                  appointment.event_name || appointment.type
                }`,
                description:
                  appointment.location_value || "Appointment scheduled",
                appointment_type: appointment.type,
                status: appointment.status,
                location_value: appointment.location_value,
                invitee_name: appointment.invitee_name,
                invitee_email: appointment.invitee_email,
                appointment_id: appointment.id,
                reschedule_url: appointment.reschedule_url,
              };
            }
          );

          allEvents.push(...appointmentEvents);
        }

        // Fetch all workouts for all users
        const workoutsResponse = await fetch("/api/workouts/all");
        if (workoutsResponse.ok) {
          const allWorkouts = await workoutsResponse.json();

          // Group workouts by workout_id AND date (each workout session should be separate on timeline)
          const groupedWorkouts = allWorkouts.reduce((acc: Record<string, GroupedWorkout>, workout: Workout) => {
            const key = `${workout.id}-${workout.workout_date || workout.created_at?.split('T')[0]}`;
            if (!acc[key]) {
              acc[key] = {
                workout_id: workout.id,
                workout_date: workout.workout_date,
                workout_name: workout.workout_name,
                status: workout.status,
                user_id: workout.user_id,
                created_at: workout.created_at,
                updated_at: workout.updated_at,
                exercises: []
              };
            }
            acc[key].exercises.push({
              exercise: workout.exercise,
              exercise_id: workout.exercise_id,
              set_type: workout.set_type,
              set_id: workout.set_id,
              assigned_reps: workout.assigned_reps,
              assigned_weight_lbs: workout.assigned_weight_lbs,
              assigned_time: workout.assigned_time,
              note: workout.note
            });
            return acc;
          }, {});

          const workoutEvents: TimelineEvent[] = (Object.values(groupedWorkouts) as GroupedWorkout[]).map(
            (groupedWorkout: GroupedWorkout) => {
              const user = userMap.get(groupedWorkout.user_id);
              const exerciseCount = groupedWorkout.exercises.length;
              const uniqueExercises = [...new Set(groupedWorkout.exercises.map((ex) => ex.exercise))];
              
              return {
                id: `workout-group-${groupedWorkout.workout_id || 'unknown'}-${groupedWorkout.workout_date || groupedWorkout.created_at?.split('T')[0] || 'unknown'}`,
                type: "workout",
                timestamp: groupedWorkout.workout_date ? `${groupedWorkout.workout_date}T00:00:00Z` : (groupedWorkout.created_at || groupedWorkout.updated_at || new Date().toISOString()),
                user_id: groupedWorkout.user_id,
                user_name: user
                  ? `${user.first_name} ${user.last_name}`
                  : "Unknown User",
                title: `Workout: ${groupedWorkout.workout_name || 'Unknown Workout'}`,
                description: `${exerciseCount} sets across ${uniqueExercises.length} exercises (${uniqueExercises.join(', ')})`,
                status: groupedWorkout.status,
                exercise_name: uniqueExercises.join(', '),
                workout_id: groupedWorkout.workout_id,
                exercise_id: groupedWorkout.exercises[0]?.exercise_id,
                library_tip: undefined,
                library_check_in_question: undefined,
              };
            }
          );

          allEvents.push(...workoutEvents);
        }
      } else if (selectedUserId) {
        // Load data for selected user only
        const users = await getUsers();
        const selectedUser = users.find((u) => u.id === selectedUserId);

        if (selectedUser) {
          const hpTransactions = await getUserTransactions(selectedUserId);
          const hpEvents: TimelineEvent[] = hpTransactions.map(
            (transaction: HpTransaction) => ({
              id: transaction.id,
              type: "hp_transaction",
              timestamp: transaction.created_at,
              user_id: selectedUserId,
              user_name: `${selectedUser.first_name} ${selectedUser.last_name}`,
              title: `HP Transaction: ${transaction.transaction_type}`,
              description: transaction.description || "No description",
              points: transaction.points_earned,
              transaction_type: transaction.transaction_type,
            })
          );

          allEvents.push(...hpEvents);

          // Fetch IP transactions for selected user
          const ipResponse = await fetch(
            `/api/ip-transactions/${selectedUserId}`
          );
          if (ipResponse.ok) {
            const ipTransactions = await ipResponse.json();
            const ipEvents: TimelineEvent[] = ipTransactions.map(
              (transaction: IpTransaction) => ({
                id: transaction.id,
                type: "ip_transaction",
                timestamp: transaction.created_at,
                user_id: selectedUserId,
                user_name: `${selectedUser.first_name} ${selectedUser.last_name}`,
                title: `IP Transaction: ${transaction.transaction_type}`,
                description: transaction.metadata
                  ? JSON.stringify(transaction.metadata)
                  : "No metadata",
                points: transaction.amount,
                transaction_type: transaction.transaction_type,
              })
            );

            allEvents.push(...ipEvents);
          }

          // Fetch check-in questions for selected user
          const checkInResponse = await fetch(
            `/api/check-in-questions/${selectedUserId}`
          );
          if (checkInResponse.ok) {
            const checkIns = await checkInResponse.json();
            const checkInEvents: TimelineEvent[] = checkIns.map(
              (checkIn: CheckInQuestion) => ({
                id: checkIn.id,
                type: "check_in_question",
                timestamp: checkIn.created_at,
                user_id: selectedUserId,
                user_name: `${selectedUser.first_name} ${selectedUser.last_name}`,
                title: `Check-in Question`,
                description:
                  checkIn.question_text || "Check-in question answered",
                transaction_type: "check_in_question",
              })
            );

            allEvents.push(...checkInEvents);
          }

          // Fetch appointments for selected user
          const appointmentsResponse = await fetch(
            `/api/appointments/${selectedUserId}`
          );
          if (appointmentsResponse.ok) {
            const appointments = await appointmentsResponse.json();
            const appointmentEvents: TimelineEvent[] = appointments.map(
              (appointment: Appointment) => {
                // Use start_time if available, otherwise created_at
                // Both should be in UTC from the database
                const timestamp =
                  appointment.created_at || appointment.start_time;

                return {
                  id: `appointment-${appointment.id}`,
                  type: "appointment",
                  timestamp: timestamp,
                  user_id: selectedUserId,
                  user_name: `${selectedUser.first_name} ${selectedUser.last_name}`,
                  title: `Appointment: ${
                    appointment.event_name || appointment.type
                  }`,
                  description:
                    appointment.location_value || "Appointment scheduled",
                  appointment_type: appointment.type,
                  status: appointment.status,
                  location_value: appointment.location_value,
                  invitee_name: appointment.invitee_name,
                  invitee_email: appointment.invitee_email,
                  appointment_id: appointment.id,
                  reschedule_url: appointment.reschedule_url,
                };
              }
            );

            allEvents.push(...appointmentEvents);
          }

          // Fetch workouts for selected user
          const workoutsResponse = await fetch(
            `/api/workouts/user/${selectedUserId}`
          );
          if (workoutsResponse.ok) {
            const workouts = await workoutsResponse.json();
            
            // Group workouts by workout_id AND date (each workout session should be separate on timeline)
            const groupedWorkouts = workouts.reduce((acc: Record<string, GroupedWorkout>, workout: Workout) => {
              const key = `${workout.id}-${workout.workout_date || workout.created_at?.split('T')[0]}`;
              if (!acc[key]) {
                acc[key] = {
                  workout_id: workout.id,
                  workout_date: workout.workout_date,
                  workout_name: workout.workout_name,
                  status: workout.status,
                  user_id: workout.user_id,
                  created_at: workout.created_at,
                  updated_at: workout.updated_at,
                  exercises: []
                };
              }
              acc[key].exercises.push({
                exercise: workout.exercise,
                exercise_id: workout.exercise_id,
                set_type: workout.set_type,
                set_id: workout.set_id,
                assigned_reps: workout.assigned_reps,
                assigned_weight_lbs: workout.assigned_weight_lbs,
                assigned_time: workout.assigned_time,
                note: workout.note
              });
              return acc;
            }, {});

            const workoutEvents: TimelineEvent[] = (Object.values(groupedWorkouts) as GroupedWorkout[]).map(
              (groupedWorkout: GroupedWorkout) => {
                const exerciseCount = groupedWorkout.exercises.length;
                const uniqueExercises = [...new Set(groupedWorkout.exercises.map((ex) => ex.exercise))];
                
                return {
                  id: `workout-group-${groupedWorkout.workout_id || 'unknown'}-${groupedWorkout.workout_date || groupedWorkout.created_at?.split('T')[0] || 'unknown'}`,
                  type: "workout",
                  timestamp: groupedWorkout.workout_date ? `${groupedWorkout.workout_date}T00:00:00Z` : (groupedWorkout.created_at || groupedWorkout.updated_at || new Date().toISOString()),
                  user_id: selectedUserId,
                  user_name: `${selectedUser.first_name} ${selectedUser.last_name}`,
                  title: `Workout: ${groupedWorkout.workout_name || 'Unknown Workout'}`,
                  description: `${exerciseCount} sets across ${uniqueExercises.length} exercises (${uniqueExercises.join(', ')})`,
                  status: groupedWorkout.status,
                  exercise_name: uniqueExercises.join(', '),
                  workout_id: groupedWorkout.workout_id,
                  exercise_id: groupedWorkout.exercises[0]?.exercise_id,
                  library_tip: undefined,
                  library_check_in_question: undefined,
                };
              }
            );

            allEvents.push(...workoutEvents);
          }
        }
      }

      // Sort events by timestamp (newest first)
      allEvents.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Store all events
      setAllEvents(allEvents);

      // Determine which date range to use for filtering
      let filterStartDate = startDate;
      let filterEndDate = endDate;

      // If a specific date range was passed, use that for filtering
      if (dateRange) {
        filterStartDate = dateRange.startDate;
        filterEndDate = dateRange.endDate;
      }

      // Set default date range if not set and no specific range provided
      if (allEvents.length > 0 && !filterStartDate && !filterEndDate && !dateRange) {
        const oldestEvent = allEvents[allEvents.length - 1];
        const today = new Date();

        // Set start date to oldest event or 30 days ago, whichever is earlier
        const suggestedStart = new Date(
          Math.min(
            new Date(oldestEvent.timestamp).getTime(),
            today.getTime() - 30 * 24 * 60 * 60 * 1000
          )
        );

        setStartDate(suggestedStart);
        setEndDate(today);
        setStartDateInput(formatDateForInput(suggestedStart));
        setEndDateInput(formatDateForInput(today));

        filterStartDate = suggestedStart;
        filterEndDate = today;
      }

      // Apply date filtering if we have a date range
      if (filterStartDate && filterEndDate) {
        const endOfDay = new Date(filterEndDate);
        endOfDay.setHours(23, 59, 59, 999);

        const filteredEvents = allEvents.filter((event) => {
          const eventDate = new Date(event.timestamp);
          return eventDate >= filterStartDate! && eventDate <= endOfDay;
        });
        setEvents(spreadOverlappingEvents(filteredEvents));
      } else {
        // No date range set, show all events
        setEvents(spreadOverlappingEvents(allEvents));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load timeline data"
      );
    } finally {
      setLoading(false);
    }
  }, [
    selectedUserId,
    showAllUsers,
    spreadOverlappingEvents,
    startDate,
    endDate,
  ]);

  // Create a wrapper function for event handlers
  const handleLoadTimelineData = useCallback(async () => {
    await loadTimelineData();
  }, [loadTimelineData]);

  // Expose the refetch function to parent component
  useEffect(() => {
    if (onRefetchReady) {
      onRefetchReady(handleLoadTimelineData);
    }
  }, [onRefetchReady, handleLoadTimelineData]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date),
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "hp_transaction":
        return "⚡";
      case "ip_transaction":
        return "💪";
      case "check_in_question":
        return "❓";
      case "appointment":
        return "📅";
      case "workout":
        return "🏋️";
      default:
        return "📝";
    }
  };

  const getEventColor = (
    transactionType?: string,
    eventType?: string,
    status?: string
  ) => {
    // Appointment-specific colors
    if (eventType === "appointment") {
      switch (status) {
        case "scheduled":
          return "bg-blue-100 border-blue-300";
        case "confirmed":
          return "bg-green-100 border-green-300";
        case "canceled":
          return "bg-red-100 border-red-300";
        case "completed":
          return "bg-purple-100 border-purple-300";
        default:
          return "bg-gray-100 border-gray-300";
      }
    }

    // Transaction-specific colors
    switch (transactionType) {
      case "exercise_pre_check":
      case "exercise_post_check":
        return "bg-blue-100 border-blue-300";
      case "daily_completion_bonus":
        return "bg-green-100 border-green-300";
      case "exercise_sync_bonus":
        return "bg-yellow-100 border-yellow-300";
      case "first_exercise":
        return "bg-purple-100 border-purple-300";
      case "level_bonus":
        return "bg-pink-100 border-pink-300";
      case "streak_bonus":
        return "bg-orange-100 border-orange-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  if (loading) {
    return (
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex items-center justify-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
          <span className='ml-3 text-gray-600'>Loading timeline...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='text-red-600 text-center py-8'>
          <div className='text-lg font-medium'>Error loading timeline</div>
          <div className='text-sm mt-2'>{error}</div>
          <button
            onClick={handleLoadTimelineData}
            className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-lg shadow p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold'>Activity Timeline</h2>
        <div className='flex items-center gap-4'>
          <div className='text-sm text-gray-600'>
            {events.length} events
            {showAllUsers
              ? " (all users)"
              : selectedUserId
              ? " (selected user)"
              : ""}
          </div>
          <button
            onClick={handleLoadTimelineData}
            disabled={loading}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            title='Refresh timeline data'
          >
            {loading ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                Loading...
              </>
            ) : (
              <>🔄 Refresh</>
            )}
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className='text-center py-8 text-gray-500'>No events found</div>
      ) : (
        <>
          {/* Date Range Controls */}
          <div className='mb-4 p-4 bg-gray-50 rounded-lg'>
            <div className='flex flex-col md:flex-row gap-4 items-end'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Start Date (YYYY-MM-DD)
                </label>
                <input
                  type='text'
                  placeholder='2024-01-01'
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className='p-2 border border-gray-300 rounded-md text-sm w-32'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  End Date (YYYY-MM-DD)
                </label>
                <input
                  type='text'
                  placeholder='2024-12-31'
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(e.target.value)}
                  className='p-2 border border-gray-300 rounded-md text-sm w-32'
                />
              </div>
              <div>
                <button
                  onClick={applyDateRange}
                  className='px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700'
                >
                  Apply Date Range
                </button>
              </div>
            </div>
          </div>

          <div className='relative'>
            {/* Timeline container */}
            <div className='relative h-20 bg-gray-100 rounded-lg overflow-y-visible'>
              {/* Single timeline line */}
              <div className='absolute top-1/2 left-4 right-4 h-0.5 bg-gray-300 transform -translate-y-1/2'></div>

              {/* Events */}
              <div className='relative h-full px-4 py-2 w-full'>
                {events.map((event) => {
                  // Use adjusted position if available, otherwise calculate from timestamp
                  let position: number;
                  if (event.adjustedPosition !== undefined) {
                    position = event.adjustedPosition;
                  } else {
                    // Calculate position based on actual timestamps
                    const eventTime = new Date(event.timestamp).getTime();
                    const oldestTime = new Date(
                      events[events.length - 1].timestamp
                    ).getTime();
                    const newestTime = new Date(events[0].timestamp).getTime();
                    const timeRange = newestTime - oldestTime;
                    position =
                      timeRange === 0
                        ? 50
                        : ((eventTime - oldestTime) / timeRange) * 100;
                  }

                  return (
                    <div
                      key={event.id}
                      className='absolute transform -translate-x-1/2 -translate-y-1/2'
                      style={{
                        left: `${4 + (position / 100) * 92}%`,
                        top: "50%",
                      }}
                    >
                      {/* Event marker */}
                      <div
                        className={`w-5 h-5 bg-white border-2 rounded-full transition-all duration-200 flex items-center justify-center text-xs shadow-sm z-20 ${
                          event.isClustered
                            ? event.isClusterRepresentative
                              ? "border-purple-400 bg-purple-50 cursor-pointer hover:border-purple-600 hover:bg-purple-100 hover:scale-110"
                              : "border-purple-300 bg-purple-25 cursor-default"
                            : "border-gray-400 cursor-pointer hover:border-blue-500 hover:bg-blue-50 hover:scale-110"
                        }`}
                        style={{
                          top: "50%",
                          transform: `translate(-50%, calc(-50% + ${
                            event.verticalOffset || 0
                          }px))`,
                        }}
                        onMouseEnter={() => handleMarkerMouseEnter(event.id)}
                        onMouseLeave={handleMarkerMouseLeave}
                        onClick={() => {
                          if (
                            event.clusterKey &&
                            event.isClustered &&
                            event.isClusterRepresentative
                          ) {
                            toggleClusterExpansion(event.clusterKey);
                          }
                        }}
                      >
                        {getEventIcon(event.type)}
                        {/* Cluster size indicator */}
                        {event.isClustered &&
                          event.clusterSize &&
                          event.clusterSize > 1 && (
                            <div className='absolute -top-1 -right-1 w-3 h-3 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center font-bold'>
                              {expandedClusters.has(event.clusterKey || '') 
                                ? (event.verticalOffset || 0) / 30 + 1 
                                : event.clusterSize}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tooltip box - positioned at top right corner of page */}
            <div
              className='fixed top-4 right-4 w-80 z-50 pointer-events-auto'
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
            >
              {hoveredEventId &&
                (() => {
                  const event = events.find((e) => e.id === hoveredEventId);
                  if (!event) return null;

                  const { date, time, relative } = formatTimestamp(
                    event.timestamp
                  );
                  return (
                    <div
                      className={`p-4 rounded-lg border shadow-lg bg-white/95 backdrop-blur-sm ${getEventColor(
                        event.transaction_type,
                        event.type,
                        event.status
                      )}`}
                    >
                      <div className='space-y-2'>
                        <div className='flex items-center space-x-2'>
                          <h3 className='font-medium text-gray-900 text-sm'>
                            {event.title}
                          </h3>
                          {event.points !== undefined &&
                            event.points !== null && (
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  event.type === "hp_transaction"
                                    ? "bg-green-100 text-green-800"
                                    : event.type === "ip_transaction"
                                    ? event.points >= 0
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {event.points >= 0 ? "+" : ""}
                                {event.points}{" "}
                                {event.type === "ip_transaction" ? "IP" : "HP"}
                              </span>
                            )}
                          {event.type === "appointment" && event.status && (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                event.status === "scheduled"
                                  ? "bg-blue-100 text-blue-800"
                                  : event.status === "confirmed"
                                  ? "bg-green-100 text-green-800"
                                  : event.status === "canceled"
                                  ? "bg-red-100 text-red-800"
                                  : event.status === "completed"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {event.status}
                            </span>
                          )}
                          {event.type === "workout" && event.status && (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                event.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : event.status === "scheduled"
                                  ? "bg-blue-100 text-blue-800"
                                  : event.status === "in_progress"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : event.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {event.status}
                            </span>
                          )}
                        </div>

                        <p className='text-xs text-gray-600'>
                          {event.description}
                        </p>

                        {/* Appointment-specific details */}
                        {event.type === "appointment" && (
                          <div className='space-y-1 text-xs text-gray-600'>
                            {event.appointment_id && (
                              <div className='flex items-center space-x-1'>
                                <span>🆔</span>
                                <span className='font-mono bg-gray-100 px-1 rounded'>
                                  ID: {event.appointment_id}
                                </span>
                              </div>
                            )}
                            {event.invitee_name && (
                              <div className='flex items-center space-x-1'>
                                <span>👤</span>
                                <span>{event.invitee_name}</span>
                              </div>
                            )}
                            {event.invitee_email && (
                              <div className='flex items-center space-x-1'>
                                <span>📧</span>
                                <span>{event.invitee_email}</span>
                              </div>
                            )}
                            {event.location_value && (
                              <div className='flex items-center space-x-1'>
                                <span>📍</span>
                                <span>{event.location_value}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Workout-specific details */}
                        {event.type === "workout" && (
                          <div className='space-y-1 text-xs text-gray-600'>
                            {event.workout_id && (
                              <div className='flex items-center space-x-1'>
                                <span>🆔</span>
                                <span className='font-mono bg-gray-100 px-1 rounded'>
                                  ID: {event.workout_id}
                                </span>
                              </div>
                            )}
                            {event.exercise_name && (
                              <div className='flex items-center space-x-1'>
                                <span>🏋️</span>
                                <span className='font-medium'>{event.exercise_name}</span>
                              </div>
                            )}
                            {event.status && (
                              <div className='flex items-center space-x-1'>
                                <span>📊</span>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full border ${
                                    event.status === 'completed'
                                      ? 'bg-green-100 text-green-800 border-green-200'
                                      : event.status === 'scheduled'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                                      : event.status === 'in_progress'
                                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                      : event.status === 'cancelled'
                                      ? 'bg-red-100 text-red-800 border-red-200'
                                      : 'bg-gray-100 text-gray-800 border-gray-200'
                                  }`}
                                >
                                  {event.status}
                                </span>
                              </div>
                            )}
                            {event.library_tip && (
                              <div className='mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-200'>
                                <div className='flex items-start space-x-1'>
                                  <span className='text-blue-600'>💡</span>
                                  <div>
                                    <span className='text-xs font-medium text-blue-800'>Library Tip:</span>
                                    <p className='text-xs text-blue-700 mt-1'>{event.library_tip}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {event.library_check_in_question && (
                              <div className='mt-2 p-2 bg-purple-50 rounded border-l-2 border-purple-200'>
                                <div className='flex items-start space-x-1'>
                                  <span className='text-purple-600'>❓</span>
                                  <div>
                                    <span className='text-xs font-medium text-purple-800'>Check-in Question:</span>
                                    <p className='text-xs text-purple-700 mt-1'>{event.library_check_in_question}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {!event.library_tip && !event.library_check_in_question && (
                              <div className='mt-2 p-2 bg-gray-50 rounded border-l-2 border-gray-200'>
                                <div className='flex items-center space-x-1'>
                                  <span className='text-gray-500'>ℹ️</span>
                                  <span className='text-xs text-gray-600 italic'>No tip or check-in question available.</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mark as Attended Button */}
                        {event.type === "appointment" &&
                          event.appointment_id &&
                          event.status === "scheduled" && (
                            <div className='pt-2 border-t border-gray-200 space-y-2'>
                              <button
                                onClick={() =>
                                  handleMarkAsAttended(event.appointment_id!)
                                }
                                disabled={markingAttended.has(
                                  event.appointment_id
                                )}
                                className={`w-full px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                                  markingAttended.has(event.appointment_id)
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                                }`}
                              >
                                {markingAttended.has(event.appointment_id) ? (
                                  <>
                                    <span className='inline-block animate-spin mr-1'>
                                      ⏳
                                    </span>
                                    Marking as Attended...
                                  </>
                                ) : (
                                  <>✅ Mark as Attended</>
                                )}
                              </button>
                              {onRescheduleClick && event.reschedule_url && (
                                <button
                                  onClick={() => {
                                    if (onRescheduleClick && event.reschedule_url) {
                                      onRescheduleClick(event.reschedule_url);
                                    }
                                  }}
                                  className="w-full px-3 py-2 text-xs font-medium rounded-md transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                                >
                                  🔄 Reschedule
                                </button>
                              )}
                            </div>
                          )}

                        <div className='space-y-1 text-xs text-gray-500'>
                          <div className='flex items-center space-x-1'>
                            <span>👤</span>
                            <span>{event.user_name}</span>
                          </div>
                          <div className='flex items-center space-x-1'>
                            <span>📅</span>
                            <span>
                              {date} at {time}
                            </span>
                          </div>
                          <div className='flex items-center space-x-1'>
                            <span>⏰</span>
                            <span>{relative}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>

            {/* Timeline labels */}
            <div className='flex justify-between items-center mt-2 text-xs text-gray-500 px-4'>
              <div className='flex-1'>
                {startDate && endDate ? (
                  <span>{startDate.toLocaleDateString()}</span>
                ) : events.length > 0 ? (
                  <span>
                    {formatTimestamp(events[events.length - 1].timestamp).date}
                  </span>
                ) : null}
              </div>

              <div className='flex-1 text-right'>
                {startDate && endDate ? (
                  <span>{endDate.toLocaleDateString()}</span>
                ) : events.length > 0 ? (
                  <span>{formatTimestamp(events[0].timestamp).date}</span>
                ) : null}
              </div>
            </div>

            {/* Event type legend */}
            <div className='mt-4 flex flex-wrap gap-3 text-xs'>
              <div className='flex items-center space-x-1'>
                <span className='text-sm'>⚡</span>
                <span>HP Transaction</span>
              </div>
              <div className='flex items-center space-x-1'>
                <span className='text-sm'>💪</span>
                <span>IP Transaction</span>
              </div>
              <div className='flex items-center space-x-1'>
                <span className='text-sm'>❓</span>
                <span>Check-in Question</span>
              </div>
              <div className='flex items-center space-x-1'>
                <span className='text-sm'>📅</span>
                <span>Appointment</span>
              </div>
              <div className='flex items-center space-x-1'>
                <span className='text-sm'>🏋️</span>
                <span>Workout</span>
              </div>
              <div className='flex items-center space-x-1'>
                <div className='w-3 h-3 border-2 border-purple-400 bg-purple-50 rounded-full'></div>
                <span>Clustered Events</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
