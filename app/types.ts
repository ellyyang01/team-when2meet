export interface Session {
  id: string;
  label: string;
  dates: string[];
  start_hour: number;
  end_hour: number;
  display_order: number;
  is_active: boolean;
}

export interface SnackSignup {
  id: string;
  session_id: string;
  date_str: string;
  user_name: string;
}

export interface TeamMember {
  id: string;
  name: string;
}

export interface TournamentVote {
  id: string;
  user_name: string;
  selection_1: string[] | null;
  selection_2: string[] | null;
  selection_3: string[] | null;
  volunteer_note: string | null;
}

export interface HoveredSlotInfo {
  sessionId: string;
  dayLabel: string;
  timeLabel: string;
  available: string[];
  unavailable: string[];
}
