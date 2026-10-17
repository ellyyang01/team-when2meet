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
  selection_1: string;
  selection_2: string;
  selection_3: string;
  volunteer_note: string;
}

interface HoveredSlotInfo {
  sessionId: string;
  dayLabel: string;
  timeLabel: string;
  available: string[];
  unavailable: string[];
}

export default function Home() {
  // Navigation State: 3 distinct standalone views
  const [activeTab, setActiveTab] = useState<'availability' | 'snacks' | 'tournaments'>('availability');

  const [userName, setUserName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([]);
  const [allAvailabilities, setAllAvailabilities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Team Roster State (14 Approved Members)
  const [teamRoster, setTeamRoster] = useState<TeamMember[]>([]);
  const [newMemberName, setNewMemberName] = useState('');

  // Admin Mode State
  const [isAdmin, setIsAdmin] = useState(false);
  const ADMIN_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || 'admin123';
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // Snack Sign-up States
  const [snackSignups, setSnackSignups] = useState<SnackSignup[]>([]);
  const [snackNameInput, setSnackNameInput] = useState('');

  // Tournament Scheduling Tab States
  const [tournamentVotes, setTournamentVotes] = useState<TournamentVote[]>([]);
  const [mySel1, setMySel1] = useState('Euclid');
  const [mySel2, setMySel2] = useState('2026-12-12');
  const [mySel3, setMySel3] = useState('2027-01-23');
  const [myVolunteer, setMyVolunteer] = useState('');
  const [tourneySaved, setTourneySaved] = useState(false);

  // Hover Inspector State
  const [hoveredSlot, setHoveredSlot] = useState<HoveredSlotInfo | null>(null);

  // Modal State for Sessions
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
      setMySel1(existingVote.selection_1);
      setMySel2(existingVote.selection_2);
      setMySel3(existingVote.selection_3);
      setMyVolunteer(existingVote.volunteer_note || '');
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
    if (data && data.length > 0) setSessions(data);
  };

  const fetchAvailabilities = async () => {
    const { data } = await supabase.from('availabilities').select('*').eq('poll_id', DEFAULT_POLL_ID);
    if (data) setAllAvailabilities(data);
  };

  const fetchSnackSignups = async () => {
