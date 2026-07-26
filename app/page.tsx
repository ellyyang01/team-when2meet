'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [allAvailabilities, setAllAvailabilities] = useState<any[]>([]);
  const [slotUserMap, setSlotUserMap] = useState<Map<string, string[]>>(new Map());

  // Define weekends to display (e.g., Weekend 1, Weekend 2)
  const weekends = [
    {
      id: 1,
      title: 'Weekend 1: Aug 15 - Aug 16',
      satDate: new Date(2026, 7, 15),
      sunDate: new Date(2026, 7, 16),
    },
    {
      id: 2,
      title: 'Weekend 2: Aug 22 - Aug 23',
      satDate: new Date(2026, 7, 22),
      sunDate: new Date(2026, 7, 23),
    },
  ];

  const timeSlots = [
    { label: '10:00 am', hour: 10, minute: 0 },
    { label: '10:30 am', hour: 10, minute: 30 },
    { label: '11:00 am', hour: 11, minute: 0 },
    { label: '11:30 am', hour: 11, minute: 30 },
    { label: '12:00 pm', hour: 12, minute: 0 },
    { label: '12:30 pm', hour: 12, minute: 30 },
    { label: '1:00 pm', hour: 13, minute: 0 },
    { label: '1:30 pm', hour: 13, minute: 30 },
    { label: '2:00 pm', hour: 14, minute: 0 },
    { label: '2:30 pm', hour: 14, minute: 30 },
    { label: '3:00 pm', hour: 15, minute: 0 },
    { label: '3:30 pm', hour: 15, minute: 30 },
    { label: '4:00 pm', hour: 16, minute: 0 },
    { label: '4:30 pm', hour: 16, minute: 30 },
    { label: '5:00 pm', hour: 17, minute: 0 },
  ];

  const getSlotKey = (date: Date) => date.toISOString();

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-8">
      {weekends.map((weekend) => {
        // Calculate respondents specifically for this weekend
        const weekendRespondents = allAvailabilities?.length > 0
          ? new Set(
              allAvailabilities
                .filter((item) => {
                  if (!item?.slot_time || !item?.user_name) return false;
                  const d = new Date(item.slot_time);
                  const isSat =
                    d.getFullYear() === weekend.satDate.getFullYear() &&
                    d.getMonth() === weekend.satDate.getMonth() &&
                    d.getDate() === weekend.satDate.getDate();
                  const isSun =
                    d.getFullYear() === weekend.sunDate.getFullYear() &&
                    d.getMonth() === weekend.sunDate.getMonth() &&
                    d.getDate() === weekend.sunDate.getDate();
                  return isSat || isSun;
                })
                .map((item) => item.user_name.trim().toLowerCase())
            ).size
          : 0;

        return (
          <div key={weekend.id} className="border rounded-lg p-6 bg-white shadow-sm">
            <h2 className="text-xl font-bold border-b pb-3 mb-4 text-slate-800">
              {weekend.title}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side: Personal Availability Form / Selector */}
              <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">
                  Your Availability
                </h3>
                <div className="border rounded bg-slate-50 p-3 text-xs">
                  <div className="grid grid-cols-3 text-center font-semibold text-slate-600 border-b pb-2 mb-2">
                    <div>Time</div>
                    <div>{weekend.satDate.getMonth() + 1}/{weekend.satDate.getDate()}</div>
                    <div>{weekend.sunDate.getMonth() + 1}/{weekend.sunDate.getDate()}</div>
                  </div>
                  <div className="space-y-1">
                    {timeSlots.map((slot, i) => (
                      <div key={i} className="grid grid-cols-3 gap-1 items-center h-6">
                        <div className="text-slate-400 text-right pr-2 text-[10px]">
                          {slot.label}
                        </div>
                        <div className="h-full rounded bg-slate-100 hover:bg-emerald-100 cursor-pointer transition-colors" />
                        <div className="h-full rounded bg-slate-100 hover:bg-emerald-100 cursor-pointer transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: Team Overlap Heatmap */}
              <div>
                <div className="flex justify-between items-baseline mb-3">
                  <h3 className="text-sm font-semibold text-slate-600">
                    Team Overlap
                  </h3>
                  <span className="text-xs text-slate-500">
                    Respondents: {weekendRespondents}
                  </span>
                </div>

                <div className="border rounded bg-white p-3 text-xs">
                  <div className="grid grid-cols-3 text-center font-semibold text-slate-600 border-b pb-2 mb-2">
                    <div>Time</div>
                    <div>{weekend.satDate.getMonth() + 1}/{weekend.satDate.getDate()} (Sat)</div>
                    <div>{weekend.sunDate.getMonth() + 1}/{weekend.sunDate.getDate()} (Sun)</div>
                  </div>

                  <div className="space-y-1">
                    {timeSlots.map((slot, i) => {
                      const satSlotDate = new Date(
                        weekend.satDate.getFullYear(),
                        weekend.satDate.getMonth(),
                        weekend.satDate.getDate(),
                        slot.hour,
                        slot.minute
                      );
                      const sunSlotDate = new Date(
                        weekend.sunDate.getFullYear(),
                        weekend.sunDate.getMonth(),
                        weekend.sunDate.getDate(),
                        slot.hour,
                        slot.minute
                      );

                      const satUsers = slotUserMap.get(getSlotKey(satSlotDate)) || [];
                      const sunUsers = slotUserMap.get(getSlotKey(sunSlotDate)) || [];

                      const satOpacity = weekendRespondents > 0 ? satUsers.length / weekendRespondents : 0;
                      const sunOpacity = weekendRespondents > 0 ? sunUsers.length / weekendRespondents : 0;

                      return (
                        <div key={i} className="grid grid-cols-3 gap-1 items-center h-6">
                          <div className="text-slate-400 text-right pr-2 text-[10px]">
                            {slot.label}
                          </div>

                          <div
                            title={
                              satUsers.length > 0
                                ? `${satUsers.length}/${weekendRespondents} free: ${satUsers.join(', ')}`
                                : '0 available'
                            }
                            style={{
                              backgroundColor:
                                satUsers.length > 0
                                  ? `rgba(34, 197, 94, ${Math.max(satOpacity, 0.2)})`
                                  : '#f1f5f9',
                            }}
                            className="h-full rounded flex items-center justify-center font-medium text-slate-700"
                          >
                            {satUsers.length > 0 ? satUsers.length : ''}
                          </div>

                          <div
                            title={
                              sunUsers.length > 0
                                ? `${sunUsers.length}/${weekendRespondents} free: ${sunUsers.join(', ')}`
                                : '0 available'
                            }
                            style={{
                              backgroundColor:
                                sunUsers.length > 0
                                  ? `rgba(34, 197, 94, ${Math.max(sunOpacity, 0.2)})`
                                  : '#f1f5f9',
                            }}
                            className="h-full rounded flex items-center justify-center font-medium text-slate-700"
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
    </main>
  );
}
