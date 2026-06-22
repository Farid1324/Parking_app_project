import React, { useState, useEffect } from 'react';
import api from '../api';

export default function MyViolations() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const load = async () => {
    try {
      const r = await api.get('/violations/my');
      setViolations(r.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const payFine = async (id) => {
    try {
      await api.put(`/violations/${id}/pay`);
      setMessage({ type: 'success', text: 'Fine paid successfully!' });
      load();
    } catch (err) { setMessage({ type: 'error', text: 'Payment failed' }); }
  };

  const totalUnpaid = violations.filter(v => v.status === 'unpaid').reduce((sum, v) => sum + parseFloat(v.fine_amount), 0);

  const statusColor = s => ({ unpaid:'#ef4444', paid:'#10b981', waived:'#6b7280', disputed:'#f59e0b' }[s] || '#6b7280');

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Fines & Violations</h1>
        <p>Overstay penalties and parking violations</p>
      </div>
      {message && <div className={`alert alert-${message.type}`} onClick={() => setMessage(null)}>{message.text} ✕</div>}

      {totalUnpaid > 0 && (
        <div className="alert alert-error">
          ⚠️ You have €{totalUnpaid.toFixed(2)} in unpaid fines. New reservations are blocked until settled.
        </div>
      )}

      {violations.length === 0 ? (
        <div className="empty-state"><p>✓ No violations on record. Keep it up!</p></div>
      ) : (
        <div className="violations-list">
          {violations.map(v => (
            <div key={v.violation_id} className="violation-item">
              <div className="violation-icon">⚠️</div>
              <div className="violation-details">
                <h3>Overstay Fine — Reservation #{v.reservation_id}</h3>
                <p>Overstayed by: <strong>{v.minutes_overstayed} minutes</strong></p>
                <p>Fine amount: <strong>€{v.fine_amount}</strong></p>
                <p>Detected: {new Date(v.detected_at).toLocaleString()}</p>
              </div>
              <div className="violation-right">
                <span className="status-badge" style={{background: statusColor(v.status)}}>{v.status}</span>
                {v.status === 'unpaid' && (
                  <button onClick={() => payFine(v.violation_id)} className="btn-danger">Pay €{v.fine_amount}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}