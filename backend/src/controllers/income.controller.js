const incomeService = require('../services/income.service');
const { success } = require('../utils/response.util');

exports.createIncome = async (req, res) => {
  const income = await incomeService.createIncome(
    req.user.id,
    req.body
  );

  success(res, income, 'Income added successfully');
};

exports.getMonthlyIncome = async (req, res) => {
  const data = await incomeService.getIncome(
    req.user.id,
    req.query.month,
    req.query.year
  );
  success(res, data, 'Income fetched successfully');
};


