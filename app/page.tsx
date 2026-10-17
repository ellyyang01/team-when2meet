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

  // Team Roster State (14 Members)
  const [teamRoster, setTeamRoster] = useState<TeamMember[]>([]);
  const [newMemberName, setNewMemberName] = useState('');

  // Admin Mode State
  const [isAdmin, setIsAdmin] = useState(false);
  const ADMIN_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || 'admin123';
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // Snack Sign-up States
  const [snackSignups, setSnackSignups] = useState<SnackSignup[]>([]);
  const [snackNameInput, setSnackNameInput] = useState('');

  // Tournament Scheduling Tab States (Nullable / Optional Selections)
  const [tournamentVotes, setTournamentVotes] = useState<TournamentVote[]>([]);
  const [mySel1, setMySel1] = useState('');
  const [mySel2, setMySel2] = useState('');
  const [mySel3, setMySel3] = useState('');
  const [myVolunteer, setMyVolunteer] = useState('');
  const [tourneySaved, setTourneySaved] = useState(false);
