const cron = require('node-cron');
const { upsertDailyAttendanceSummary } = require('../utils/attendanceSummary');

let dailyAttendanceSummaryTask = null;

const startDailyAttendanceSummaryJob = () => {
  if (dailyAttendanceSummaryTask) {
    return dailyAttendanceSummaryTask;
  }

  dailyAttendanceSummaryTask = cron.schedule('0 18 * * *', async () => {
    try {
      const { summary } = await upsertDailyAttendanceSummary(new Date());
      console.log('Daily attendance summary finalized for', summary.date.toISOString());
    } catch (error) {
      console.error('Failed to finalize daily attendance summary:', error.message);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'Asia/Kolkata',
  });

  return dailyAttendanceSummaryTask;
};

module.exports = { startDailyAttendanceSummaryJob };