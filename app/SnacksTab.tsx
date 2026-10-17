'use client';

import React from 'react';
import { Session, SnackSignup } from './types';

interface SnacksTabProps {
  sessions: Session[];
  snackSignups: SnackSignup[];
  isNameVerified: boolean;
  onAddSignup: (sessionId: string, dateStr: string, customName?: string) => void;
  onRemoveSignup: (id: string) => void;
  parseLocalDate: (str: string) => Date;
  formatDateShort: (d: Date) => string;
}

export default function SnacksTab({
  sessions,
  snackSignups,
  isNameVerified,
  onAddSignup,
  onRemoveSignup,
  parseLocalDate,
  formatDateShort,
}: SnacksTabProps) {
  return (
    <div className="space-y-8">
      {sessions.map((session) => (
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
                      onClick={() => onAddSignup(session.id, dateStr)}
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
                              isFunds ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span>{isFunds ? '💰 Team Funds' : `😊 ${s.user_name}`}</span>
                            <button
                              onClick={() => onRemoveSignup(s.id)}
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
  );
}
