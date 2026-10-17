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

interface TeamMember {
  id: string;
  name: string;
}

interface TournamentVote {
  id: string;
  user_name: string;
  selection_1: string[] | null;
  selection_2: string[] | null;
  selection_3: string[] | null;
  volunteer_note: string | null;
}

const POLL_ID = '00000000-0000-0000-0000-000000000001';

const TRACKS = [
  {
    id: 'Euclid',
    name: 'Euclid Track',
    pattern: 'All Saturdays',
    w1: 'Sat 11/21/2026',
    w4: 'Sat 2/20/2027',
  },
  {
    id: 'Gauss',
    name: 'Gauss Track',
    pattern: 'Sun then Sat',
    w1: 'Sun 11/22/2026',
    w4: 'Sat 2/20/2027',
  },
  {
    id: 'Turing',
    name: 'Turing Track',
    pattern: 'Sat then Sun',
    w1: 'Sat 11/21/2026',
    w4: 'Sun 2/21/2027',
  },
  {
    id: 'Descartes',
    name: 'Descartes Track',
    pattern: 'All Sundays',
    w1: 'Sun 11/22/2026',
    w4: 'Sun 2/21/2027',
  },
];

const W2_OPTS = [
  { id: '2026-12-12', label: 'Sat, Dec 12, 2026' },
  { id: '2026-12-13', label: 'Sun, Dec 13, 2026' },
];

const W3_OPTS = [
  { id: '2027-01-23', label: 'Sat, Jan 23, 2027' },
  { id: '2027-01-24', label: 'Sun, Jan 24, 2027' },
];

export default function Home() {
  const [tab, setTab] = useState<'availability' | 'snacks' | 'tournaments'>('availability');
  const [userName, setUserName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([]);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  const [roster, setRoster] = useState<TeamMember[]>([]);
  const [newMember, setNewMember] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active');

  const [snacks, setSnacks] = useState<SnackSignup[]>([]);
  const [votes, setVotes] = useState<TournamentVote[]>([]);
  const [sel1, setSel1] = useState<string[]>([]);
  const [sel2, setSel2] = useState<string[]>([]);
  const [sel3, setSel3] = useState<string[]>([]);
  const [volNote, setVolNote] = useState('');
  const [voteSaved, setVoteSaved] = useState(false);

  const [hover, setHover] = useState<{ label: string; free: string[]; busy: string[] } | null>(null);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [mLabel, setMLabel] = useState('');
  const [mDates, setMDates] = useState<string[]>(['']);
  const [mStart, setMStart] = useState(10);
  const [mEnd, setMEnd] = useState(19);

  const parseDate = (s: string) => {
    const [y, m, d] = s.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const fmtDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} (${d.toLocaleDateString('en-US', { weekday: 'short' })})`;

  const slotKey = (d: Date | string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}-${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  };

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  useEffect(() => {
    loadAll();
    if (localStorage.getItem('is_team_admin') === 'true') setIsAdmin(true);
  }, []);

  const loadAll = async () => {
    const [sRes, aRes, snRes, rRes, vRes] = await Promise.all([
      supabase.from('session_config').select('*').order('display_order', { ascending: true }),
      supabase.from('availabilities').select('*').eq('poll_id', POLL_ID),
      supabase.from('snack_signups').select('*').eq('poll_id', POLL_ID),
      supabase.from('team_roster').select('*').order('name', { ascending: true }),
      supabase.from('tournament_votes').select('*').eq('poll_id', POLL_ID),
    ]);

    if (sRes.data) setSessions(sRes.data);
    if (aRes.data) setAvailabilities(aRes.data);
    if (snRes.data) setSnacks(snRes.data);
    if (rRes.data && rRes.data.length > 0) {
      setRoster(rRes.data);
    } else {
      setRoster([
        'Elaine', 'Emma', 'Ellie', 'Aranya', 'Mananya',
        'Joseph', 'Jonah', 'Jacob', 'Rohan', 'Thomas',
        'Max', 'Vivian', 'Emily', 'Ethan',
      ].map((n, i) => ({ id: String(i + 1), name: n })));
    }
    if (vRes.data) setVotes(vRes.data);
  };

  useEffect(() => {
    if (!userName.trim()) {
      setSelectedSlots([]);
      setSel1([]);
      setSel2([]);
      setSel3([]);
      setVolNote('');
      return;
    }
    const clean = userName.trim().toLowerCase();
    const userSlots = availabilities.filter((a) => a.user_name.trim().toLowerCase() === clean);
    setSelectedSlots(userSlots.map((a) => new Date(a.slot_time)));

    const vote = votes.find((v) => v.user_name.trim().toLowerCase() === clean);
    if (vote) {
      setSel1(Array.isArray(vote.selection_1) ? vote.selection_1 : []);
      setSel2(Array.isArray(vote.selection_2) ? vote.selection_2 : []);
      setSel3(Array.isArray(vote.selection_3) ? vote.selection_3 : []);
      setVolNote(vote.volunteer_note || '');
    } else {
      setSel1([]);
      setSel2([]);
      setSel3([]);
      setVolNote('');
    }
  }, [userName, availabilities, votes]);

  const verifiedMember = roster.find((m) => m.name.toLowerCase() === userName.trim().toLowerCase());
  const isVerified = Boolean(verifiedMember);
  const activeName = verifiedMember ? verifiedMember.name : userName.trim();

  const handleSaveAvail = async () => {
    if (!isVerified) return alert('Select your verified roster name first.');
    await supabase.from('availabilities').delete().eq('poll_id', POLL_ID).ilike('user_name', activeName);
    if (selectedSlots.length > 0) {
      await supabase.from('availabilities').insert(
        selectedSlots.map((s) => ({ poll_id: POLL_ID, user_name: activeName, slot_time: s.toISOString() }))
      );
    }
    setIsSaved(true);
    const { data } = await supabase.from('availabilities').select('*').eq('poll_id', POLL_ID);
    if (data) setAvailabilities(data);
  };

  const handleSaveVote = async () => {
    if (!isVerified) return alert('Select your verified roster name first.');
    if (!sel1.length && !sel2.length && !sel3.length && !volNote.trim()) {
      return alert('Select at least one tournament preference or enter a volunteer note.');
    }
    const prev = votes.find((v) => v.user_name.trim().toLowerCase() === activeName.toLowerCase());
    await supabase.from('tournament_votes').delete().eq('poll_id', POLL_ID).ilike('user_name', activeName);

    const { error } = await supabase.from('tournament_votes').insert([{
      poll_id: POLL_ID,
      user_name: activeName,
      selection_1: sel1.length ? sel1 : prev?.selection_1 || [],
      selection_2: sel2.length ? sel2 : prev?.selection_2 || [],
      selection_3: sel3.length ? sel3 : prev?.selection_3 || [],
      volunteer_note: volNote.trim() || prev?.volunteer_note || '',
    }]);

    if (error) alert(`Error saving vote: ${error.message}`);
    setVoteSaved(true);
    const { data } = await supabase.from('tournament_votes').select('*').eq('poll_id', POLL_ID);
    if (data) setVotes(data);
  };

  const handleSnack = async (sid: string, date: string, funds?: boolean) => {
    const targetName = funds ? 'Team Funds' : activeName;
    if (!funds && !isVerified) return alert('Select your verified roster name first.');
    const exists = snacks.some(
      (s) => (s.session_id === sid || (s as any).weekend_id === sid) &&
             (s.date_str === date || (s as any).day_of_week === date) &&
             s.user_name.toLowerCase() === targetName.toLowerCase()
    );
    if (exists) return alert(`${targetName} is already signed up!`);

    await supabase.from('snack_signups').insert([{
      poll_id: POLL_ID, session_id: sid, weekend_id: sid, date_str: date, day_of_week: date, user_name: targetName
    }]);
    const { data } = await supabase.from('snack_signups').select('*').eq('poll_id', POLL_ID);
    if (data) setSnacks(data);
  };

  const removeSnack = async (id: string) => {
    await supabase.from('snack_signups').delete().eq('id', id);
    setSnacks(snacks.filter((s) => s.id !== id));
  };

  const addRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.trim()) return;
    const n = newMember.trim().charAt(0).toUpperCase() + newMember.trim().slice(1);
    await supabase.from('team_roster').insert([{ name: n }]);
    setNewMember('');
    const { data } = await supabase.from('team_roster').select('*').order('name', { ascending: true });
    if (data) setRoster(data);
  };

  const deleteRoster = async (id: string) => {
    await supabase.from('team_roster').delete().eq('id', id);
    setRoster(roster.filter((r) => r.id !== id));
  };

  const toggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
      localStorage.removeItem('is_team_admin');
    } else {
      const code = prompt('Enter Admin Passcode:');
      if (code === (process.env.NEXT_PUBLIC_ADMIN_PASSCODE || 'admin123')) {
        setIsAdmin(true);
        localStorage.setItem('is_team_admin', 'true');
      } else if (code !== null) {
        alert('Incorrect passcode.');
      }
    }
  };

  const saveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const dates = mDates.filter((d) => d.trim() !== '');
    if (!mLabel.trim() || !dates.length) return;
    if (editId) {
      await supabase.from('session_config').update({ label: mLabel.trim(), dates, start_hour: mStart, end_hour: mEnd }).eq('id', editId);
    } else {
      await supabase.from('session_config').insert([{ poll_id: POLL_ID, label: mLabel.trim(), dates, start_hour: mStart, end_hour: mEnd, display_order: sessions.length + 1, is_active: true }]);
    }
    setModal(false);
    const { data } = await supabase.from('session_config').select('*').order('display_order', { ascending: true });
    if (data) setSessions(data);
  };

  const filteredSessions = sessions.filter((s) => {
    if (!isAdmin || filter === 'active') return s.is_active;
    if (filter === 'inactive') return !s.is_active;
    return true;
  });

  const slotMap = new Map<string, string[]>();
  availabilities.forEach((a) => {
    const k = slotKey(a.slot_time);
    const curr = slotMap.get(k) || [];
    if (!curr.includes(a.user_name)) slotMap.set(k, [...curr, a.user_name]);
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Team Planner</h1>
            <p className="text-sm text-slate-500">Meetings, snack schedules, and tournament track coordination.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleAdmin} className={`text-xs px-3 py-1.5 rounded-lg border font-semibold ${isAdmin ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-slate-600'}`}>
              {isAdmin ? '🔒 Exit Admin' : '🔑 Coach Access'}
            </button>
            {isAdmin && tab === 'availability' && (
              <button onClick={() => { setEditId(null); setMLabel(''); setMDates(['']); setModal(true); }} className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700">
                + Add Session
              </button>
            )}
          </div>
        </header>

        {/* Tab Selector */}
        <div className="flex justify-between items-center border-b border-slate-200">
          <div className="flex space-x-1">
            {[
              { id: 'availability', label: '📅 Availability Grid' },
              { id: 'snacks', label: '🍕 Snack Sign-up' },
              { id: 'tournaments', label: '🏆 Tournament Schedule' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition ${tab === t.id ? 'border-blue-600 text-blue-600 bg-white rounded-t' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {isAdmin && tab === 'availability' && (
            <div className="flex text-xs bg-slate-200 p-0.5 rounded">
              {(['active', 'inactive', 'all'] as const).map((mode) => (
                <button key={mode} onClick={() => setFilter(mode)} className={`px-2 py-1 rounded capitalize ${filter === mode ? 'bg-white font-bold shadow-sm' : 'text-slate-600'}`}>
                  {mode}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Name Selector Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-center sticky top-4 z-10">
          <label className="text-sm font-bold text-slate-700">Your Name:</label>
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              list="roster-list"
              placeholder="Select or enter your name..."
              value={userName}
              onChange={(e) => { setUserName(e.target.value); setIsSaved(false); setVoteSaved(false); }}
              className="w-full border px-3 py-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="roster-list">
              {roster.map((m) => <option key={m.id} value={m.name} />)}
            </datalist>
          </div>
          {userName.trim() && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${isVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}>
              {isVerified ? '✓ Verified Member' : '⚠️ Name not on roster'}
            </span>
          )}
          {tab === 'availability' && (
            <div className="ml-auto flex items-center gap-2">
              <button onClick={handleSaveAvail} disabled={!isVerified} className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-1.5 rounded transition">
                Save Availability
              </button>
              {isSaved && <span className="text-xs text-green-600 font-bold">✓ Saved</span>}
            </div>
          )}
        </div>

        {/* Admin Roster Editor */}
        {isAdmin && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg space-y-2 text-xs">
            <span className="font-bold text-amber-900 block">⚙️ Manage Team Roster ({roster.length} Members)</span>
            <form onSubmit={addRoster} className="flex gap-2 max-w-sm">
              <input type="text" placeholder="Add full name..." value={newMember} onChange={(e) => setNewMember(e.target.value)} className="border px-2 py-1 rounded flex-1 bg-white" />
              <button type="submit" className="bg-amber-800 text-white px-2 py-1 rounded font-semibold">+ Add</button>
            </form>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {roster.map((m) => (
                <span key={m.id} className="bg-white border text-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  {m.name}
                  <button onClick={() => deleteRoster(m.id)} className="text-slate-400 hover:text-red-600 ml-1 font-bold">×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: AVAILABILITY GRID */}
        {tab === 'availability' && (
          <div className="space-y-6">
            {filteredSessions.map((s) => {
              const dates = s.dates.map(parseDate);
              const daySlots: { hour: number; min: number; label: string }[] = [];
              for (let h = s.start_hour; h < s.end_hour; h++) {
                const p = h >= 12 ? 'pm' : 'am';
                const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
                daySlots.push({ hour: h, min: 0, label: `${dh}:00${p}` });
                daySlots.push({ hour: h, min: 30, label: `${dh}:30${p}` });
              }
              const respondents = Array.from(new Set(
                availabilities.filter((a) => {
                  const sd = new Date(a.slot_time);
                  return dates.some((d) => d.getFullYear() === sd.getFullYear() && d.getMonth() === sd.getMonth() && d.getDate() === sd.getDate());
                }).map((a) => a.user_name.trim())
              ));

              return (
                <div key={s.id} className="bg-white p-5 rounded-lg shadow-sm border space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">{s.label}</h2>
                      {isAdmin && (
                        <button
                          onClick={async () => {
                            await supabase.from('session_config').update({ is_active: !s.is_active }).eq('id', s.id);
                            loadAll();
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold border ${s.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-200 text-slate-600'}`}
                        >
                          {s.is_active ? 'Active' : 'Inactive'}
                        </button>
                      )}
                    </div>
                    {isAdmin && (
                      <button onClick={() => { setEditId(s.id); setMLabel(s.label); setMDates(s.dates); setMStart(s.start_hour); setMEnd(s.end_hour); setModal(true); }} className="text-xs text-blue-600 border px-2 py-0.5 rounded bg-slate-50">
                        ✏️ Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">My Availability</h3>
                      <ScheduleSelector
                        startDate={dates[0] || new Date()}
                        numDays={dates.length}
                        minTime={s.start_hour}
                        maxTime={s.end_hour}
                        hourlyChunks={2}
                        timeFormat="h:mm a"
                        dateFormat="M/D"
                        selection={selectedSlots}
                        onChange={setSelectedSlots}
                        selectedColor="#22c55e"
                        unselectedColor="#f1f5f9"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase">Team Overlap</h3>
                        <span className="text-xs text-slate-400">Respondents: {respondents.length}</span>
                      </div>
                      {hover ? (
                        <div className="bg-slate-900 text-white p-2.5 rounded text-xs space-y-1">
                          <span className="font-bold border-b border-slate-700 block pb-1">{hover.label} ({hover.free.length}/{respondents.length} Free)</span>
                          <p className="text-emerald-400">✅ {hover.free.join(', ') || 'None'}</p>
                          <p className="text-rose-400">❌ {hover.busy.join(', ') || 'None'}</p>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-dashed p-2 text-center text-xs text-slate-400">Hover time slot for details</div>
                      )}
                      <div className="border rounded bg-white p-2 text-xs" onMouseLeave={() => setHover(null)}>
                        <div className="grid text-center font-bold text-slate-600 border-b pb-1 mb-1" style={{ gridTemplateColumns: `50px repeat(${dates.length}, 1fr)` }}>
                          <div>Time</div>
                          {dates.map((d, i) => <div key={i}>{fmtDate(d)}</div>)}
                        </div>
                        {daySlots.map((slot, si) => (
                          <div key={si} className="grid items-center h-5 mb-0.5" style={{ gridTemplateColumns: `50px repeat(${dates.length}, 1fr)` }}>
                            <span className="text-[10px] text-slate-400 text-right pr-1.5">{slot.label}</span>
                            {dates.map((d, di) => {
                              const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), slot.hour, slot.min);
                              const free = slotMap.get(slotKey(dt)) || [];
                              const busy = respondents.filter((u) => !free.includes(u));
                              const op = respondents.length ? free.length / respondents.length : 0;
                              return (
                                <div
                                  key={di}
                                  onMouseEnter={() => setHover({ label: `${fmtDate(d)} @ ${slot.label}`, free, busy })}
                                  style={{ backgroundColor: free.length ? `rgba(34, 197, 94, ${Math.max(op, 0.3)})` : '#f1f5f9' }}
                                  className="h-full rounded mx-0.5 flex items-center justify-center font-bold text-[10px] text-green-950 cursor-pointer"
                                >
                                  {free.length || ''}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: SNACK SIGN-UP */}
        {tab === 'snacks' && (
          <div className="space-y-6">
            {filteredSessions.map((s) => (
              <div key={s.id} className="bg-white p-5 rounded-lg shadow-sm border space-y-3">
                <h2 className="text-lg font-bold border-b pb-2">{s.label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {s.dates.map((dStr, di) => {
                    const dt = parseDate(dStr);
                    const list = snacks.filter((sn) => (sn.session_id === s.id || (sn as any).weekend_id === s.id) && (sn.date_str === dStr || (sn as any).day_of_week === dStr));
                    return (
                      <div key={di} className="bg-slate-50 border rounded-lg p-3.5 space-y-2.5">
                        <div className="flex justify-between items-center border-b pb-1.5">
                          <span className="font-bold text-sm">{fmtDate(dt)}</span>
                          <div className="flex gap-1">
                            <button onClick={() => handleSnack(s.id, dStr, true)} className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] px-2 py-0.5 rounded font-medium">
                              💰 Funds
                            </button>
                            <button onClick={() => handleSnack(s.id, dStr)} disabled={!isVerified} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[11px] px-2 py-0.5 rounded font-medium">
                              + Sign Me Up
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-500 block">Bringing Snacks:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {list.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">No one signed up yet</span>
                            ) : (
                              list.map((item) => {
                                const isFunds = item.user_name.toLowerCase() === 'team funds';
                                return (
                                  <span key={item.id} className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${isFunds ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold' : 'bg-white text-slate-700'}`}>
                                    {isFunds ? '💰 Team Funds' : `😊 ${item.user_name}`}
                                    <button onClick={() => removeSnack(item.id)} className="text-slate-400 hover:text-red-500 font-bold ml-0.5">×</button>
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: TOURNAMENT SCHEDULE (AVAILABILITY INSIDE EACH TRACK) */}
        {tab === 'tournaments' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">📋 Tournament Schedule & Pit Notice</h2>
                <span className="bg-amber-400 text-slate-900 text-xs px-2.5 py-0.5 rounded-full font-bold">Opens Oct 23</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-200">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Volunteers:</strong> Teams provide 1–2 volunteers at each tournament.</li>
                  <li><strong>Pit Area:</strong> Outdoor 10' x 10' area; bring pop-up tent and pit tables.</li>
                </ul>
                <div className="bg-white/10 p-2.5 rounded border border-white/20">
                  <span className="text-amber-300 font-bold block mb-0.5">⚡ Power Policy:</span>
                  No pit power provided; central station has 1 outlet/team; bring battery packs.
                </div>
              </div>
            </div>

            {/* Voting Component */}
            <div className="bg-white p-5 rounded-lg border shadow-sm space-y-5">
              <div className="border-b pb-2">
                <h3 className="font-bold text-base">Select Tournament Availability (Check All That Work)</h3>
                <p className="text-xs text-slate-500">
                  Select your family availability directly inside each track card for Kickoff (W1) and League Championship (W4).
                </p>
              </div>

              {/* Selection 1: Availability in Each Track Card */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold">1. Selection #1: League Tracks & Match Day Availability</label>
                  {sel1.length > 0 && (
                    <button onClick={() => setSel1([])} className="text-xs text-slate-400 hover:text-red-500">
                      Clear Selection #1 ({sel1.length})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {TRACKS.map((t) => {
                    const tagW1 = `${t.id}:w1`;
                    const tagW4 = `${t.id}:w4`;
                    const canW1 = sel1.includes(tagW1);
                    const canW4 = sel1.includes(tagW4);
                    const canBoth = canW1 && canW4;

                    const toggleBoth = () => {
                      if (canBoth) {
                        setSel1(sel1.filter((x) => x !== tagW1 && x !== tagW4));
                      } else {
                        const next = new Set([...sel1, tagW1, tagW4]);
                        setSel1(Array.from(next));
                      }
                    };

                    return (
                      <div
                        key={t.id}
                        className={`border-2 rounded-xl p-3.5 space-y-3 transition flex flex-col justify-between ${
                          canBoth
                            ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500'
                            : canW1 || canW4
                            ? 'border-indigo-300 bg-indigo-50/30'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm text-slate-900">{t.name}</span>
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">
                              {t.pattern}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block">Check days that work for your family:</span>
                        </div>

                        <div className="space-y-2 bg-white/80 p-2.5 rounded-lg border border-slate-200/80 text-xs">
                          <label
                            onClick={() => setSel1(toggle(sel1, tagW1))}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer border transition ${
                              canW1 ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="pr-1">
                              <span className="block font-bold text-[11px] text-slate-500 uppercase">Week #1 Kickoff</span>
                              <span className="text-xs">{t.w1}</span>
                            </div>
                            <input type="checkbox" checked={canW1} onChange={() => {}} className="h-4 w-4 text-emerald-600 rounded" />
                          </label>

                          <label
                            onClick={() => setSel1(toggle(sel1, tagW4))}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer border transition ${
                              canW4 ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="pr-1">
                              <span className="block font-bold text-[11px] text-slate-500 uppercase">Week #4 Championship</span>
                              <span className="text-xs">{t.w4}</span>
                            </div>
                            <input type="checkbox" checked={canW4} onChange={() => {}} className="h-4 w-4 text-emerald-600 rounded" />
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={toggleBoth}
                          className={`w-full py-1.5 px-2 rounded text-xs font-semibold border transition ${
                            canBoth
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                          }`}
                        >
                          {canBoth ? '✓ Free Both Days' : '+ Select Both Days'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selection #2 & #3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold">2. Week #2 Match (Check all that work)</label>
                    {sel2.length > 0 && <button onClick={() => setSel2([])} className="text-xs text-slate-400 hover:text-red-500">Clear</button>}
                  </div>
                  <div className="space-y-2">
                    {W2_OPTS.map((o) => {
                      const active = sel2.includes(o.id);
                      return (
                        <label key={o.id} onClick={() => setSel2(toggle(sel2, o.id))} className={`flex justify-between items-center border-2 p-3 rounded-lg cursor-pointer ${active ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                          <span className="text-sm font-bold">{o.label}</span>
                          <input type="checkbox" checked={active} onChange={() => {}} className="h-4 w-4 text-blue-600 rounded" />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold">3. Week #3 Match (Check all that work)</label>
                    {sel3.length > 0 && <button onClick={() => setSel3([])} className="text-xs text-slate-400 hover:text-red-500">Clear</button>}
                  </div>
                  <div className="space-y-2">
                    {W3_OPTS.map((o) => {
                      const active = sel3.includes(o.id);
                      return (
                        <label key={o.id} onClick={() => setSel3(toggle(sel3, o.id))} className={`flex justify-between items-center border-2 p-3 rounded-lg cursor-pointer ${active ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                          <span className="text-sm font-bold">{o.label}</span>
                          <input type="checkbox" checked={active} onChange={() => {}} className="h-4 w-4 text-blue-600 rounded" />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Volunteer Note */}
              <div className="border-t pt-3 space-y-1.5">
                <label className="text-sm font-bold">4. Volunteer Sign-up (1–2 Volunteers per event)</label>
                <input
                  type="text"
                  placeholder="e.g. Parent available to referee or queue fields..."
                  value={volNote}
                  onChange={(e) => setVolNote(e.target.value)}
                  className="w-full border px-3 py-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end items-center gap-2 pt-1">
                {voteSaved && <span className="text-xs text-green-600 font-bold">✓ Preferences saved!</span>}
                <button onClick={handleSaveVote} disabled={!isVerified} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-1.5 rounded transition">
                  Submit Tournament Availability
                </button>
              </div>
            </div>

            {/* Results Breakdown */}
            <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
              <h3 className="font-bold text-sm border-b pb-2">📊 Track Attendance Consensus ({votes.length}/14 Responded)</h3>

              {/* Track-by-Track Consensus Table with Detailed Names for Each Day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {TRACKS.map((t) => {
                  const tagW1 = `${t.id}:w1`;
                  const tagW4 = `${t.id}:w4`;

                  const canW1Voters = votes.filter((v) => Array.isArray(v.selection_1) && (v.selection_1.includes(tagW1) || v.selection_1.includes(t.id))).map((v) => v.user_name);
                  const canW4Voters = votes.filter((v) => Array.isArray(v.selection_1) && (v.selection_1.includes(tagW4) || v.selection_1.includes(t.id))).map((v) => v.user_name);
                  const canBothVoters = votes.filter((v) => Array.isArray(v.selection_1) && (v.selection_1.includes(t.id) || (v.selection_1.includes(tagW1) && v.selection_1.includes(tagW4)))).map((v) => v.user_name);

                  return (
                    <div key={t.id} className="border p-3 rounded-lg bg-slate-50 text-xs space-y-2.5 flex flex-col justify-between">
                      <div className="flex justify-between items-center border-b pb-1.5">
                        <span className="font-bold text-slate-800 text-sm">{t.name}</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">{t.pattern}</span>
                      </div>

                      <div className="space-y-2">
                        {/* Kickoff Day Names */}
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-700">Kickoff ({t.w1.split(' ')[0]})</span>
                            <span className="text-emerald-700 font-bold">{canW1Voters.length} free</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {canW1Voters.length > 0 ? canW1Voters.join(', ') : <span className="text-slate-300 italic">None</span>}
                          </div>
                        </div>

                        {/* Championship Day Names */}
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-700">Champs ({t.w4.split(' ')[0]})</span>
                            <span className="text-emerald-700 font-bold">{canW4Voters.length} free</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {canW4Voters.length > 0 ? canW4Voters.join(', ') : <span className="text-slate-300 italic">None</span>}
                          </div>
                        </div>

                        {/* Both Days Overlap */}
                        <div className="bg-blue-50/70 p-2 rounded border border-blue-200">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-blue-950">Free Both Days</span>
                            <span className="text-blue-700 font-bold">{canBothVoters.length} full overlap</span>
                          </div>
                          <div className="text-[11px] text-blue-900 mt-0.5 leading-snug font-medium">
                            {canBothVoters.length > 0 ? canBothVoters.join(', ') : <span className="text-blue-300 italic">No full overlap yet</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selection 2 & 3 Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase">Week #2 Match</span>
                  {W2_OPTS.map((o) => {
                    const matched = votes.filter((v) => Array.isArray(v.selection_2) && v.selection_2.includes(o.id)).map((v) => v.user_name);
                    return (
                      <div key={o.id} className="border p-2 rounded bg-slate-50 text-xs">
                        <div className="flex justify-between font-bold"><span>{o.label}</span><span className="text-blue-700">{matched.length} free</span></div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{matched.join(', ') || 'None'}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase">Week #3 Match</span>
                  {W3_OPTS.map((o) => {
                    const matched = votes.filter((v) => Array.isArray(v.selection_3) && v.selection_3.includes(o.id)).map((v) => v.user_name);
                    return (
                      <div key={o.id} className="border p-2 rounded bg-slate-50 text-xs">
                        <div className="flex justify-between font-bold"><span>{o.label}</span><span className="text-blue-700">{matched.length} free</span></div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{matched.join(', ') || 'None'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t pt-2 space-y-1 text-xs">
                <span className="font-bold text-slate-500 uppercase">Volunteers:</span>
                {votes.filter((v) => v.volunteer_note).map((v) => (
                  <div key={v.id}><strong className="text-slate-700">{v.user_name}:</strong> <span className="text-slate-600">{v.volunteer_note}</span></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Session Modal */}
      {modal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold">{editId ? 'Edit Session' : 'New Session'}</h3>
              <button onClick={() => setModal(false)} className="text-slate-400 text-lg font-bold">×</button>
            </div>
            <form onSubmit={saveSession} className="space-y-3 text-sm">
              <div>
                <label className="font-semibold block mb-1">Title</label>
                <input type="text" value={mLabel} onChange={(e) => setMLabel(e.target.value)} className="w-full border p-2 rounded" required />
              </div>
              <div>
                <label className="font-semibold block mb-1">Dates</label>
                {mDates.map((d, i) => (
                  <input
                    key={i}
                    type="date"
                    value={d}
                    onChange={(e) => {
                      const copy = [...mDates];
                      copy[i] = e.target.value;
                      setMDates(copy);
                    }}
                    className="border p-2 rounded w-full mb-1"
                    required
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const last = mDates[mDates.length - 1];
                    if (last) {
                      const dt = parseDate(last);
                      dt.setDate(dt.getDate() + 1);
                      setMDates([...mDates, dt.toISOString().split('T')[0]]);
                    } else {
                      setMDates([...mDates, '']);
                    }
                  }}
                  className="text-xs text-blue-600 font-semibold"
                >
                  + Add Date
                </button>
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <button type="button" onClick={() => setModal(false)} className="border px-3 py-1.5 rounded">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
