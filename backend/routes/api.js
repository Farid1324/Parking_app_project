const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ── PAYMENTS ──────────────────────────────────────────────────────────────────

router.get('/payments/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT p.*, r.start_time, r.end_time FROM payment p LEFT JOIN reservation r ON p.reservation_id = r.reservation_id WHERE p.user_id = ? ORDER BY p.paid_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/payments', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT p.*, u.first_name, u.last_name FROM payment p JOIN user u ON p.user_id = u.id ORDER BY p.paid_at DESC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/payments', authMiddleware, async (req, res) => {
  try {
    const { reservation_id, amount, payment_type } = req.body;
    await db.execute(
      'INSERT INTO payment (user_id, reservation_id, amount, payment_type, status, paid_at) VALUES (?,?,?,?,?,NOW())',
      [req.user.id, reservation_id || null, amount, payment_type || 'reservation', 'completed']
    );
    if (reservation_id) {
      await db.execute("UPDATE reservation SET status = 'active' WHERE reservation_id = ?", [reservation_id]);
    }
    res.status(201).json({ message: 'Payment recorded' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────

router.get('/subscription-plans', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM subscription_plan ORDER BY price');
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/subscription-plans', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, price, duration_months, zone, allowed_user_type } = req.body;
    await db.execute(
      'INSERT INTO subscription_plan (name, price, duration_months, zone, allowed_user_type) VALUES (?,?,?,?,?)',
      [name, price, duration_months, zone, allowed_user_type || null]
    );
    res.status(201).json({ message: 'Plan created' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/subscriptions/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT s.*, sp.name as plan_name, sp.zone, sp.duration_months FROM subscription s JOIN subscription_plan sp ON s.plan_id = sp.plan_id WHERE s.user_id = ? ORDER BY s.start_date DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});


router.put('/subscriptions/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM subscription WHERE subscription_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Subscription not found' });
    if (rows[0].status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });
    await db.execute(
      "UPDATE subscription SET status = 'cancelled' WHERE subscription_id = ?",
      [req.params.id]
    );
    res.json({ message: 'Subscription cancelled' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});




router.post('/subscriptions', authMiddleware, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const [plans] = await db.execute('SELECT * FROM subscription_plan WHERE plan_id = ?', [plan_id]);
    if (plans.length === 0) return res.status(404).json({ message: 'Plan not found' });
    const plan = plans[0];
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + plan.duration_months);
    await db.execute(
      'INSERT INTO subscription (user_id, plan_id, start_date, end_date, status) VALUES (?,?,?,?,?)',
      [req.user.id, plan_id, start.toISOString().split('T')[0], end.toISOString().split('T')[0], 'active']
    );
    await db.execute(
      'INSERT INTO payment (user_id, reservation_id, amount, payment_type, status, paid_at) VALUES (?,NULL,?,?,?,NOW())',
      [req.user.id, plan.price, 'subscription', 'completed']
    );
    res.status(201).json({ message: 'Subscription activated' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── STUDENT DISCOUNTS ─────────────────────────────────────────────────────────

router.get('/discounts/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM student_discount WHERE user_id = ?', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/discounts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT sd.*, u.first_name, u.last_name, u.email FROM student_discount sd JOIN user u ON sd.user_id = u.id ORDER BY sd.applied_at DESC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/discounts', authMiddleware, async (req, res) => {
  try {
    const { student_id_number, university_email, institution } = req.body;
    const [existing] = await db.execute(
      "SELECT discount_id FROM student_discount WHERE user_id = ? AND status IN ('pending','approved')",
      [req.user.id]
    );
    if (existing.length > 0) return res.status(400).json({ message: 'Discount request already exists' });
    await db.execute(
      'INSERT INTO student_discount (user_id, student_id_number, university_email, institution, status, applied_at) VALUES (?,?,?,?,?,NOW())',
      [req.user.id, student_id_number, university_email, institution, 'pending']
    );
    res.status(201).json({ message: 'Discount application submitted' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/discounts/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await db.execute(
      'UPDATE student_discount SET status = ?, reviewed_at = NOW() WHERE discount_id = ?',
      [status, req.params.id]
    );
    res.json({ message: `Discount ${status}` });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── VIOLATIONS ────────────────────────────────────────────────────────────────

router.get('/violations/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM violation WHERE user_id = ? ORDER BY detected_at DESC', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/violations', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT v.*, u.first_name, u.last_name FROM violation v JOIN user u ON v.user_id = u.id ORDER BY v.detected_at DESC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/violations/:id/pay', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM violation WHERE violation_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    await db.execute("UPDATE violation SET status = 'paid' WHERE violation_id = ?", [req.params.id]);
    await db.execute(
      'INSERT INTO payment (user_id, reservation_id, amount, payment_type, status, paid_at) VALUES (?,?,?,?,?,NOW())',
      [req.user.id, rows[0].reservation_id, rows[0].fine_amount, 'fine', 'completed']
    );
    res.json({ message: 'Fine paid' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── USERS (admin) ─────────────────────────────────────────────────────────────

router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, first_name, last_name, email, user_type, status, created_at FROM user ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, user_type } = req.body;
    await db.execute('UPDATE user SET status = ?, user_type = ? WHERE id = ?', [status, user_type, req.params.id]);
    res.json({ message: 'User updated' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── PRICING RULES ─────────────────────────────────────────────────────────────

router.get('/pricing-rules', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT pr.*, pl.name as lot_name FROM pricing_rule pr JOIN parking_lot pl ON pr.lot_id = pl.lot_id'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/pricing-rules', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { lot_id, user_type, rate_per_hour, peak_start, peak_end, peak_rate } = req.body;
    await db.execute(
      'INSERT INTO pricing_rule (lot_id, user_type, rate_per_hour, peak_start, peak_end, peak_rate) VALUES (?,?,?,?,?,?)',
      [lot_id, user_type || null, rate_per_hour, peak_start || null, peak_end || null, peak_rate || null]
    );
    res.status(201).json({ message: 'Pricing rule created' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ── REPORTS (admin) ───────────────────────────────────────────────────────────

router.get('/reports/summary', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [[totalUsers]] = await db.execute('SELECT COUNT(*) as count FROM user');
    const [[totalReservations]] = await db.execute('SELECT COUNT(*) as count FROM reservation');
    const [[activeReservations]] = await db.execute("SELECT COUNT(*) as count FROM reservation WHERE status IN ('pending','active')");
    const [[totalRevenue]] = await db.execute("SELECT COALESCE(SUM(amount),0) as total FROM payment WHERE status = 'completed'");
    const [[pendingDiscounts]] = await db.execute("SELECT COUNT(*) as count FROM student_discount WHERE status = 'pending'");
    const [[unpaidFines]] = await db.execute("SELECT COUNT(*) as count FROM violation WHERE status = 'unpaid'");
    const [topLots] = await db.execute(`
      SELECT pl.name, COUNT(r.reservation_id) as reservations
      FROM parking_lot pl
      LEFT JOIN parking_space ps ON pl.lot_id = ps.lot_id
      LEFT JOIN reservation r ON ps.space_id = r.space_id
      GROUP BY pl.lot_id
      ORDER BY reservations DESC
      LIMIT 5
    `);
    res.json({
      totalUsers: totalUsers.count,
      totalReservations: totalReservations.count,
      activeReservations: activeReservations.count,
      totalRevenue: totalRevenue.total,
      pendingDiscounts: pendingDiscounts.count,
      unpaidFines: unpaidFines.count,
      topLots
    });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
