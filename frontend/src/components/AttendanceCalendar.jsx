import React from "react";
import Calendar from "react-calendar";
import "./AttendanceCalendar.css";

const statusColors = {
  Present: "#22c55e", // green
  Late: "#eab308", // yellow
  "Half Day": "#f59e42", // orange
  Absent: "#ef4444", // red
};

export default function AttendanceCalendar({ attendanceData }) {
  return (
    <div className="my-8">
      <h3 className="font-semibold mb-2">Attendance Calendar</h3>
      <Calendar
        tileContent={({ date }) => {
          const record = attendanceData.find(
            (a) => new Date(a.date).toDateString() === date.toDateString()
          );
          if (record) {
            return (
              <span
                style={{
                  display: "block",
                  marginTop: 2,
                  fontSize: 12,
                  color: statusColors[record.status] || "#64748b",
                  fontWeight: "bold",
                }}
              >
                {record.status}
              </span>
            );
          }
        }}
        tileClassName={({ date }) => {
          const record = attendanceData.find(
            (a) => new Date(a.date).toDateString() === date.toDateString()
          );
          if (record) {
            return "attendance-calendar-status";
          }
          return null;
        }}
      />
      <div className="flex gap-4 mt-4 text-xs">
        <span><span style={{color: statusColors.Present}}>●</span> Present</span>
        <span><span style={{color: statusColors.Late}}>●</span> Late</span>
        <span><span style={{color: statusColors["Half Day"]}}>●</span> Half Day</span>
        <span><span style={{color: statusColors.Absent}}>●</span> Absent</span>
      </div>
    </div>
  );
}
