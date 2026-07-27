'use client';

import React, { useState, useEffect } from 'react';
import ScheduleSelector from 'react-schedule-selector';
import { supabase } from '@/lib/supabase';

interface Session {
  id: string;
  label: string;
  dates: string[];
  start_hour: number;
  end_hour: number;
  display_order: number;
  is_active: boolean;
}

interface SnackSignup {
  id: string;
  session_id: string;
  date_str: string;
  user_name: string;
}

interface HoveredSlotInfo {
  sessionId: string;
  dayLabel: string;
  timeLabel: string;
  available: string[];
  unavailable: string[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'availability' | 'snacks'>('availability');
  const [userName, setUserName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([]);
  const [allAvailabilities, setAllAvailabilities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Global Session Status Filter ('active' | 'inactive' | 'all')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // Snack Sign-up States
  const [snackSignups, setSnackSignups] = useState<SnackSignup[]>([]);
  const [snackNameInput, setSnackNameInput] = useState('');

  // Hover Inspector State
  const [hoveredSlot, setHoveredSlot] = useState<HoveredSlotInfo | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [modalLabel, setModalLabel] = useState('');
  const [modalDates, setModalDates] = useState<string[]>(['']);
  const [modalStartHour, setModalStartHour] = useState(10);
  const [modalEndHour, setModalEndHour] = useState(19);

  const DEFAULT_POLL_ID = '00000000-0000-0000-0000-000000000001';

  const getSlotKey = (d: Date | string) => {
    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}-${hours}:${minutes}`;
  };

  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0);
  };

  const formatDateShort = (d: Date) => {
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    return `${d.getMonth() + 1}/${d.getDate()} (${dayName})`;
  };

  useEffect(() => {
    fetchSessions();
    fetchAvailabilities();
    fetchSnackSignups();
  }, []);

  useEffect(() => {
    if (!userName.trim()) {
      setSelectedSlots([]);
      return;
    }

    const userEntries = allAvailabilities.filter(
      (item) => item.user_name.trim().toLowerCase() === userName.trim().toLowerCase()
    );

    const userDates = userEntries.map((item) => new Date(item.slot_time));
    setSelectedSlots(userDates);
  }, [userName, allAvailabilities]);

  const handleNameChange = (val: string) => {
    setUserName(val);
    setSnackNameInput(val);
    setIsSubmitted(false);
  };

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('session_config')
      .select('*')
      .order('display_order', { ascending: true });

    if (data && data.length > 0) {
      setSessions(data);
    } else {
      setSessions([
        {
          id: '1',
          label: 'Week 1: Aug 15 - Aug 16',
          dates: ['2026-08-15', '2026-08-16'],
          start_hour: 10,
          end_hour: 19,
          display_order: 1,
          is_active: true,
        },
        {
          id: '2',
          label: 'Week 2: Aug 22 - Aug 23',
          dates: ['2026-08-22', '2026-08-23'],
          start_hour: 10,
          end_hour: 19,
          display_order: 2,
          is_active: true,
        },
      ]);
    }
  };

  const fetchAvailabilities = async () => {
    const { data } = await supabase
      .from('availabilities')
      .select('*')
      .eq('poll_id', DEFAULT_POLL_ID);

    if (data) setAllAvailabilities(data);
  };

  const fetchSnackSignups = async () => {
    const { data } = await supabase
      .from('snack_signups')
      .select('*')
      .eq('poll_id', DEFAULT_POLL_ID);

    if (data) setSnackSignups(data);
  };

  const handleSaveAvailability = async () => {
    if (!userName.trim()) {
      alert('Please enter your name first.');
      return;
    }

    const raw = userName.trim();
    const formattedName = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();

    await supabase
      .from('availabilities')
      .delete()
      .eq('poll_id', DEFAULT_POLL_ID)
      .ilike('user_name', formattedName);

    const rowsToInsert = selectedSlots.map((slot) => ({
      poll_id: DEFAULT_POLL_ID,
      user_name: formattedName,
      slot_time: slot.toISOString(),
    }));

    if (rowsToInsert.length > 0) {
      const { error } = await supabase
        .from('availabilities')
        .insert(rowsToInsert);

      if (error) {
        alert(`Error saving: ${error.message}`);
        return;
      }
    }

    setIsSubmitted(true);
    await fetchAvailabilities();
  };

  const handleToggleActive = async (session: Session) => {
    const newStatus = !session.is_active;

    setSessions((prev) =>
      prev.map((s) => (s.id === session.id ? { ...s, is_active: newStatus } : s))
    );

    const { error } = await supabase
      .from('session_config')
      .update({ is_active: newStatus })
      .eq('id', session.id);

    if (error) {
      alert(`Error updating session status: ${error.message}`);
      await fetchSessions();
    }
  };

  const handleMoveSession = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredSessions.length) return;

    const currentSession = filteredSessions[index];
    const targetSession = filteredSessions[targetIndex];

    const { error: err1 } = await supabase
      .from('session_config')
      .update({ display_order: targetSession.display_order })
      .eq('id', currentSession.id);

    const { error: err2 } = await supabase
      .from('session_config')
      .update({ display_order: currentSession.display_order })
      .eq('id', targetSession.id);

    if (err1 || err2) {
      alert('Error reordering sessions.');
    }

    await fetchSessions();
  };

  const openAddModal = () => {
    setEditingSessionId(null);
    setModalLabel('');
    setModalDates(['']);
    setModalStartHour(10);
    setModalEndHour(19);
    setShowModal(true);
  };

  const openEditModal = (session: Session) => {
    setEditingSessionId(session.id);
    setModalLabel(session.label);
    setModalDates(session.dates.length > 0 ? session.dates : ['']);
    setModalStartHour(session.start_hour);
    setModalEndHour(session.end_hour);
    setShowModal(true);
  };

  const handleDateChange = (index: number, val: string) => {
    const updated = [...modalDates];
    updated[index] = val;
    setModalDates(updated);
  };

  // SMART DATE AUTO-FILL: Default newly added field to (last date + 1 day)
  const addDateField = () => {
    if (modalDates.length > 0) {
      const lastDateVal = modalDates[modalDates.length - 1];
      if (lastDateVal && lastDateVal.trim() !== '') {
        const [year, month, day] = lastDateVal.split('-').map(Number);
        const nextDate = new Date(year, month - 1, day + 1);

        const nextYear = nextDate.getFullYear();
        const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
        const nextDay = String(nextDate.getDate()).padStart(2, '0');

        const nextDateStr = `${nextYear}-${nextMonth}-${nextDay}`;
        setModalDates([...modalDates, nextDateStr]);
        return;
      }
    }

    setModalDates([...modalDates, '']);
  };

  const removeDateField = (index: number) => {
    if (modalDates.length === 1) return;
    setModalDates(modalDates.filter((_, i) => i !== index));
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const validDates = modalDates.filter((d) => d.trim() !== '');

    if (!modalLabel.trim() || validDates.length === 0) {
      alert('Please provide a session title and select at least one date.');
      return;
    }

    if (editingSessionId) {
      const { error } = await supabase
        .from('session_config')
        .update({
          label: modalLabel.trim(),
          dates: validDates,
          start_hour: Number(modalStartHour),
          end_hour: Number(modalEndHour),
        })
        .eq('id', editingSessionId);

      if (error) {
        alert(`Error updating session: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from('session_config').insert([
        {
          poll_id: DEFAULT_POLL_ID,
          label: modalLabel.trim(),
          dates: validDates,
          start_hour: Number(modalStartHour),
          end_hour: Number(modalEndHour),
          display_order: sessions.length + 1,
          is_active: true,
        },
      ]);

      if (error) {
        alert(`Error creating session: ${error.message}`);
        return;
      }
    }

    setShowModal(false);
    await fetchSessions();
  };

  const handleAddSnackSignup = async (sessionId: string, dateStr: string) => {
    const name = snackNameInput.trim();
    if (!name) {
      alert('Please enter your name first.');
      return;
    }

    const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    const alreadySignedUp = snackSignups.some(
      (s) =>
        (s.session_id === sessionId || (s as any).weekend_id === sessionId) &&
        (s.date_str === dateStr || (s as any).day_of_week === dateStr) &&
        s.user_name.toLowerCase() === formattedName.toLowerCase()
    );

    if (alreadySignedUp) {
      alert(`${formattedName} is already signed up for snacks on this date!`);
      return;
    }

    const { error } = await supabase.from('snack_signups').insert([
      {
        poll_id: DEFAULT_POLL_ID,
        session_id: sessionId,
        weekend_id: sessionId,
        day_of_week: dateStr,
        date_str: dateStr,
        user_name: formattedName,
      },
    ]);

    if (error) {
      alert(`Error adding snack sign-up: ${error.message}`);
      return;
    }

    await fetchSnackSignups();
  };

  const handleRemoveSnackSignup = async (id: string) => {
    const { error } = await supabase.from('snack_signups').delete().eq('id', id);
    if (error) {
      alert(`Error removing sign-up: ${error.message}`);
      return;
    }
    await fetchSnackSignups();
  };

  const filteredSessions = sessions.filter((session) => {
    if (statusFilter === 'active') return session.is_active;
    if (statusFilter === 'inactive') return !session.is_active;
    return true;
  });

  const slotUserMap = new Map<string, string[]>();
  allAvailabilities.forEach((item) => {
    const key = getSlotKey(item.slot_time);
    const existing = slotUserMap.get(key) || [];
    if (!existing.includes(item.user_name)) {
      slotUserMap.set(key, [...existing, item.user_name]);
    }
  });

  const generateTimeSlots = (startH: number, endH: number) => {
    const slots: { hour: number; minute: number; label: string }[] = [];
    for (let h = startH; h < endH; h++) {
      const period = h >= 12 ? 'pm' : 'am';
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;

      slots.push({ hour: h, minute: 0, label: `${displayHour}:00${period}` });
      slots.push({ hour: h, minute: 30, label: `${displayHour}:30${period}` });
    }
    return slots;
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Team Planner</h1>
            <p className="text-slate-600">
              Coordinate team availability and snack sign-ups across custom meeting sessions.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow transition flex items-center gap-1.5"
          >
            <span>➕</span> Add Meeting Session
          </button>
        </header>

        {/* Tab Switcher & Active/Inactive Filter Bar */}
        <div className="flex flex-wrap justify-between items-center border-b border-slate-200 gap-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('availability')}
              className={`py-3 px-6 font-semibold border-b-2 transition-colors ${
                activeTab === 'availability'
                  ? 'border-green-600 text-green-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📅 Availability Grid
            </button>
            <button
              onClick={() => setActiveTab('snacks')}
              className={`py-3 px-6 font-semibold border-b-2 transition-colors ${
                activeTab === 'snacks'
                  ? 'border-green-600 text-green-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              🍕 Snack Sign-up
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'active'
                  ? 'bg-white text-slate-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🟢 Active ({sessions.filter((s) => s.is_active).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'inactive'
                  ? 'bg-white text-slate-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚪ Inactive ({sessions.filter((s) => !s.is_active).length})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📂 All ({sessions.length})
            </button>
          </div>
        </div>

        {/* User Name Bar */}
        <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm border sticky top-4 z-10">
          <label className="font-semibold text-slate-700">Your Name:</label>
          <input
            type="text"
            placeholder="e.g. Alex"
            value={userName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="border px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {activeTab === 'availability' && (
            <>
              <button
                onClick={handleSaveAvailability}
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-1.5 rounded-md transition"
              >
                Save My Availability
              </button>
              {isSubmitted && <span className="text-sm text-green-600 font-medium">✓ Saved!</span>}
            </>
          )}
        </div>

        {/* TAB 1: AVAILABILITY GRID */}
        {activeTab === 'availability' && (
          <div className="space-y-8">
            {filteredSessions.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-lg border text-slate-500 italic">
                No {statusFilter} meeting sessions found.
              </div>
            ) : (
              filteredSessions.map((session, sessionIdx) => {
                const sessionDates = session.dates.map((dStr) => parseLocalDate(dStr));
                const firstDate = sessionDates[0] || new Date();
                const numDays = sessionDates.length;
                const timeSlots = generateTimeSlots(session.start_hour, session.end_hour);

                const sessionRespondentSet = new Set<string>();
                allAvailabilities.forEach((item) => {
                  if (!item?.slot_time || !item?.user_name) return;
                  const slotD = new Date(item.slot_time);

                  const matchesSession = sessionDates.some(
                    (d) =>
                      d.getFullYear() === slotD.getFullYear() &&
                      d.getMonth() === slotD.getMonth() &&
                      d.getDate() === slotD.getDate()
                  );

                  if (matchesSession) {
                    sessionRespondentSet.add(item.user_name.trim());
                  }
                });

                const sessionRespondentsList = Array.from(sessionRespondentSet);
                const sessionRespondentsCount = sessionRespondentsList.length;
                const isCurrentHoveredSession = hoveredSlot?.sessionId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`bg-white p-6 rounded-lg shadow-sm border space-y-4 transition-all ${
                      !session.is_active ? 'opacity-70 bg-slate-50' : ''
                    }`}
                  >
                    <div className="flex flex-wrap justify-between items-center border-b pb-2 gap-2">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800">{session.label}</h2>

                        <button
                          onClick={() => handleToggleActive(session)}
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border transition ${
                            session.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                          }`}
                          title="Click to toggle Active/Inactive"
                        >
                          {session.is_active ? '🟢 Active' : '⚪ Inactive'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          disabled={sessionIdx === 0}
                          onClick={() => handleMoveSession(sessionIdx, 'up')}
                          className="text-xs border px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 disabled:opacity-30 text-slate-600"
                          title="Move Up"
                        >
                          ⬆️ Up
                        </button>
                        <button
                          disabled={sessionIdx === filteredSessions.length - 1}
                          onClick={() => handleMoveSession(sessionIdx, 'down')}
                          className="text-xs border px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 disabled:opacity-30 text-slate-600"
                          title="Move Down"
                        >
                          ⬇️ Down
                        </button>
                        <button
                          onClick={() => openEditModal(session)}
                          className="text-xs text-slate-600 hover:text-blue-600 font-medium border px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 transition"
                        >
                          ✏️ Edit Title & Dates
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Schedule Selector (Horizontal Grid) */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-600 mb-3">Your Availability</h3>
                        <ScheduleSelector
                          startDate={firstDate}
                          numDays={numDays}
                          minTime={session.start_hour}
                          maxTime={session.end_hour}
                          hourlyChunks={2}
                          timeFormat="h:mm a"
                          dateFormat="M/D"
                          selection={selectedSlots}
                          onChange={setSelectedSlots}
                          selectedColor="#22c55e"
                          unselectedColor="#f1f5f9"
                        />
                      </div>

                      {/* Right: Heatmap Grid */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-sm font-semibold text-slate-600">Team Overlap</h3>
                          <span className="text-xs text-slate-500">
                            Respondents: {sessionRespondentsCount}
                          </span>
                        </div>

                        {/* HOVER INSPECTOR PANEL */}
                        {isCurrentHoveredSession && hoveredSlot ? (
                          <div className="bg-slate-900 text-white p-3.5 rounded-lg shadow-inner space-y-2 text-xs transition-all">
                            <div className="font-bold border-b border-slate-700 pb-1.5 text-slate-200 flex justify-between items-center">
                              <span>📅 {hoveredSlot.dayLabel} @ {hoveredSlot.timeLabel}</span>
                              <span className="text-[11px] font-normal text-slate-400">
                                {hoveredSlot.available.length}/{sessionRespondentsCount} Free
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-0.5">
                              <div className="space-y-1 border-r border-slate-800 pr-2">
                                <span className="text-emerald-400 font-semibold block">
                                  ✅ Available ({hoveredSlot.available.length})
                                </span>
                                {hoveredSlot.available.length > 0 ? (
                                  <p className="text-slate-300 leading-relaxed font-medium">
                                    {hoveredSlot.available.join(', ')}
                                  </p>
                                ) : (
                                  <p className="text-slate-500 italic">None</p>
                                )}
                              </div>

                              <div className="space-y-1 pl-1">
                                <span className="text-rose-400 font-semibold block">
                                  ❌ Unavailable ({hoveredSlot.unavailable.length})
                                </span>
                                {hoveredSlot.unavailable.length > 0 ? (
                                  <p className="text-slate-300 leading-relaxed font-medium">
                                    {hoveredSlot.unavailable.join(', ')}
                                  </p>
                                ) : (
                                  <p className="text-slate-500 italic">None</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-100 p-3 rounded-lg text-xs text-slate-500 italic text-center border border-dashed border-slate-300">
                            Hover over any time slot below to inspect who is available and who is busy.
                          </div>
                        )}

                        {/* Heatmap Table */}
                        <div className="border rounded bg-white p-2 text-xs" onMouseLeave={() => setHoveredSlot(null)}>
                          <div
                            className="grid text-center font-semibold text-slate-600 border-b pb-2 mb-1"
                            style={{
                              gridTemplateColumns: `60px repeat(${sessionDates.length}, minmax(0, 1fr))`,
                            }}
                          >
                            <div>Time</div>
                            {sessionDates.map((d, idx) => (
                              <div key={idx}>{formatDateShort(d)}</div>
                            ))}
                          </div>

                          <div className="space-y-1">
                            {timeSlots.map((slot, i) => (
                              <div
                                key={i}
                                className="grid gap-1 items-center h-6"
                                style={{
                                  gridTemplateColumns: `60px repeat(${sessionDates.length}, minmax(0, 1fr))`,
                                }}
                              >
                                <div className="text-slate-400 text-right pr-2 text-[10px]">{slot.label}</div>

                                {sessionDates.map((d, dIdx) => {
                                  const slotDate = new Date(
                                    d.getFullYear(),
                                    d.getMonth(),
                                    d.getDate(),
                                    slot.hour,
                                    slot.minute
                                  );

                                  const users = slotUserMap.get(getSlotKey(slotDate)) || [];
                                  const unavailable = sessionRespondentsList.filter((u) => !users.includes(u));
                                  const opacity = sessionRespondentsCount > 0 ? users.length / sessionRespondentsCount : 0;

                                  return (
                                    <div
                                      key={dIdx}
                                      onMouseEnter={() =>
                                        setHoveredSlot({
                                          sessionId: session.id,
                                          dayLabel: formatDateShort(d),
                                          timeLabel: slot.label,
                                          available: users,
                                          unavailable: unavailable,
                                        })
                                      }
                                      style={{
                                        backgroundColor: users.length > 0 ? `rgba(34, 197, 94, ${Math.max(opacity, 0.3)})` : '#f1f5f9',
                                      }}
                                      className="h-full rounded flex items-center justify-center font-bold text-green-900 text-[10px] cursor-pointer hover:ring-2 hover:ring-slate-800 transition-all"
                                    >
                                      {users.length > 0 ? users.length : ''}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: SNACK SIGN-UP */}
        {activeTab === 'snacks' && (
          <div className="space-y-8">
            {filteredSessions.map((session) => (
              <div key={session.id} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                <div className="flex items-center gap-3 border-b pb-2">
                  <h2 className="text-xl font-bold text-slate-800">{session.label}</h2>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                      session.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    {session.is_active ? '🟢 Active' : '⚪ Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {session.dates.map((dateStr, idx) => {
                    const d = parseLocalDate(dateStr);
                    const daySignups = snackSignups.filter(
                      (s) =>
                        (s.session_id === session.id || (s as any).weekend_id === session.id) &&
                        (s.date_str === dateStr || (s as any).day_of_week === dateStr)
                    );

                    return (
                      <div key={idx} className="border rounded-lg p-5 bg-slate-50 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                          <h3 className="font-semibold text-slate-700">
                            {formatDateShort(d)} Snacks
                          </h3>
                          <button
                            onClick={() => handleAddSnackSignup(session.id, dateStr)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded transition"
                          >
                            + Sign Me Up
                          </button>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs text-slate-500 font-medium">Bringing Snacks:</span>
                          {daySignups.length === 0 ? (
                            <p className="text-sm italic text-slate-400">No one signed up yet.</p>
                          ) : (
                            <ul className="flex flex-wrap gap-2">
                              {daySignups.map((s) => (
                                <li key={s.id} className="bg-white border text-slate-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                  <span>😊 {s.user_name}</span>
                                  <button
                                    onClick={() => handleRemoveSnackSignup(s.id)}
                                    className="text-slate-400 hover:text-red-500 font-bold ml-1"
                                    title="Remove sign-up"
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT MEETING SESSION */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {editingSessionId ? 'Edit Meeting Session' : 'Add New Meeting Session'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Title / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Week 5: Mid-season Code Sprint"
                  value={modalLabel}
                  onChange={(e) => setModalLabel(e.target.value)}
                  className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* CALENDAR DATE PICKERS */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">Meeting Dates (Calendar Picker)</label>

                {modalDates.map((dVal, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={dVal}
                      onChange={(e) => handleDateChange(idx, e.target.value)}
                      className="border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 w-full"
                      required
                    />
                    {modalDates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDateField(idx)}
                        className="text-red-500 hover:text-red-700 font-bold px-2 py-1"
                        title="Remove date"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addDateField}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold mt-1 inline-flex items-center gap-1"
                >
                  ➕ Add Another Date
                </button>
              </div>

              {/* TIME RANGE SELECTORS */}
              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <select
                    value={modalStartHour}
                    onChange={(e) => setModalStartHour(Number(e.target.value))}
                    className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <select
                    value={modalEndHour}
                    onChange={(e) => setModalEndHour(Number(e.target.value))}
                    className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-md text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                >
                  {editingSessionId ? 'Save Changes' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
