import React, { useState, useEffect } from 'react';
import api from '../api';

export default function MyReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const load = async () => {
    try {
      const r = await api.get('/reservations/my');
      setReservations(r.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return;
    try {
      await api.put(`/reservations/${id}/cancel`);
      setMessage({ type: 'success', text: 'Reservation cancelled' });
      load();
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' }); }
  };

  const complete = async (id) => {
    try {
      const res = await api.put(`/reservations/${id}/complete`);
      if (res.data.fine) {
        setMessage({ type: 'error', text: `Completed with overstay fine: €${res.data.fine.amount} (${res.data.fine.minutes} min)` });
      } else {
        setMessage({ type: 'success', text: 'Reservation completed successfully!' });
      }
      load();
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' }); }
  };

  const pay = async (id, price) => {
    try {
      await api.post('/payments', { reservation_id: id, amount: price, payment_type: 'reservation' });
      setMessage({ type: 'success', text: 'Payment successful!' });
      load();
    } catch (err) { setMessage({ type: 'error', text: 'Payment failed' }); }
  };

  const statusColor = s => ({ pending:'#f59e0b', active:'#10b981', completed:'#6b7280', cancelled:'#ef4444', expired:'#9ca3af' }[s] || '#6b7280');

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Reservations</h1>
        <p>Track and manage your parking reservations</p>
      </div>
      {message && <div className={`alert alert-${message.type}`} onClick={() => setMessage(null)}>{message.text} ✕</div>}
      {reservations.length === 0 ? (
        <div className="empty-state"><p>No reservations found. <a href="/parking-lots">Reserve a space</a></p></div>
      ) : (
        <div className="reservations-list">
          {reservations.map(r => (
            <div key={r.reservation_id} className="reservation-item">
              <div className="res-header">
                <h3>#{r.reservation_id} — {r.lot_name}</h3>
                <span className="status-badge" style={{background: statusColor(r.status)}}>{r.status}</span>
              </div>
              <div className="res-body">
                <div className="res-info">
                  <p>🅿 Space: <strong>{r.space_number}</strong></p>
                  <p>📍 {r.lot_location}</p>
                  <p>🕐 {new Date(r.start_time).toLocaleString()} → {new Date(r.end_time).toLocaleString()}</p>
                  <p>💰 Price: <strong>€{r.price}</strong></p>
                </div>
                <div className="res-actions">
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => pay(r.reservation_id, r.price)} className="btn-success">Pay €{r.price}</button>
                      <button onClick={() => cancel(r.reservation_id)} className="btn-danger">Cancel</button>
                    </>
                  )}
                  {r.status === 'active' && (
                    <>
                      <button onClick={() => complete(r.reservation_id)} className="btn-success">Mark Complete</button>
                      <button onClick={() => cancel(r.reservation_id)} className="btn-danger">Cancel</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
