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

export default function Home() {
  const [userName, setUserName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([]);
  const [allAvailabilities, setAllAvailabilities] = useState<any[]>([]);
  const [weekends, setWeekends] = useState<Weekend[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  const handleSave = async () => {
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

  const totalUsers = new Set(allAvailabilities.map((a) => a.user_name)).size;

  const slotUserMap = new Map<string, string[]>();
  allAvailabilities.forEach((item) => {
    const key = getSlotKey(item.slot_time);
    const existing = slotUserMap.get(key) || [];
    if (!existing.includes(item.user_name)) {
      slotUserMap.set(key, [...existing, item.user_name]);
    }
  });

  // Generate explicit 30-min time slot labels (e.g., 10:00am, 10:30am)
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
          <h1 className="text-3xl font-bold text-slate-800">Weekend Availability Planner</h1>
          <p className="text-slate-600">
            Select your available time slots for Sat & Sun (10:00 AM – 7:00 PM).
          </p>
        </header>

        <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm border sticky top-4 z-10">
          <label className="font-semibold text-slate-700">Your Name:</label>
          <input
            type="text"
            placeholder="e.g. Alex"
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
              setIsSubmitted(false);
            }}
            className="border px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-1.5 rounded-md transition"
          >
            Save My Availability
          </button>
          {isSubmitted && <span className="text-sm text-green-600 font-medium">✓ Saved!</span>}
        </div>

        <div className="space-y-8">
          {weekends.map((weekend) => {
            const satDate = parseLocalDate(weekend.start_date);
            const sunDate = new Date(satDate);
            sunDate.setDate(satDate.getDate() + 1);

            return (
              <div key={weekend.id} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                <h2 className="text-xl font-bold text-slate-800 border-b pb-2">{weekend.label}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

                  <div>
                    <div className="flex justify-between items-baseline mb-3">
                      <h3 className="text-sm font-semibold text-slate-600">Team Overlap</h3>
                      <span className="text-xs text-slate-500">Respondents: {totalUsers}</span>
                    </div>

                    <div className="border rounded bg-white p-2 text-xs">
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

                          const satOpacity = totalUsers > 0 ? satUsers.length / totalUsers : 0;
                          const sunOpacity = totalUsers > 0 ? sunUsers.length / totalUsers : 0;

                          return (
                            <div key={i} className="grid grid-cols-3 gap-1 items-center h-6">
                              <div className="text-slate-400 text-right pr-2 text-[10px]">{slot.label}</div>
                              
                              <div
                                title={satUsers.length > 0 ? `${satUsers.length}/${totalUsers} free:${satUsers.join(', ')}` : '0 available'}
                                style={{
                                  backgroundColor: satUsers.length > 0 ? `rgba(34, 197, 94, ${Math.max(satOpacity, 0.3)})` : '#f1f5f9',
                                }}
                                className="h-full rounded flex items-center justify-center font-bold text-green-900 text-[10px]"
                              >
                                {satUsers.length > 0 ? satUsers.length : ''}
                              </div>

                              <div
                                title={sunUsers.length > 0 ? `${sunUsers.length}/${totalUsers} free:${sunUsers.join(', ')}` : '0 available'}
                                style={{
                                  backgroundColor: sunUsers.length > 0 ? `rgba(34, 197, 94, ${Math.max(sunOpacity, 0.3)})` : '#f1f5f9',
                                }}
                                className="h-full rounded flex items-center justify-center font-bold text-green-900 text-[10px]"
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
      </div>
    </main>
  );
}
