const Attendance = require('../models/Attendance');
const User = require('../models/User');

exports.getMonthlyReport = async (req, res) => {
  try {
    const { year, month, userId } = req.query;

    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month are required' });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    endDate.setHours(23, 59, 59, 999);

    const filter = {
      date: { $gte: startDate, $lte: endDate }
    };

    if (userId) filter.userId = userId;

    const records = await Attendance.find(filter)
      .populate('userId', 'name email role')
      .sort({ date: 1 });

    const userFilter = userId ? { _id: userId } : { role: 'employee' };
    const employees = await User.find(userFilter).select('_id name email');

    const report = employees.map(employee => {
      const employeeRecords = records.filter(
        r => r.userId && r.userId._id.toString() === employee._id.toString()
      );

      const presentDays = employeeRecords.filter(r => r.status === 'Present').length;
      const absentDays = employeeRecords.filter(r => r.status === 'Absent').length;
      const totalDays = employeeRecords.length;

      return {
        employee: {
          id: employee._id,
          name: employee.name,
          email: employee.email
        },
        statistics: {
          totalDays,
          presentDays,
          absentDays,
          presentPercentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
        },
        records: employeeRecords.map(r => ({
          date: r.date,
          status: r.status
        }))
      };
    });

    const summary = {
      totalEmployees: report.length,
      totalPresent: report.reduce((sum, r) => sum + r.statistics.presentDays, 0),
      totalAbsent: report.reduce((sum, r) => sum + r.statistics.absentDays, 0),
      overallPresentPercentage: report.reduce((sum, r) => sum + r.statistics.presentPercentage, 0) / (report.length || 1)
    };

    res.json({
      period: { year: parseInt(year), month: parseInt(month) },
      summary,
      employees: report
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getYearlyReport = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ message: 'Year is required' });
    }

    const yearlyData = [];

    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(parseInt(year), month - 1, 1);
      const endDate = new Date(parseInt(year), month, 0);
      endDate.setHours(23, 59, 59, 999);

      const records = await Attendance.find({
        date: { $gte: startDate, $lte: endDate }
      }).populate('userId', 'name email role');

      const presentDays = records.filter(r => r.status === 'Present').length;
      const absentDays = records.filter(r => r.status === 'Absent').length;
      const totalDays = records.length;

      yearlyData.push({
        month,
        monthName: new Date(parseInt(year), month - 1).toLocaleString('default', { month: 'long' }),
        statistics: {
          totalDays,
          presentDays,
          absentDays,
          presentPercentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
        }
      });
    }

    res.json({
      year: parseInt(year),
      months: yearlyData,
      summary: {
        totalDays: yearlyData.reduce((sum, m) => sum + m.statistics.totalDays, 0),
        totalPresent: yearlyData.reduce((sum, m) => sum + m.statistics.presentDays, 0),
        totalAbsent: yearlyData.reduce((sum, m) => sum + m.statistics.absentDays, 0),
        avgPresentPercentage: Math.round(
          yearlyData.reduce((sum, m) => sum + m.statistics.presentPercentage, 0) / 12
        )
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};