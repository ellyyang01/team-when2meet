'use client';

import React from 'react';
import { TournamentVote } from './types';

interface TournamentTabProps {
  tournamentVotes: TournamentVote[];
  mySel1: string[];
  setMySel1: (vals: string[]) => void;
  mySel2: string[];
  setMySel2: (vals: string[]) => void;
  mySel3: string[];
  setMySel3: (vals: string[]) => void;
  myVolunteer: string;
  setMyVolunteer: (val: string) => void;
  tourneySaved: boolean;
  isNameVerified: boolean;
  onSave: () => void;
}

export const TRACK_OPTIONS = [
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

const toggleVal = (arr: string[], val: string) =>
  arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

export default function TournamentTab({
  tournamentVotes,
  mySel1,
  setMySel1,
  mySel2,
  setMySel2,
  mySel3,
  setMySel3,
  myVolunteer,
  setMyVolunteer,
  tourneySaved,
  isNameVerified,
  onSave,
}: TournamentTabProps) {
  return (
    <div className="space-y-8">
      {/* Pit Requirements Notice */}
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
              Power will <strong>NOT</strong> be provided directly to pits. Central charging stations will have 1 outlet per team; bring external battery power banks.
            </p>
          </div>
        </div>
      </div>

      {/* Voting Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
        <div className="border-b pb-3">
          <h3 className="text-lg font-bold text-slate-800">
            Select Your Preferred Tournament Tracks (Check All That Work)
          </h3>
          <p className="text-xs text-slate-500">
            Select every day or track combination that fits your family schedule.
          </p>
        </div>

        {/* Selection #1 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-800">
              1. Selection #1: League Track (Week #1 & Week #4 are Linked)
            </label>
            {mySel1.length > 0 && (
              <button
                type="button"
                onClick={() => setMySel1([])}
                className="text-xs text-slate-400 hover:text-red-500"
              >
                Clear Selection ({mySel1.length})
              </button>
            )}
          </div>
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900">
            <strong>Important:</strong> Selection #1 determines <strong>both</strong> your Kickoff and Championship dates together.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {TRACK_OPTIONS.map((t) => {
              const active = mySel1.includes(t.id);
              return (
                <label
                  key={t.id}
                  onClick={() => setMySel1(toggleVal(mySel1, t.id))}
                  className={`border-2 p-3.5 rounded-lg cursor-pointer transition flex flex-col justify-between ${
                    active ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                        {t.pairBadge}
                      </span>
                    </div>
                    <div className="text-xs space-y-1.5 text-slate-700 bg-white/60 p-2 rounded border border-slate-100">
                      <div><span className="text-slate-500 font-semibold">Kickoff:</span> {t.w1}</div>
                      <div><span className="text-slate-500 font-semibold">Championship:</span> {t.w4}</div>
                    </div>
                    <span className="inline-block mt-2 text-[11px] text-slate-500 italic">Combo: {t.patternBadge}</span>
                  </div>
                  <div className="flex items-center justify-between border-t mt-3 pt-2">
                    <span className="text-xs font-medium text-slate-600">Available</span>
                    <input type="checkbox" checked={active} onChange={() => {}} className="text-blue-600 h-4 w-4 rounded" />
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Selection #2 & #3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-800">2. Week #2 Match (Check all that work)</label>
              {mySel2.length > 0 && (
                <button type="button" onClick={() => setMySel2([])} className="text-xs text-slate-400 hover:text-red-500">
                  Clear ({mySel2.length})
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              {[
                { val: '2026-12-12', label: 'Saturday, December 12, 2026' },
                { val: '2026-12-13', label: 'Sunday, December 13, 2026' },
              ].map((opt) => {
                const active = mySel2.includes(opt.val);
                return (
                  <label
                    key={opt.val}
                    onClick={() => setMySel2(toggleVal(mySel2, opt.val))}
                    className={`flex items-center justify-between border-2 p-3.5 rounded-lg cursor-pointer transition ${
                      active ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={active} onChange={() => {}} className="text-blue-600 h-4 w-4 rounded" />
                      <span className="font-bold text-slate-800 text-sm">{opt.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-800">3. Week #3 Match (Check all that work)</label>
              {mySel3.length > 0 && (
                <button type="button" onClick={() => setMySel3([])} className="text-xs text-slate-400 hover:text-red-500">
                  Clear ({mySel3.length})
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              {[
                { val: '2027-01-23', label: 'Saturday, January 23, 2027' },
                { val: '2027-01-24', label: 'Sunday, January 24, 2027' },
              ].map((opt) => {
                const active = mySel3.includes(opt.val);
                return (
                  <label
                    key={opt.val}
                    onClick={() => setMySel3(toggleVal(mySel3, opt.val))}
                    className={`flex items-center justify-between border-2 p-3.5 rounded-lg cursor-pointer transition ${
                      active ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={active} onChange={() => {}} className="text-blue-600 h-4 w-4 rounded" />
                      <span className="font-bold text-slate-800 text-sm">{opt.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Volunteer Field */}
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
          {tourneySaved && <span className="text-sm text-green-600 font-semibold">✓ Schedule choices recorded!</span>}
          <button
            onClick={onSave}
            disabled={!isNameVerified}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-md transition text-sm"
          >
            Submit Tournament Availability
          </button>
        </div>
      </div>

      {/* Consensus Metrics */}
      <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <h3 className="text-lg font-bold text-slate-800 border-b pb-2">
          📊 Team Preference Consensus ({tournamentVotes.length}/14 Responded)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase">League Track</h4>
            {TRACK_OPTIONS.map((t) => {
              const voters = tournamentVotes
                .filter((v) => Array.isArray(v.selection_1) && v.selection_1.includes(t.id))
                .map((v) => v.user_name);
              return (
                <div key={t.id} className="border p-2.5 rounded bg-slate-50 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>{t.name}</span>
                    <span className="text-blue-700">{voters.length} available</span>
                  </div>
                  <p className="text-slate-500 text-[11px] truncate">{voters.length > 0 ? voters.join(', ') : 'None yet'}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Week #2 Match</h4>
            {[
              { id: '2026-12-12', label: 'Sat 12/12/2026' },
              { id: '2026-12-13', label: 'Sun 12/13/2026' },
            ].map((d) => {
              const voters = tournamentVotes
                .filter((v) => Array.isArray(v.selection_2) && v.selection_2.includes(d.id))
                .map((v) => v.user_name);
              return (
                <div key={d.id} className="border p-2.5 rounded bg-slate-50 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>{d.label}</span>
                    <span className="text-blue-700">{voters.length} available</span>
                  </div>
                  <p className="text-slate-500 text-[11px] truncate">{voters.length > 0 ? voters.join(', ') : 'None yet'}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Week #3 Match</h4>
            {[
              { id: '2027-01-23', label: 'Sat 1/23/2027' },
              { id: '2027-01-24', label: 'Sun 1/24/2027' },
            ].map((d) => {
              const voters = tournamentVotes
                .filter((v) => Array.isArray(v.selection_3) && v.selection_3.includes(d.id))
                .map((v) => v.user_name);
              return (
                <div key={d.id} className="border p-2.5 rounded bg-slate-50 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>{d.label}</span>
                    <span className="text-blue-700">{voters.length} available</span>
                  </div>
                  <p className="text-slate-500 text-[11px] truncate">{voters.length > 0 ? voters.join(', ') : 'None yet'}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Volunteer Notes */}
        <div className="border-t pt-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Volunteer Offers</h4>
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
  );
}
