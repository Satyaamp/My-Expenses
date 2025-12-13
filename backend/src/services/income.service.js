const Income = require('../models/income.model');
const { extractMonthYear } = require('../utils/date.util');

exports.createIncome = async (userId, data) => {
  const { month, year } = extractMonthYear(data.date);
  return Income.create({ ...data, userId, month, year });
};

exports.getIncome = async (userId, month, year) => {
  const query = { userId };

  if (month && year) {
    query.month = Number(month);
    query.year = Number(year);
  }

  return Income.find(query).sort({ date: -1 });
};
