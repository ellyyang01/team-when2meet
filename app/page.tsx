'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [allAvailabilities, setAllAvailabilities] = useState<any[]>([]);
  const [slotUserMap, setSlotUserMap] = useState<Map<string, string[]>>(new Map());
  const [totalUsers, setTotalUsers] = useState(0);

  // Example dates / setup
  const satDate = new Date();
  const sunDate = new Date();

  const timeSlots = [
    { label: '9:00 AM', hour: 9, minute: 0 },
    { label: '9:30 AM', hour: 9, minute: 30 },
    { label: '10:00 AM', hour: 10, minute: 0 },
    { label: '10:30 AM', hour: 10, minute: 30 },
    { label: '11:00 AM', hour: 11, minute: 0 },
    { label: '11:30 AM', hour: 11, minute: 30 },
    { label: '12:00 PM', hour: 12, minute: 0 },
    { label: '12:30 PM', hour: 12, minute: 30 },
    { label: '1:00 PM', hour: 13, minute: 0 },
    { label: '1:30 PM', hour: 13, minute: 30 },
    { label: '2:00 PM', hour: 14, minute: 0 },
    { label: '2:30 PM', hour: 14, minute: 30 },
    { label: '3:00 PM', hour: 15, minute: 0 },
    { label: '3:30 PM', hour: 15, minute: 30 },
    { label: '4:00 PM', hour: 16, minute: 0 },
    { label: '4:30 PM', hour: 16, minute: 30 },
    { label: '5:00 PM', hour: 17, minute: 0 }
  ];

  const getSlotKey = (date: Date) => date.toISOString();

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <div>
        <div className="flex justify-between items-baseline mb-3">
          <h3 className="text-sm font-semibold text-slate-600">Team Overlap</h3>
          <span className="text-xs text-slate-500">
            Respondents:{' '}
            {allAvailabilities?.length > 0
              ? new Set(
                  allAvailabilities
                    .filter((item) => {
                      if (!item?.slot_time || !item?.user_name) return false;
                      const d = new Date(item.slot_time);
                      const isSat =
                        d.getFullYear() === satDate.getFullYear() &&
                        d.getMonth() === satDate.getMonth() &&
                        d.getDate() === satDate.getDate();
                      const isSun =
                        d.getFullYear() === sunDate.getFullYear() &&
                        d.getMonth() === sunDate.getMonth() &&
                        d.getDate() === sunDate.getDate();
                      return isSat || isSun;
                    })
                    .map((item) => item.user_name.trim().toLowerCase())
                ).size
              : 0}
          </span>
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
                    title={satUsers.length > 0 ? `${satUsers.length}/${totalUsers} free: ${satUsers.join(', ')}` : '0 available'}
                    style={{
                      backgroundColor: satUsers.length > 0 ? `rgba(34, 197, 94, ${Math.max(satOpacity, 0.2)})` : '#f1f5f9'
                    }}
                    className="h-full rounded flex items-center justify-center font-medium text-slate-700"
                  >
                    {satUsers.length > 0 ? satUsers.length : ''}
                  </div>

                  <div
                    title={sunUsers.length > 0 ? `${sunUsers.length}/${totalUsers} free: ${sunUsers.join(', ')}` : '0 available'}
                    style={{
                      backgroundColor: sunUsers.length > 0 ? `rgba(34, 197, 94, ${Math.max(sunOpacity, 0.2)})` : '#f1f5f9'
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
    </main>
  );
}
