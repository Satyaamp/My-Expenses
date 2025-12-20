const service = require('../services/expense.service');
const { success } = require('../utils/response.util');
const Expense = require('../models/expense.model'); // 👈 Add this line at the top!
const mongoose = require('mongoose');

exports.create = async (req, res) =>
  success(res, await service.createExpense(req.user.id, req.body));

exports.weekly = async (req, res) =>
  success(res, await service.getWeekly(req.user.id, req.query.startDate, req.query.endDate));

exports.summary = async (req, res) =>
  success(res, await service.categorySummary(req.user.id, req.query.startDate, req.query.endDate));

exports.balance = async (req, res) => {
  const data = await service.getRemainingBalance(req.user.id);
  success(res, data, 'Balance fetched successfully');
};

exports.monthlySummary = async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year)
    return res.status(400).json({ message: 'Month and Year required' });

  const data = await service.getMonthlySummary(
    req.user.id,
    month,
    year
  );

  success(res, data, 'Monthly summary fetched');
};

exports.delete = async (req, res) => {
  const data = await service.deleteExpense(
    req.user.id,
    req.params.id
  );
  success(res, data, 'Expense deleted successfully');
};

exports.addBulkExpenses = async (req, res) => {
    try {
        const expenses = req.body; 

        // 👇 Map over the array to add USER ID and DATE info
        const expensesWithData = expenses.map(item => {
            const dateObj = new Date(item.date);
            return {
                ...item,
                userId: req.user.id, // ✅ FIX 1: Attach the logged-in User ID
                month: dateObj.getMonth() + 1,
                year: dateObj.getFullYear()
            };
        });

        const savedExpenses = await Expense.insertMany(expensesWithData);

        res.status(201).json({
            success: true,
            count: savedExpenses.length,
            message: "All expenses added successfully!"
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};


exports.getAll = async (req, res) => {
  const expenses = await service.getAllExpenses(req.user.id, req.query.startDate, req.query.endDate);
  success(res, expenses, 'Expenses fetched successfully');
};

exports.getByMonthYear = async (req, res) => {
  const { month, year } = req.query;

  const expenses = await service.getByMonthYear(
    req.user.id,
    month,
    year
  );

  success(res, expenses, "Monthly expenses fetched");
};

exports.yearly = async (req, res) => {
  try {
    const stats = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: { $year: "$date" },
          totalExpense: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    success(res, stats, 'Yearly expenses fetched');
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
