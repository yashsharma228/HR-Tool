import { useEffect, useState } from "react";
import { getMyAttendance } from "../services/api";
import AttendanceCalendar from "./AttendanceCalendar";

export default function NavbarAttendanceCalendar() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch attendance data
  const fetchAttendanceData = () => {
    setLoading(true);
    getMyAttendance()
      .then((res) => setAttendance(res.data))
      .catch(() => setAttendance([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // Auto-refresh at midnight
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = nextMidnight - now;
    const timer = setTimeout(() => {
      fetchAttendanceData();
    }, msUntilMidnight);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">Attendance Calendar</h3>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <AttendanceCalendar attendanceData={attendance} />
      )}
    </div>
  );
}
