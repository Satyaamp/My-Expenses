const mongoose = require('mongoose');
const Expense = require('../models/expense.model');
const Income = require('../models/income.model');
const { extractMonthYear } = require('../utils/date.util');


// ---------------- CREATE EXPENSE ----------------
exports.createExpense = async (userId, data) => {
  const { month, year } = extractMonthYear(data.date);

  return Expense.create({
    ...data,
    userId,
    month,
    year
  });
};


// ---------------- WEEKLY EXPENSE ----------------
exports.getWeekly = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  return Expense.find({
    userId: uid,
    date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  })
  .sort({ date: -1 })   // latest first
  .limit(3);            // ✅ only 3 transactions
};



// ---------------- CATEGORY SUMMARY ----------------
exports.categorySummary = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  return Expense.aggregate([
    { $match: { userId: uid } },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' }
      }
    }
  ]);
};


// ---------------- REMAINING BALANCE ----------------
exports.getRemainingBalance = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  const [expenseAgg] = await Expense.aggregate([
    { $match: { userId: uid } },
    {
      $group: {
        _id: null,
        totalExpense: { $sum: '$amount' }
      }
    }
  ]);

  const [incomeAgg] = await Income.aggregate([
    { $match: { userId: uid } },
    {
      $group: {
        _id: null,
        totalIncome: { $sum: '$amount' }
      }
    }
  ]);

  const totalExpense = expenseAgg?.totalExpense || 0;
  const totalIncome = incomeAgg?.totalIncome || 0;
  const remaining = totalIncome - totalExpense;

  // ✅ FIXED: Rounded to 2 decimal places
  return {
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpense: Number(totalExpense.toFixed(2)),
    remainingBalance: Number(remaining.toFixed(2))
  };
};


// ---------------- MONTHLY SUMMARY ----------------
exports.getMonthlySummary = async (userId, month, year) => {
  const m = parseInt(month);
  const y = parseInt(year);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // 1. Calculate Total Expenses
  const expenseAggregation = await Expense.aggregate([
    { $match: { userId: userObjectId, month: m, year: y } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  // 2. Calculate Total Income
  const incomeAggregation = await Income.aggregate([
    { $match: { userId: userObjectId, month: m, year: y } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  // 3. Calculate Category Breakdown
  const categoryAggregation = await Expense.aggregate([
    { $match: { userId: userObjectId, month: m, year: y } },
    { 
      $group: { 
        _id: '$category', 
        total: { $sum: '$amount' },
        count: { $sum: 1 } 
      } 
    },
    { $sort: { total: -1 } } 
  ]);

  const totalExpense = expenseAggregation.length > 0 ? expenseAggregation[0].total : 0;
  const totalIncome = incomeAggregation.length > 0 ? incomeAggregation[0].total : 0;
  const balance = totalIncome - totalExpense;

  // ✅ FIXED: Returns clean numbers (e.g., 230.61 instead of 230.6100005)
  return {
    month: m,
    year: y,
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpense: Number(totalExpense.toFixed(2)),
    balance: Number(balance.toFixed(2)),
    
    categories: categoryAggregation.map(item => ({
      category: item._id,
      total: Number(item.total.toFixed(2)), // Round category totals too
      count: item.count
    }))
  };
};


// ---------------- DELETE EXPENSE ----------------
exports.deleteExpense = async (userId, expenseId) => {
  const expense = await Expense.findOneAndDelete({
    _id: expenseId,
    userId
  });

  if (!expense) throw new Error('Expense not found');
  return expense;
};

// ---------------- GET ALL EXPENSES ----------------
exports.getAllExpenses = async (userId) => {
  return Expense.find({ userId })
    .sort({ date: -1 }); // latest first
};


exports.getByMonthYear = async (userId, month, year) => {
  return Expense.find({
    userId,
    month: Number(month),
    year: Number(year)
  }).sort({ date: -1 });
};
