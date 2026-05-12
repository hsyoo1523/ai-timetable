'use client'

import type { ScheduleSlot } from '@/types/index'
import { DAYS, DAYTIME_TIMES } from '@/types/index'

interface Props {
  slots: ScheduleSlot[]
}

export function TimetableGrid({ slots }: Props) {
  const slotMap = new Map<string, ScheduleSlot>()
  for (const s of slots) {
    slotMap.set(`${s.day}-${s.period}`, s)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-center w-16">교시</th>
            {DAYS.map(day => (
              <th key={day} className="border border-gray-300 bg-gray-100 px-2 py-1 text-center">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYTIME_TIMES.map((time, idx) => {
            const period = idx + 1
            return (
              <tr key={period}>
                <td className="border border-gray-200 px-2 py-1 text-center text-xs text-gray-500">
                  <div>{period}교시</div>
                  <div className="text-[10px]">{time}</div>
                </td>
                {DAYS.map(day => {
                  const slot = slotMap.get(`${day}-${period}`)
                  return (
                    <td
                      key={day}
                      className="border border-gray-200 px-1 py-1 text-center align-middle h-14"
                      style={slot ? { backgroundColor: slot.color + '33' } : undefined}
                    >
                      {slot && (
                        <div className="text-xs leading-tight">
                          <div
                            className="font-semibold truncate"
                            style={{ color: slot.color }}
                          >
                            {slot.subject_name}
                          </div>
                          {slot.room && <div className="text-gray-500">{slot.room}</div>}
                          {slot.professor && <div className="text-gray-400">{slot.professor}</div>}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}