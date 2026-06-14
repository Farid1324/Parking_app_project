// Shared pricing logic for reservations.
// Used by POST /api/reservations (to charge the real price) and
// GET /api/reservations/estimate (to preview the price before booking),
// so the two can never drift apart again.

const DEFAULT_RATE_PER_HOUR = 2.00;
const STUDENT_DISCOUNT_MULTIPLIER = 0.5;

async function calculatePrice(conn, user, lot, start_time, end_time) {
  const start = new Date(start_time);
  const end = new Date(end_time);
  const hours = Math.max((end - start) / (1000 * 60 * 60), 0.5);

  const [pricingRules] = await conn.execute(
    'SELECT * FROM pricing_rule WHERE lot_id = ? AND (user_type = ? OR user_type IS NULL) ORDER BY user_type DESC LIMIT 1',
    [lot.lot_id, user.role]
  );
  let rate = pricingRules.length > 0 ? parseFloat(pricingRules[0].rate_per_hour) : DEFAULT_RATE_PER_HOUR;

  // Student discount
  const [discount] = await conn.execute(
    "SELECT * FROM student_discount WHERE user_id = ? AND status = 'approved'",
    [user.id]
  );
  const hasDiscount = discount.length > 0;
  if (hasDiscount) rate = rate * STUDENT_DISCOUNT_MULTIPLIER;

  // Active subscription covering this lot's zone -> free parking
  const [sub] = await conn.execute(
    "SELECT s.* FROM subscription s JOIN subscription_plan sp ON s.plan_id = sp.plan_id WHERE s.user_id = ? AND s.status = 'active' AND s.end_date >= CURDATE() AND sp.zone = ?",
    [user.id, lot.zone]
  );
  const hasActiveSubscription = sub.length > 0;

  const price = hasActiveSubscription ? 0 : Math.round(hours * rate * 100) / 100;

  return { price, hours, rate, hasDiscount, hasActiveSubscription };
}

module.exports = { calculatePrice, DEFAULT_RATE_PER_HOUR };
