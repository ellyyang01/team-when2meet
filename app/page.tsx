'use client';

import React, { useState, useEffect } from 'react';
import ScheduleSelector from 'react-schedule-selector';
import { supabase } from '@/lib/supabase';
import { Session, SnackSignup, TeamMember, TournamentVote, HoveredSlotInfo } from './types';
import TournamentTab from './TournamentTab';
import SnacksTab from './SnacksTab';

const DEFAULT_POLL_ID = '00000000-0000-0000-0000-000000000001';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'availability' | 'snacks' | 'tournaments'>('availability');
  const [userName, setUserName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([]);
  const [allAvailabilities, setAllAvailabilities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [teamRoster, setTeamRoster] = useState<TeamMember[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const ADMIN_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || 'admin123';
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  const [snackSignups, setSnackSignups] = useState<SnackSignup[]>([]);
  const [snackNameInput, setSnackNameInput] = useState('');

  const [tournamentVotes, setTournamentVotes] = useState<TournamentVote[]>([]);
  const [mySel1, setMySel1] = useState<string[]>([]);
  const [mySel2, setMySel2] = useState<string[]>([]);
  const [mySel3, setMySel3] = useState<string[]>([]);
  const [myVolunteer, setMyVolunteer] = useState('');
  const [tourneySaved, setTourneySaved] = useState(false);

  const [hoveredSlot, setHoveredSlot] = useState<HoveredSlotInfo | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [modalLabel, setModalLabel] = useState('');
  const [modalDates, setModalDates] = useState<string[]>(['']);
  const [modalStartHour, setModalStartHour] = useState(10);
  const [modalEndHour, setModalEndHour] = useState(19);

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

    if (localStorage.getItem('is_team_admin') === 'true') {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    if (!userName.trim()) {
      setSelectedSlots([]);
      setMySel1([]);
      setMySel2([]);
      setMySel3([]);
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
      setMySel1(Array.isArray(existingVote.selection_1) ? existingVote.selection_1 : []);
      setMySel2(Array.isArray(existingVote.selection_2) ? existingVote.selection_2 : []);
      setMySel3(Array.isArray(existingVote.selection_3) ? existingVote.selection_3 : []);
      setMyVolunteer(existingVote.volunteer_note || '');
    } else {
      setMySel1([]);
      setMySel2([]);
      setMySel3([]);
      setMyVolunteer('');
    }
  }, [userName, allAvailabilities, tournamentVotes]);

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
      alert(`Error: ${error.message}`);
      return;
    }
    setNewMemberName('');
    await fetchTeamRoster();
  };

  const handleRemoveRosterMember = async (id: string) => {
    const { error } = await supabase.from('team_roster').delete().eq('id', id);
    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }
    await fetchTeamRoster();
  };

  const fetchSessions = async () => {
    const { data } = await supabase.from('session_config').select('*').order('display_order', { ascending: true });
    if (data && data.length > 0) setSessions(data);
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

    if (mySel1.length === 0 && mySel2.length === 0 && mySel3.length === 0 && !myVolunteer.trim()) {
      alert('Please make at least one tournament selection or leave a volunteer note.');
      return;
    }

    const matched = teamRoster.find((m) => m.name.toLowerCase() === userName.trim().toLowerCase());
    const formattedName = matched ? matched.name : userName.trim();

    const existingVote = tournamentVotes.find(
      (v) => v.user_name.trim().toLowerCase() === userName.trim().toLowerCase()
    );

    const finalSel1 = mySel1.length > 0 ? mySel1 : existingVote?.selection_1 || [];
    const finalSel2 = mySel2.length > 0 ? mySel2 : existingVote?.selection_2 || [];
    const finalSel3 = mySel3.length > 0 ? mySel3 : existingVote?.selection_3 || [];
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

    if (!isTeamFunds && (!nameToSign || !isNameVerified)) {
      alert('Please select your verified roster name first.');
      return;
    }

    const formattedName = isTeamFunds ? 'Team Funds' : teamRoster.find((m) => m.name.toLowerCase() === nameToSign.toLowerCase())?.name || nameToSign;

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

        {/* Tab Navigation */}
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
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'active' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-600'}`}
              >
                🟢 Active ({sessions.filter((s) => s.is_active).length})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'inactive' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-600'}`}
              >
                ⚪ Inactive ({sessions.filter((s) => !s.is_active).length})
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-600'}`}
              >
                📂 All ({sessions.length})
              </button>
            </div>
          )}
        </div>

        {/* Global Roster Selector */}
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

        {/* Admin Roster Panel */}
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
              <button type="submit" className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs px-3 py-1 rounded-md transition">
                + Add Member
              </button>
            </form>
            <div className="flex flex-wrap gap-2 pt-1">
              {teamRoster.map((m) => (
                <span key={m.id} className="bg-white border text-slate-700 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <span>{m.name}</span>
                  <button type="button" onClick={() => handleRemoveRosterMember(m.id)} className="text-slate-400 hover:text-red-600 font-bold ml-1 text-xs">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1 Content */}
        {activeTab === 'availability' && (
          <div className="space-y-8">
            {filteredSessions.map((session, sessionIdx) => {
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
                          className={`text-xs px
