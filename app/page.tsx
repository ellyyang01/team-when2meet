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
  selection_1: string | null;
  selection_2: string | null;
  selection_3: string | null;
  volunteer_note: string | null;
}

interface HoveredSlotInfo {
  sessionId: string;
  dayLabel: string;
  timeLabel: string;
  available: string[];
  unavailable: string[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'availability' | 'snacks' | 'tournaments'>('availability');

  const [userName, setUserName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([]);
  const [allAvailabilities, setAllAvailabilities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Official 14 Team Members + Dynamic Roster
  const [teamRoster, setTeamRoster] = useState<TeamMember[]>([]);
  const [newMemberName, setNewMemberName] = useState('');

  // Admin Access State
  const [isAdmin, setIsAdmin] = useState(false);
  const ADMIN_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || 'admin123';
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // Snack Sign-up States
  const [snackSignups, setSnackSignups] = useState<SnackSignup[]>([]);
  const [snackNameInput, setSnackNameInput] = useState('');

  // Tournament Scheduling Tab States (Nullable / Optional Multi-stage Voting)
  const [tournamentVotes, setTournamentVotes] = useState<TournamentVote[]>([]);
  const [mySel1, setMySel1] = useState('');
  const [mySel2, setMySel2] = useState('');
  const [mySel3, setMySel3] = useState('');
  const [myVolunteer, setMyVolunteer] = useState('');
  const [tourneySaved, setTourneySaved] = useState(false);

  // Hover Inspector State
  const [hoveredSlot, setHoveredSlot] = useState<HoveredSlotInfo | null>(null);

  // Admin Session Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [modalLabel, setModalLabel] = useState('');
  const [modalDates, setModalDates] = useState<string[]>(['']);
  const [modalStartHour, setModalStartHour] = useState(10);
  const [modalEndHour, setModalEndHour] = useState(19);

  const DEFAULT_POLL_ID = '00000000-0000-0000-0000-000000000001';

  const TRACK_OPTIONS = [
    {
      id: 'Euclid',
      name: 'Euclid Track',
      w1: 'Week #1: Sat 11/21/2026',
      w4: 'Week #4: Sat 2/20/2027',
      pairBadge: 'Linked: Sat ➡️ Sat',
      patternBadge: 'All Saturdays',
    },
    {
      id: 'Gauss',
      name: 'Gauss Track',
      w1: 'Week #1: Sun 11/22/2026',
      w4: 'Week #4: Sat 2/20/2027',
      pairBadge: 'Linked: Sun ➡️ Sat',
      patternBadge: 'Sunday then Saturday',
    },
    {
      id: 'Turing',
      name: 'Turing Track',
      w1: 'Week #1: Sat 11/21/2026',
      w4: 'Week #4: Sun 2/21/2027',
      pairBadge: 'Linked: Sat ➡️ Sun',
      patternBadge: 'Saturday then Sunday',
    },
    {
      id: 'Descartes',
      name: 'Descartes Track',
      w1: 'Week #1: Sun 11/22/2026',
      w4: 'Week #4: Sun 2/21/2027',
      pairBadge: 'Linked: Sun ➡️ Sun',
      patternBadge: 'All Sundays',
    },
  ];

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
    fetchTeamRoster();
    fetchTournamentVotes();

    const savedAdmin = localStorage.getItem('is_team_admin');
    if (savedAdmin === 'true') {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    if (!userName.trim()) {
      setSelectedSlots([]);
      setMySel1('');
      setMySel2('');
      setMySel3('');
      setMyVolunteer('');
      setTourneySaved(false);
      return;
    }

    const userEntries = allAvailabilities.filter(
      (item) => item.user_name.trim().toLowerCase() === userName.trim().toLowerCase()
    );
    setSelectedSlots(userEntries.map((item) => new Date(item.slot_time)));

    const existingVote = tournamentVotes.find(
      (v) => v.user_name.trim().toLowerCase() === userName.trim().toLowerCase()
    );
    if (existingVote) {
      setMySel1(existingVote.selection_1 || '');
      setMySel2(existingVote.selection_2 || '');
      setMySel3(existingVote.selection_3 || '');
      setMyVolunteer(existingVote.volunteer_note || '');
    } else {
      setMySel1('');
      setMySel2('');
      setMySel3('');
      setMyVolunteer('');
    }
  }, [userName, allAvailabilities, tournamentVotes]);

  // Case-insensitive team roster check
  const isNameVerified = teamRoster.some(
    (member) => member.name.trim().toLowerCase() === userName.trim().toLowerCase()
  );

  const fetchTeamRoster = async () => {
    const { data } = await supabase.from('team_roster').select('*').order('name', { ascending: true });
    if (data && data.length > 0) {
      setTeamRoster(data);
    } else {
      const defaultNames = [
        'Elaine', 'Emma', 'Ellie', 'Aranya', 'Mananya',
        'Joseph', 'Jonah', 'Jacob', 'Rohan', 'Thomas',
        'Max', 'Vivian', 'Emily', 'Ethan'
      ];
      setTeamRoster(defaultNames.map((name, idx) => ({ id: String(idx + 1), name })));
    }
  };

  const handleAddRosterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const formattedName = newMemberName.trim().charAt(0).toUpperCase() + newMemberName.trim().slice(1);
    const { error } = await supabase.from('team_roster').insert([{ name: formattedName }]);
    if (error) {
      alert(`Error adding member: ${error.message}`);
      return;
    }
    setNewMemberName('');
    await fetchTeamRoster();
  };

  const handleRemoveRosterMember = async (id: string) => {
    const { error } = await supabase.from('team_roster').delete().eq('id', id);
    if (error) {
      alert(`Error removing member: ${error.message}`);
      return;
    }
    await fetchTeamRoster();
  };

  const fetchSessions = async () => {
    const { data } = await supabase.from('session_config').select('*').order('display_order', { ascending: true });
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
      ]);
    }
  };

  const fetchAvailabilities = async () => {
    const { data } = await supabase.from('availabilities').select('*').eq('poll_id', DEFAULT_POLL_ID);
    if (data) setAllAvailabilities(data);
  };

  const fetchSnackSignups = async () => {
    const { data } = await supabase.from('snack_signups').select('*').eq('poll_id', DEFAULT_POLL_ID);
    if (data) setSnackSignups(data);
  };

  const fetchTournamentVotes = async () => {
    const { data } = await supabase.from('tournament_votes').select('*').eq('poll_id', DEFAULT_POLL_ID);
    if (data) setTournamentVotes(data);
  };

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
      localStorage.removeItem('is_team_admin');
      setStatusFilter('active');
    } else {
      const code = prompt('Enter Admin Passcode:');
      if (code === ADMIN_PASSCODE) {
        setIsAdmin(true);
        localStorage.setItem('is_team_admin', 'true');
      } else if (code !== null) {
        alert('Incorrect admin passcode.');
      }
    }
  };

  const handleNameChange = (val: string) => {
    setUserName(val);
    setSnackNameInput(val);
    setIsSubmitted(false);
    setTourneySaved(false);
  };

  const handleSaveAvailability = async () => {
    if (!userName.trim() || !isNameVerified) {
      alert('Please select a verified roster name.');
      return;
    }
    const matched = teamRoster.find((m) => m.name.toLowerCase() === userName.trim().toLowerCase());
    const formattedName = matched ? matched.name : userName.trim();

    await supabase.from('availabilities').delete().eq('poll_id', DEFAULT_POLL_ID).ilike('user_name', formattedName);

    const rowsToInsert = selectedSlots.map((slot) => ({
      poll_id: DEFAULT_POLL_ID,
      user_name: formattedName,
      slot_time: slot.toISOString(),
    }));

    if (rowsToInsert.length > 0) {
      const { error } = await supabase.from('availabilities').insert(rowsToInsert);
      if (error) {
        alert(`Error saving: ${error.message}`);
        return;
      }
    }
    setIsSubmitted(true);
    await fetchAvailabilities();
  };

  const handleSaveTournamentVote = async () => {
    if (!userName.trim() || !isNameVerified) {
      alert('Please select your verified name in the top bar before submitting.');
      return;
    }

    if (!mySel1 && !mySel2 && !mySel3 && !myVolunteer.trim()) {
      alert('Please make at least one tournament selection or leave a volunteer note.');
      return;
    }

    const matched = teamRoster.find((m) => m.name.toLowerCase() === userName.trim().toLowerCase());
    const formattedName = matched ? matched.name : userName.trim();

    const existingVote = tournamentVotes.find(
      (v) => v.user_name.trim().toLowerCase() === userName.trim().toLowerCase()
    );

    const finalSel1 = mySel1 || existingVote?.selection_1 || null;
    const finalSel2 = mySel2 || existingVote?.selection_2 || null;
    const finalSel3 = mySel3 || existingVote?.selection_3 || null;
    const finalVolunteer = myVolunteer.trim() || existingVote?.volunteer_note || '';

    await supabase.from('tournament_votes').delete().eq('poll_id', DEFAULT_POLL_ID).ilike('user_name', formattedName);

    const { error } = await supabase.from('tournament_votes').insert([
      {
        poll_id: DEFAULT_POLL_ID,
        user_name: formattedName,
        selection_1: finalSel1,
        selection_2: finalSel2,
        selection_3: finalSel3,
        volunteer_note: finalVolunteer,
      },
    ]);

    if (error) {
      alert(`Error recording vote: ${error.message}`);
      return;
    }

    setTourneySaved(true);
    await fetchTournamentVotes();
  };

  const handleAddSnackSignup = async (sessionId: string, dateStr: string, customName?: string) => {
    const isTeamFunds = customName === 'Team Funds';
    const nameToSign = isTeamFunds ? 'Team Funds' : snackNameInput.trim();

    if (!isTeamFunds) {
      if (!nameToSign) {
        alert('Please enter your name first.');
        return;
      }
      if (!isNameVerified) {
        alert('Your name was not found on the team roster.');
        return;
      }
    }

    let formattedName = nameToSign;
    if (!isTeamFunds) {
      const matched = teamRoster.find((m) => m.name.toLowerCase() === nameToSign.toLowerCase());
      formattedName = matched ? matched.name : nameToSign;
    }

    const exists = snackSignups.some(
      (s) =>
        (s.session_id === sessionId || (s as any).weekend_id === sessionId) &&
        (s.date_str === dateStr || (s as any).day_of_week === dateStr) &&
        s.user_name.toLowerCase() === formattedName.toLowerCase()
    );

    if (exists) {
      alert(`${formattedName} is already listed for snacks on this date!`);
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

    if (error) alert(error.message);
    await fetchSnackSignups();
  };

  const handleRemoveSnackSignup = async (id: string) => {
    await supabase.from('snack_signups').delete().eq('id', id);
    await fetchSnackSignups();
  };

  const handleToggleActive = async (session: Session) => {
    if (!isAdmin) return;
    const newStatus = !session.is_active;
    await supabase.from('session_config').update({ is_active: newStatus }).eq('id', session.id);
    await fetchSessions();
  };

  const handleMoveSession = async (index: number, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredSessions.length) return;
    const currentSession = filteredSessions[index];
    const targetSession = filteredSessions[targetIndex];

    await supabase.from('session_config').update({ display_order: targetSession.display_order }).eq('id', currentSession.id);
    await supabase.from('session_config').update({ display_order: currentSession.display_order }).eq('id', targetSession.id);
    await fetchSessions();
  };

  const openAddModal = () => {
    if (!isAdmin) return;
    setEditingSessionId(null);
    setModalLabel('');
    setModalDates(['']);
    setModalStartHour(10);
    setModalEndHour(19);
    setShowModal(true);
  };

  const openEditModal = (session: Session) => {
    if (!isAdmin) return;
    setEditingSessionId(session.id);
    setModalLabel(session.label);
    setModalDates(session.dates.length > 0 ? session.dates : ['']);
    setModalStartHour(session.start_hour);
    setModalEndHour(session.end_hour);
    setShowModal(true);
  };

  const addDateField = () => {
    if (modalDates.length > 0) {
      const last = modalDates[modalDates.length - 1];
      if (last && last.trim() !== '') {
        const [y, m, d] = last.split('-').map(Number);
        const next = new Date(y, m - 1, d + 1);
        const str = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
        setModalDates([...modalDates, str]);
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
    if (!isAdmin) return;
    const validDates = modalDates.filter((d) => d.trim() !== '');
    if (!modalLabel.trim() || validDates.length === 0) return;

    if (editingSessionId) {
      await supabase
        .from('session_config')
        .update({
          label: modalLabel.trim(),
          dates: validDates,
          start_hour: Number(modalStartHour),
          end_hour: Number(modalEndHour),
        })
        .eq('id', editingSessionId);
    } else {
      await supabase.from('session_config').insert([
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
    }
    setShowModal(false);
    await fetchSessions();
  };

  const filteredSessions = sessions.filter((s) => {
    if (!isAdmin) return s.is_active;
    if (statusFilter === 'active') return s.is_active;
    if (statusFilter === 'inactive') return !s.is_active;
    return true;
  });

  const slotUserMap = new Map<string, string[]>();
  allAvailabilities.forEach((item) => {
    const key = getSlotKey(item.slot_time);
    const existing = slotUserMap.get(key) || [];
    if (!existing.includes(item.user_name)) slotUserMap.set(key, [...existing, item.user_name]);
  });

  const generateTimeSlots = (startH: number, endH: number) => {
    const slots = [];
    for (let h = startH; h < endH; h++) {
      const p = h >= 12 ? 'pm' : 'am';
      const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
      slots.push({ hour: h, minute: 0, label: `${dh}:00${p}` });
      slots.push({ hour: h, minute: 30, label: `${dh}:30${p}` });
    }
    return slots;
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <header className="border-b pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Team Planner</h1>
            <p className="text-slate-600">
              Meeting availability, snack coordination, and tournament selection tracks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAdminToggle}
              className={`text-xs px-3 py-2 rounded-lg font-semibold border transition ${
                isAdmin
                  ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
              }`}
            >
              {isAdmin ? '🔒 Exit Admin Mode' : '🔑 Coach / Admin Access'}
            </button>
            {isAdmin && activeTab === 'availability' && (
              <button
                onClick={openAddModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow transition flex items-center gap-1.5"
              >
                <span>➕</span> Add Meeting Session
              </button>
            )}
          </div>
        </header>

        {/* Top-Level Navigation Tabs */}
        <div className="flex flex-wrap justify-between items-center border-b border-slate-200 gap-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('availability')}
              className={`py-3 px-6 font-semibold border-b-2 text-sm transition-colors ${
                activeTab === 'availability'
                  ? 'border-green-600 text-green-700 bg-white rounded-t-lg shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              📅 Availability Grid
            </button>
            <button
              onClick={() => setActiveTab('snacks')}
              className={`py-3 px-6 font-semibold border-b-2 text-sm transition-colors ${
                activeTab === 'snacks'
                  ? 'border-green-600 text-green-700 bg-white rounded-t-lg shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              🍕 Snack Sign-up
            </button>
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`py-3 px-6 font-semibold border-b-2 text-sm transition-colors ${
                activeTab === 'tournaments'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              🏆 Tournament Schedule
            </button>
          </div>

          {isAdmin && activeTab === 'availability' && (
            <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-md transition ${
                  statusFilter === 'active' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                🟢 Active ({sessions.filter((s) => s.is_active).length})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-md transition ${
                  statusFilter === 'inactive' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                ⚪ Inactive ({sessions.filter((s) => !s.is_active).length})
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md transition ${
                  statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                📂 All ({sessions.length})
              </button>
            </div>
          )}
        </div>

        {/* Global Roster Name Selector */}
        <div className="bg-white p-4 rounded-lg shadow-sm border space-y-2 sticky top-4 z-10">
          <div className="flex flex-wrap gap-4 items-center">
            <label className="font-semibold text-slate-700">Your Name:</label>
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                list="team-roster-list"
                placeholder="Select or type your name..."
                value={userName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full border px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <datalist id="team-roster-list">
                {teamRoster.map((m) => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
            </div>

            {userName.trim() !== '' && (
              <div>
                {isNameVerified ? (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    ✓ Verified Team Member
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    ⚠️ Name not on roster
                  </span>
                )}
              </div>
            )}

            {activeTab === 'availability' && (
              <>
                <button
                  onClick={handleSaveAvailability}
                  disabled={!isNameVerified}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-medium px-4 py-1.5 rounded-md transition text-sm ml-auto"
                >
                  Save My Availability
                </button>
                {isSubmitted && <span className="text-sm text-green-600 font-medium">✓ Saved!</span>}
              </>
            )}
          </div>
        </div>

        {/* Admin Roster Manager */}
        {isAdmin && (
          <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-lg space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
              ⚙️ Admin: Manage Approved Team Roster ({teamRoster.length} Members)
            </h3>
            <form onSubmit={handleAddRosterMember} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="New member full name..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="border px-3 py-1 rounded-md text-xs flex-1 bg-white"
              />
              <button
                type="submit"
                className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs px-3 py-1 rounded-md transition"
              >
                + Add Member
              </button>
            </form>
            <div className="flex flex-wrap gap-2 pt-1">
              {teamRoster.map((m) => (
                <span
                  key={m.id}
                  className="bg-white border text-slate-700 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm"
                >
                  <span>{m.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRosterMember(m.id)}
                    className="text-slate-400 hover:text-red-600 font-bold ml-1 text-xs"
                    title="Remove from roster"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: AVAILABILITY GRID */}
        {activeTab === 'availability' && (
          <div className="space-y-8">
            {filteredSessions.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-lg border text-slate-500 italic">
                No active meeting sessions found.
              </div>
            ) : (
              filteredSessions.map((session, sessionIdx) => {
                const sessionDates = session.dates.map((dStr) => parseLocalDate(dStr));
                const firstDate = sessionDates[0] || new Date();
                const numDays = sessionDates.length;
                const timeSlots = generateTimeSlots(session.start_hour, session.end_hour);

                const respondents = Array.from(
                  new Set(
                    allAvailabilities
                      .filter((item) => {
                        const sd = new Date(item.slot_time);
                        return sessionDates.some(
                          (d) => d.getFullYear() === sd.getFullYear() && d.getMonth() === sd.getMonth() && d.getDate() === sd.getDate()
                        );
                      })
                      .map((item) => item.user_name.trim())
                  )
                );

                return (
                  <div key={session.id} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800">{session.label}</h2>
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleActive(session)}
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border transition ${
                              session.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                            }`}
                          >
                            {session.is_active ? '🟢 Active' : '⚪ Inactive'}
                          </button>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button
                            disabled={sessionIdx === 0}
                            onClick={() => handleMoveSession(sessionIdx, 'up')}
                            className="text-xs border px-2 py-1 rounded bg-slate-50 disabled:opacity-30"
                          >
                            ⬆️ Up
                          </button>
                          <button
                            disabled={sessionIdx === filteredSessions.length - 1}
                            onClick={() => handleMoveSession(sessionIdx, 'down')}
                            className="text-xs border px-2 py-1 rounded bg-slate-50 disabled:opacity-30"
                          >
                            ⬇️ Down
                          </button>
                          <button
                            onClick={() => openEditModal(session)}
                            className="text-xs text-blue-600 border px-2.5 py-1 rounded bg-slate-50"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

                      <div className="space-y-3">
                        <div className="flex justify-between items-baseline">
                          <h3 className="text-sm font-semibold text-slate-600">Team Overlap</h3>
                          <span className="text-xs text-slate-500">Respondents: {respondents.length}</span>
                        </div>

                        {hoveredSlot?.sessionId === session.id ? (
                          <div className="bg-slate-900 text-white p-3 rounded-lg text-xs space-y-1">
                            <div className="font-bold border-b border-slate-700 pb-1 flex justify-between">
                              <span>📅 {hoveredSlot.dayLabel} @ {hoveredSlot.timeLabel}</span>
                              <span>{hoveredSlot.available.length}/{respondents.length} Free</span>
                            </div>
                            <div className="text-emerald-400">✅ Free: {hoveredSlot.available.join(', ') || 'None'}</div>
                            <div className="text-rose-400">❌ Busy: {hoveredSlot.unavailable.join(', ') || 'None'}</div>
                          </div>
                        ) : (
                          <div className="bg-slate-100 p-3 rounded-lg text-xs text-slate-500 italic text-center border border-dashed">
                            Hover over any time slot below to inspect attendance.
                          </div>
                        )}

                        <div className="border rounded bg-white p-2 text-xs" onMouseLeave={() => setHoveredSlot(null)}>
                          <div
                            className="grid text-center font-semibold text-slate-600 border-b pb-2 mb-1"
                            style={{ gridTemplateColumns: `60px repeat(${sessionDates.length}, minmax(0, 1fr))` }}
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
                                style={{ gridTemplateColumns: `60px repeat(${sessionDates.length}, minmax(0, 1fr))` }}
                              >
                                <div className="text-slate-400 text-right pr-2 text-[10px]">{slot.label}</div>
                                {sessionDates.map((d, dIdx) => {
                                  const sd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), slot.hour, slot.minute);
                                  const users = slotUserMap.get(getSlotKey(sd)) || [];
                                  const unavail = respondents.filter((u) => !users.includes(u));
                                  const op = respondents.length > 0 ? users.length / respondents.length : 0;
                                  return (
                                    <div
                                      key={dIdx}
                                      onMouseEnter={() =>
                                        setHoveredSlot({
                                          sessionId: session.id,
                                          dayLabel: formatDateShort(d),
                                          timeLabel: slot.label,
                                          available: users,
                                          unavailable: unavail,
                                        })
                                      }
                                      style={{
                                        backgroundColor: users.length > 0 ? `rgba(34, 197, 94, ${Math.max(op, 0.3)})` : '#f1f5f9',
                                      }}
                                      className="h-full rounded flex items-center justify-center font-bold text-green-900 text-[10px] cursor-pointer"
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
                <h2 className="text-xl font-bold text-slate-800 border-b pb-2">{session.label}</h2>
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
                          <h3 className="font-semibold text-slate-700">{formatDateShort(d)} Snacks</h3>
                          <button
                            onClick={() => handleAddSnackSignup(session.id, dateStr)}
                            disabled={!isNameVerified}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded transition"
                          >
                            + Sign Me Up
                          </button>
                        </div>
                        <ul className="flex flex-wrap gap-2">
                          {daySignups.length === 0 ? (
                            <p className="text-sm italic text-slate-400">No one signed up yet.</p>
                          ) : (
                            daySignups.map((s) => {
                              const isFunds = s.user_name.toLowerCase() === 'team funds';
                              return (
                                <li
                                  key={s.id}
                                  className={`border text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm font-medium ${
                                    isFunds
                                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span>{isFunds ? '💰 Team Funds' : `😊 ${s.user_name}`}</span>
                                  <button
                                    onClick={() => handleRemoveSnackSignup(s.id)}
                                    className="text-slate-400 hover:text-red-500 font-bold ml-1"
                                  >
                                    ×
                                  </button>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: TOURNAMENT SCHEDULE (STANDALONE VIEW) */}
        {activeTab === 'tournaments' && (
          <div className="space-y-8">
            {/* Tournament Requirements Card */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-xl shadow space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>📋</span> Team Tournament Requirements & Pit Notice
                </h2>
                <span className="text-xs bg-amber-400 text-slate-900 font-bold px-2.5 py-1 rounded-full">
                  Link Opens Oct 23
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-200">
                <ul className="space-y-1.5 list-disc list-inside">
                  <li><strong>Volunteers:</strong> Teams must provide 1–2 volunteers at every event participated in.</li>
                  <li><strong>Pit Area:</strong> Outside pit space approximately 10' x 10'.</li>
                  <li><strong>Equipment:</strong> Teams are required to bring their own pop-up tent and table.</li>
                </ul>
                <div className="bg-white/10 p-3 rounded-lg border border-white/20">
                  <span className="font-bold text-amber-300 block mb-1">⚡ Pit Power Policy:</span>
                  <p>
                    Power will <strong>NOT</strong> be provided directly to your pits. A central event charging station will be available with one outlet per team, but bringing battery power banks for your pit is strongly advised.
                  </p>
                </div>
              </div>
            </div>

            {/* Voting Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
              <div className="border-b pb-3">
                <h3 className="text-lg font-bold text-slate-800">
                  Select Your Preferred Tournament Schedule Track
                </h3>
                <p className="text-xs text-slate-500">
                  Submit family availability so coaches can select the best schedule link on October 23rd. Selections are optional—submit what you know now and complete the rest later.
                </p>
              </div>

              {/* Selection 1: League Tracks (Week 1 + 4 linked) */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-800 block">
                      1. Selection #1: League Track (Week #1 & Week #4 are Linked)
                    </label>
                    {mySel1 && (
                      <button
                        type="button"
                        onClick={() => setMySel1('')}
                        className="text-[11px] text-slate-400 hover:text-red-500"
                      >
                        Clear Selection #1
                      </button>
                    )}
                  </div>
                  <div className="mt-1 bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
                    <span className="text-base">⚠️</span>
                    <p>
                      <strong>Important:</strong> Selection #1 determines <strong>both</strong> your <strong>Week #1 Kickoff</strong> and your <strong>Week #4 League Championship</strong> together. You cannot split these dates—picking a track commits the team to that specific pair!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {TRACK_OPTIONS.map((track) => (
                    <label
                      key={track.id}
                      onClick={() => setMySel1(track.id)}
                      className={`border-2 p-3.5 rounded-lg cursor-pointer transition flex flex-col justify-between ${
                        mySel1 === track.id
                          ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-900 text-sm">{track.name}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                            {track.pairBadge}
                          </span>
                        </div>

                        <div className="text-xs space-y-1.5 text-slate-700 bg-white/60 p-2 rounded border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-500">Kickoff:</span>
                            <span className="font-medium text-slate-800">{track.w1}</span>
                          </div>
                          <div className="flex items-center justify-between border-t pt-1">
                            <span className="font-semibold text-slate-500">Championship:</span>
                            <span className="font-medium text-slate-800">{track.w4}</span>
                          </div>
                        </div>

                        <span className="inline-block mt-2 text-[11px] text-slate-500 italic">
                          Combo: {track.patternBadge}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t mt-3 pt-2">
                        <span className="text-xs font-medium text-slate-600">Select Track</span>
                        <input
                          type="radio"
                          name="sel1"
                          checked={mySel1 === track.id}
                          onChange={() => setMySel1(track.id)}
                          className="text-blue-600 h-4 w-4"
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Selection #2 & Selection #3: Intra-League Matches */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
                {/* Selection #2 */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-slate-800">
                        2. Selection #2: Week #2 Intra-League Match
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          Optional
                        </span>
                        {mySel2 && (
                          <button
                            type="button"
                            onClick={() => setMySel2('')}
                            className="text-[11px] text-slate-400 hover:text-red-500"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose your family's availability for the December regular match.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        val: '2026-12-12',
                        day: 'Saturday',
                        date: 'December 12, 2026',
                        badge: 'Saturday Match',
                      },
                      {
                        val: '2026-12-13',
                        day: 'Sunday',
                        date: 'December 13, 2026',
                        badge: 'Sunday Match',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.val}
                        onClick={() => setMySel2(opt.val)}
                        className={`flex items-center justify-between border-2 p-3.5 rounded-lg cursor-pointer transition ${
                          mySel2 === opt.val
                            ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="sel2"
                            checked={mySel2 === opt.val}
                            onChange={() => setMySel2(opt.val)}
                            className="text-blue-600 h-4 w-4"
                          />
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">
                              {opt.day}, {opt.date}
                            </span>
                            <span className="text-[11px] text-slate-500">Regular Season Match Session</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold bg-white border px-2 py-0.5 rounded text-slate-600">
                          {opt.badge}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Selection #3 */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-slate-800">
                        3. Selection #3: Week #3 Intra-League Match
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          Optional
                        </span>
                        {mySel3 && (
                          <button
                            type="button"
                            onClick={() => setMySel3('')}
                            className="text-[11px] text-slate-400 hover:text-red-500"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose your family's availability for the January regular match.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        val: '2027-01-23',
                        day: 'Saturday',
                        date: 'January 23, 2027',
                        badge: 'Saturday Match',
                      },
                      {
                        val: '2027-01-24',
                        day: 'Sunday',
                        date: 'January 24, 2027',
                        badge: 'Sunday Match',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.val}
                        onClick={() => setMySel3(opt.val)}
                        className={`flex items-center justify-between border-2 p-3.5 rounded-lg cursor-pointer transition ${
                          mySel3 === opt.val
                            ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="sel3"
                            checked={mySel3 === opt.val}
                            onChange={() => setMySel3(opt.val)}
                            className="text-blue-600 h-4 w-4"
                          />
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">
                              {opt.day}, {opt.date}
                            </span>
                            <span className="text-[11px] text-slate-500">Regular Season Match Session</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold bg-white border px-2 py-0.5 rounded text-slate-600">
                          {opt.badge}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Volunteer Note */}
              <div className="border-t pt-4 space-y-2">
                <label className="text-sm font-bold text-slate-800 block">
                  4. Event Volunteer Sign-up (1–2 Volunteers Needed Per Team)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Parent willing to volunteer as field queueing, referee, or scorekeeper..."
                  value={myVolunteer}
                  onChange={(e) => setMyVolunteer(e.target.value)}
                  className="w-full border px-3 py-2 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {tourneySaved && <span className="text-sm text-green-600 font-semibold">✓ Schedule choice recorded!</span>}
                <button
                  onClick={handleSaveTournamentVote}
                  disabled={!isNameVerified}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-md transition text-sm"
                >
                  Submit Tournament Availability
                </button>
              </div>
            </div>

            {/* Voting Results Breakdown */}
            <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-bold text-slate-800">
                  📊 Team Preference Consensus ({tournamentVotes.length}/14 Responded)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Selection 1 Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">League Track</h4>
                  {TRACK_OPTIONS.map((t) => {
                    const voters = tournamentVotes.filter((v) => v.selection_1 === t.id).map((v) => v.user_name);
                    return (
                      <div key={t.id} className="border p-2.5 rounded bg-slate-50 text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{t.name}</span>
                          <span className="text-blue-700">{voters.length} votes</span>
                        </div>
                        <p className="text-slate-500 text-[11px] truncate">
                          {voters.length > 0 ? voters.join(', ') : 'No votes yet'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Selection 2 Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Week #2 Match</h4>
                  {[
                    { id: '2026-12-12', label: 'Sat 12/12/2026' },
                    { id: '2026-12-13', label: 'Sun 12/13/2026' },
                  ].map((d) => {
                    const voters = tournamentVotes.filter((v) => v.selection_2 === d.id).map((v) => v.user_name);
                    return (
                      <div key={d.id} className="border p-2.5 rounded bg-slate-50 text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{d.label}</span>
                          <span className="text-blue-700">{voters.length} votes</span>
                        </div>
                        <p className="text-slate-500 text-[11px] truncate">
                          {voters.length > 0 ? voters.join(', ') : 'No votes yet'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Selection 3 Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Week #3 Match</h4>
                  {[
                    { id: '2027-01-23', label: 'Sat 1/23/2027' },
                    { id: '2027-01-24', label: 'Sun 1/24/2027' },
                  ].map((d) => {
                    const voters = tournamentVotes.filter((v) => v.selection_3 === d.id).map((v) => v.user_name);
                    return (
                      <div key={d.id} className="border p-2.5 rounded bg-slate-50 text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{d.label}</span>
                          <span className="text-blue-700">{voters.length} votes</span>
                        </div>
                        <p className="text-slate-500 text-[11px] truncate">
                          {voters.length > 0 ? voters.join(', ') : 'No votes yet'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Volunteer Roster */}
              <div className="border-t pt-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Volunteer Offers</h4>
                <div className="space-y-1 text-xs">
                  {tournamentVotes.filter((v) => v.volunteer_note).length === 0 ? (
                    <p className="text-slate-400 italic">No volunteer notes submitted yet.</p>
                  ) : (
                    tournamentVotes
                      .filter((v) => v.volunteer_note)
                      .map((v) => (
                        <div key={v.id} className="flex gap-2">
                          <span className="font-semibold text-slate-700">{v.user_name}:</span>
                          <span className="text-slate-600">{v.volunteer_note}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Session Edit/Add Modal */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {editingSessionId ? 'Edit Meeting Session' : 'Add New Meeting Session'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">
                ×
              </button>
            </div>
            <form onSubmit={handleSaveSession} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Title</label>
                <input
                  type="text"
                  value={modalLabel}
                  onChange={(e) => setModalLabel(e.target.value)}
                  className="w-full border px-3 py-2 rounded-md"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">Dates</label>
                {modalDates.map((dVal, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={dVal}
                      onChange={(e) => {
                        const updated = [...modalDates];
                        updated[idx] = e.target.value;
                        setModalDates(updated);
                      }}
                      className="border px-3 py-2 rounded-md w-full"
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
                <button type="button" onClick={addDateField} className="text-xs text-blue-600 font-semibold inline-flex items-center gap-1">
                  ➕ Add Another Date
                </button>
              </div>

              {/* Time Range Selectors */}
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
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md text-slate-600 hover:bg-slate-100 font-medium">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium">
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
