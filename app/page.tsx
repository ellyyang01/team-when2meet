'use client';

import React, { useState, useEffect } from 'react';
import ScheduleSelector from 'react-schedule-selector';
import { supabase } from '@/lib/supabase';

interface Weekend {
  id: string;
  label: string;
  start_date: string;
  display_order: number;
}

interface SnackSignup {
  id: string;
  weekend_id: string;
  day_of_week: 'sat' | 'sun';
  user_name: string;
}

interface HoveredSlotInfo {
  weekendId: string;
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
  const [weekends, setWeekends] = useState<Weekend[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Snack Sign-up States
  const [snackSignups, setSnackSignups] = useState<SnackSignup[]>([]);
  const [snackNameInput, setSnackNameInput] = useState('');

  // Hover Inspector State
  const [hoveredSlot, setHoveredSlot] = useState<HoveredSlotInfo | null>(null);

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

  useEffect(() => {
    fetchWeekends();
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

  const fetchWeekends = async () => {
    const { data } = await supabase
      .from('weekend_config')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (data && data.length > 0) {
      setWeekends(data);
    } else {
      setWeekends([
        { id: '1', label: 'Weekend 1: Aug 15 - Aug 16', start_date: '2026-08-15T00:00:00', display_order: 1 },
        { id: '2', label: 'Weekend 2: Aug 22 - Aug 23', start_date: '2026-08-22T00:00:00', display_order: 2 },
        { id: '3', label: 'Weekend 3: Aug 29 - Aug 30', start_date: '2026-08-29T00:00:00', display_order: 3 },
        { id: '4', label: 'Weekend 4: Sep 5 - Sep 6',   start_date: '2026-09-05T00:00:00', display_order: 4 },
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

  const handleAddSnackSignup = async (weekendId: string, dayOfWeek: 'sat' | 'sun') => {
    const name = snackNameInput.trim();
    if (!name) {
      alert('Please enter your name first.');
      return;
    }

    const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    const alreadySignedUp = snackSignups.some(
      (s) => s.weekend_id === weekendId && s.day_of_week === dayOfWeek && s.user_name.toLowerCase() === formattedName.toLowerCase()
    );

    if (alreadySignedUp) {
      alert(`${formattedName} is already signed up for snacks on this day!`);
      return;
    }

    const { error } = await supabase.from('snack_signups').insert([
      {
        poll_id: DEFAULT_POLL_ID,
        weekend_id: weekendId,
        day_of_week: dayOfWeek,
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

  const slotUserMap = new Map<string, string[]>();
  allAvailabilities.forEach((item) => {
    const key = getSlotKey(item.slot_time);
    const existing = slotUserMap.get(key) || [];
    if (!existing.includes(item.user_name)) {
      slotUserMap.set(key, [...existing, item.user_name]);
    }
  });

  const timeSlots: { hour: number; minute: number; label: string }[] = [];
  for (let h = 10; h < 19; h++) {
    const period = h >= 12 ? 'pm' : 'am';
    const displayHour = h > 12 ? h - 12 : h;

    timeSlots.push({ hour: h, minute: 0, label: `${displayHour}:00${period}` });
    timeSlots.push({ hour: h, minute: 30, label: `${displayHour}:30${period}` });
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b pb-4">
          <h1 className="text-3xl font-bold text-slate-800">Team Planner</h1>
          <p className="text-slate-600">
            Coordinate team availability and snack sign-ups across weekend sessions.
          </p>
        </header>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('availability')}
            className={`py-3 px-6 font-semibold border-b-2 transition-colors ${
              activeTab === 'availability'
                ? 'border-green-600 text-green-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📅 Weekend Availability
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
            {weekends.map((weekend) => {
              const satDate = parseLocalDate(weekend.start_date);
              const sunDate = new Date(satDate);
              sunDate.setDate(satDate.getDate() + 1);

              // Find all unique respondents who submitted time slots for THIS specific weekend
              const weekendRespondentSet = new Set<string>();
              allAvailabilities.forEach((item) => {
                if (!item?.slot_time || !item?.user_name) return;
                const d = new Date(item.slot_time);
                const isSat =
                  d.getFullYear() === satDate.getFullYear() &&
                  d.getMonth() === satDate.getMonth() &&
                  d.getDate() === satDate.getDate();
                const isSun =
                  d.getFullYear() === sunDate.getFullYear() &&
                  d.getMonth() === sunDate.getMonth() &&
                  d.getDate() === sunDate.getDate();

                if (isSat || isSun) {
                  weekendRespondentSet.add(item.user_name.trim());
                }
              });

              const weekendRespondentsList = Array.from(weekendRespondentSet);
              const weekendRespondentsCount = weekendRespondentsList.length;

              const isCurrentHoveredWeekend = hoveredSlot?.weekendId === weekend.id;

              return (
                <div key={weekend.id} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                  <h2 className="text-xl font-bold text-slate-800 border-b pb-2">{weekend.label}</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Schedule Selector */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-600 mb-3">Your Availability</h3>
                      <ScheduleSelector
                        startDate={satDate}
                        numDays={2}
                        minTime={10}
                        maxTime={19}
                        hourlyChunks={2}
                        timeFormat="h:mm a"
                        selection={selectedSlots}
                        onChange={setSelectedSlots}
                        selectedColor="#22c55e"
                        unselectedColor="#f1f5f9"
                      />
                    </div>

                    {/* Right Column: Heatmap Grid + Inspector Panel */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-sm font-semibold text-slate-600">Team Overlap</h3>
                        <span className="text-xs text-slate-500">
                          Respondents: {weekendRespondentsCount}
                        </span>
                      </div>

                      {/* SIDE-BY-SIDE HOVER INSPECTOR PANEL */}
                      {isCurrentHoveredWeekend && hoveredSlot ? (
                        <div className="bg-slate-900 text-white p-3.5 rounded-lg shadow-inner space-y-2 text-xs transition-all">
                          <div className="font-bold border-b border-slate-700 pb-1.5 text-slate-200 flex justify-between items-center">
                            <span>📅 {hoveredSlot.dayLabel} @ {hoveredSlot.timeLabel}</span>
                            <span className="text-[11px] font-normal text-slate-400">
                              {hoveredSlot.available.length}/{weekendRespondentsCount} Free
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-0.5">
                            {/* Available List */}
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

                            {/* Unavailable List */}
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
                        <div className="grid grid-cols-3 text-center font-semibold text-slate-600 border-b pb-2 mb-1">
                          <div>Time</div>
                          <div>{satDate.getMonth() + 1}/{satDate.getDate()} (Sat)</div>
                          <div>{sunDate.getMonth() + 1}/{sunDate.getDate()} (Sun)</div>
                        </div>

                        <div className="space-y-1">
                          {timeSlots.map((slot, i) => {
                            const satSlotDate = new Date(satDate.getFullYear(), satDate.getMonth(), satDate.getDate(), slot.hour, slot.minute);
                            const sunSlotDate = new Date(sunDate.getFullYear(), sunDate.getMonth(), sunDate.getDate(), slot.hour, slot.minute);

                            const satUsers = slotUserMap.get(getSlotKey(satSlotDate)) || [];
                            const sunUsers = slotUserMap.get(getSlotKey(sunSlotDate)) || [];

                            const satUnavailable = weekendRespondentsList.filter((u) => !satUsers.includes(u));
                            const sunUnavailable = weekendRespondentsList.filter((u) => !sunUsers.includes(u));

                            const satOpacity = weekendRespondentsCount > 0 ? satUsers.length / weekendRespondentsCount : 0;
                            const sunOpacity = weekendRespondentsCount > 0 ? sunUsers.length / weekendRespondentsCount : 0;

                            return (
                              <div key={i} className="grid grid-cols-3 gap-1 items-center h-6">
                                <div className="text-slate-400 text-right pr-2 text-[10px]">{slot.label}</div>

                                {/* Saturday Cell */}
                                <div
                                  onMouseEnter={() =>
                                    setHoveredSlot({
                                      weekendId: weekend.id,
                                      dayLabel: `${satDate.getMonth() + 1}/${satDate.getDate()} (Sat)`,
                                      timeLabel: slot.label,
                                      available: satUsers,
                                      unavailable: satUnavailable,
                                    })
                                  }
                                  style={{
                                    backgroundColor: satUsers.length > 0 ? `rgba(34, 197, 94, ${Math.max(satOpacity, 0.3)})` : '#f1f5f9',
                                  }}
                                  className="h-full rounded flex items-center justify-center font-bold text-green-900 text-[10px] cursor-pointer hover:ring-2 hover:ring-slate-800 transition-all"
                                >
                                  {satUsers.length > 0 ? satUsers.length : ''}
                                </div>

                                {/* Sunday Cell */}
                                <div
                                  onMouseEnter={() =>
                                    setHoveredSlot({
                                      weekendId: weekend.id,
                                      dayLabel: `${sunDate.getMonth() + 1}/${sunDate.getDate()} (Sun)`,
                                      timeLabel: slot.label,
                                      available: sunUsers,
                                      unavailable: sunUnavailable,
                                    })
                                  }
                                  style={{
                                    backgroundColor: sunUsers.length > 0 ? `rgba(34, 197, 94, ${Math.max(sunOpacity, 0.3)})` : '#f1f5f9',
                                  }}
                                  className="h-full rounded flex items-center justify-center font-bold text-green-900 text-[10px] cursor-pointer hover:ring-2 hover:ring-slate-800 transition-all"
                                >
                                  {sunUsers.length > 0 ? sunUsers.length : ''}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: SNACK SIGN-UP */}
        {activeTab === 'snacks' && (
          <div className="space-y-8">
            {weekends.map((weekend) => {
              const satDate = parseLocalDate(weekend.start_date);
              const sunDate = new Date(satDate);
              sunDate.setDate(satDate.getDate() + 1);

              const satSignups = snackSignups.filter((s) => s.weekend_id === weekend.id && s.day_of_week === 'sat');
              const sunSignups = snackSignups.filter((s) => s.weekend_id === weekend.id && s.day_of_week === 'sun');

              return (
                <div key={weekend.id} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                  <h2 className="text-xl font-bold text-slate-800 border-b pb-2">{weekend.label}</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Saturday Snack Box */}
                    <div className="border rounded-lg p-5 bg-slate-50 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-semibold text-slate-700">
                          {satDate.getMonth() + 1}/{satDate.getDate()} (Saturday) Snacks
                        </h3>
                        <button
                          onClick={() => handleAddSnackSignup(weekend.id, 'sat')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded transition"
                        >
                          + Sign Me Up
                        </button>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs text-slate-500 font-medium">Bringing Snacks:</span>
                        {satSignups.length === 0 ? (
                          <p className="text-sm italic text-slate-400">No one signed up yet.</p>
                        ) : (
                          <ul className="flex flex-wrap gap-2">
                            {satSignups.map((s) => (
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

                    {/* Sunday Snack Box */}
                    <div className="border rounded-lg p-5 bg-slate-50 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-semibold text-slate-700">
                          {sunDate.getMonth() + 1}/{sunDate.getDate()} (Sunday) Snacks
                        </h3>
                        <button
                          onClick={() => handleAddSnackSignup(weekend.id, 'sun')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded transition"
                        >
                          + Sign Me Up
                        </button>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs text-slate-500 font-medium">Bringing Snacks:</span>
                        {sunSignups.length === 0 ? (
                          <p className="text-sm italic text-slate-400">No one signed up yet.</p>
                        ) : (
                          <ul className="flex flex-wrap gap-2">
                            {sunSignups.map((s) => (
                              <li key={s.id} className="bg-white border text-slate-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                <span>😄 {s.user_name}</span>
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
