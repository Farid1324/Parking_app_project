const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get user's reservations
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT r.*, ps.space_number, pl.name as lot_name, pl.location as lot_location
      FROM reservation r
      JOIN parking_space ps ON r.space_id = ps.space_id
      JOIN parking_lot pl ON ps.lot_id = pl.lot_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all reservations (admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT r.*, u.first_name, u.last_name, u.email,
        ps.space_number, pl.name as lot_name
      FROM reservation r
      JOIN user u ON r.user_id = u.id
      JOIN parking_space ps ON r.space_id = ps.space_id
      JOIN parking_lot pl ON ps.lot_id = pl.lot_id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create reservation
router.post('/', authMiddleware, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { space_id, start_time, end_time } = req.body;
    if (!space_id || !start_time || !end_time) {
      return res.status(400).json({ message: 'space_id, start_time, end_time required' });
    }

    // Check for unpaid fines
    const [fines] = await conn.execute(
      "SELECT violation_id FROM violation WHERE user_id = ? AND status = 'unpaid'",
      [req.user.id]
    );
    if (fines.length > 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'You have unpaid fines. Please settle them before making a new reservation.' });
    }

    // Check space is free
    const [space] = await conn.execute(
      "SELECT * FROM parking_space WHERE space_id = ? FOR UPDATE",
      [space_id]
    );
    if (space.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Space not found' });
    }
    if (space[0].status !== 'free') {
      await conn.rollback();
      return res.status(400).json({ message: 'Space is not available' });
    }

    // Check overlapping reservations
    const [overlap] = await conn.execute(`
      SELECT reservation_id FROM reservation
      WHERE space_id = ? AND status IN ('pending','active')
      AND NOT (end_time <= ? OR start_time >= ?)
    `, [space_id, start_time, end_time]);
    if (overlap.length > 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Time slot already reserved' });
    }

    // Calculate price
    const [lot] = await conn.execute(
      'SELECT pl.* FROM parking_lot pl JOIN parking_space ps ON pl.lot_id = ps.lot_id WHERE ps.space_id = ?',
      [space_id]
    );
    const [pricingRules] = await conn.execute(
      'SELECT * FROM pricing_rule WHERE lot_id = ? AND (user_type = ? OR user_type IS NULL) ORDER BY user_type DESC LIMIT 1',
      [lot[0].lot_id, req.user.role]
    );

    const start = new Date(start_time);
    const end = new Date(end_time);
    const hours = Math.max((end - start) / (1000 * 60 * 60), 0.5);
    let rate = pricingRules.length > 0 ? parseFloat(pricingRules[0].rate_per_hour) : 2.00;

    // Check student discount
    const [discount] = await conn.execute(
      "SELECT * FROM student_discount WHERE user_id = ? AND status = 'approved'",
      [req.user.id]
    );
    if (discount.length > 0) rate = rate * 0.5;

    // Check active subscription
    const [sub] = await conn.execute(
      "SELECT s.* FROM subscription s JOIN subscription_plan sp ON s.plan_id = sp.plan_id WHERE s.user_id = ? AND s.status = 'active' AND s.end_date >= CURDATE() AND sp.zone = ?",
      [req.user.id, lot[0].zone]
    );
    let price = sub.length > 0 ? 0 : Math.round(hours * rate * 100) / 100;

    const [result] = await conn.execute(
      'INSERT INTO reservation (user_id, space_id, start_time, end_time, price, status, created_at) VALUES (?,?,?,?,?,?,NOW())',
      [req.user.id, space_id, start_time, end_time, price, 'pending']
    );
    await conn.execute('UPDATE parking_space SET status = ? WHERE space_id = ?', ['reserved', space_id]);
    await conn.commit();
    res.status(201).json({ reservation_id: result.insertId, price, message: 'Reservation created' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

// Cancel reservation
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM reservation WHERE reservation_id = ?', [req.params.id]);
    if (rows.length === 0) { await conn.rollback(); return res.status(404).json({ message: 'Not found' }); }
    const res_ = rows[0];
    if (res_.user_id !== req.user.id && req.user.role !== 'admin') {
      await conn.rollback();
      return res.status(403).json({ message: 'Forbidden' });
    }
    await conn.execute("UPDATE reservation SET status = 'cancelled' WHERE reservation_id = ?", [req.params.id]);
    await conn.execute("UPDATE parking_space SET status = 'free' WHERE space_id = ?", [res_.space_id]);
    await conn.commit();
    res.json({ message: 'Reservation cancelled' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

// Complete reservation (mark arrived/done)
router.put('/:id/complete', authMiddleware, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM reservation WHERE reservation_id = ?', [req.params.id]);
    if (rows.length === 0) { await conn.rollback(); return res.status(404).json({ message: 'Not found' }); }
    const reservation = rows[0];
    
    // Check overstay
    const now = new Date();
    const endTime = new Date(reservation.end_time);
    let fine = null;
    if (now > endTime) {
      const minutesOverstayed = Math.ceil((now - endTime) / (1000 * 60));
      const fineAmount = Math.round(minutesOverstayed * 0.1 * 100) / 100; // €0.10/min
      const [fineResult] = await conn.execute(
        'INSERT INTO violation (reservation_id, user_id, minutes_overstayed, fine_amount, status, detected_at) VALUES (?,?,?,?,?,NOW())',
        [req.params.id, reservation.user_id, minutesOverstayed, fineAmount, 'unpaid']
      );
      fine = { minutes: minutesOverstayed, amount: fineAmount };
    }

    await conn.execute("UPDATE reservation SET status = 'completed' WHERE reservation_id = ?", [req.params.id]);
    await conn.execute("UPDATE parking_space SET status = 'free' WHERE space_id = ?", [reservation.space_id]);
    await conn.commit();
    res.json({ message: 'Reservation completed', fine });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;

