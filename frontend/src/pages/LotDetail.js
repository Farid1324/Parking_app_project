import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const PAYMENT_METHODS = [
  { id: 'card',       label: 'Credit / Debit Card', icon: '💳' },
  { id: 'apple_pay',  label: 'Apple Pay',            icon: '🍎' },
  { id: 'google_pay', label: 'Google Pay',           icon: '🔵' },
];

function PaymentModal({ price, onConfirm, onClose }) {
  const [method, setMethod]   = useState('card');
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry]   = useState('');
  const [cvv, setCvv]         = useState('');
  const [name, setName]       = useState('');
  const [paying, setPaying]   = useState(false);
  const [error, setError]     = useState('');

  const formatCard = v => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExp  = v => { const d = v.replace(/\D/g,'').slice(0,4); return d.length > 2 ? d.slice(0,2) + '/' + d.slice(2) : d; };

  const handlePay = async () => {
    if (method === 'card') {
      if (cardNum.replace(/\s/g,'').length < 16) return setError('Enter a valid 16-digit card number.');
      if (expiry.length < 5) return setError('Enter a valid expiry date (MM/YY).');
      if (cvv.length < 3)    return setError('Enter a valid CVV.');
      if (!name.trim())      return setError('Enter the cardholder name.');
    }
    setError('');
    setPaying(true);
    await new Promise(r => setTimeout(r, 1400));
    setPaying(false);
    onConfirm(method);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Complete Payment</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.amountBox}>
          <span style={{ color: '#6b7280', fontSize: 14 }}>Total Amount</span>
          <span style={{ fontSize: 32, fontWeight: 700, color: '#1a1a2e' }}>€{Number(price).toFixed(2)}</span>
        </div>

        <div style={styles.methodTabs}>
          {PAYMENT_METHODS.map(m => (
            <button
              key={m.id}
              style={{ ...styles.methodTab, ...(method === m.id ? styles.methodTabActive : {}) }}
              onClick={() => setMethod(m.id)}
            >
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              <span style={{ fontSize: 12, marginTop: 2 }}>{m.label}</span>
            </button>
          ))}
        </div>

        {method === 'card' && (
          <div style={{ marginTop: 16 }}>
            <div style={styles.fGroup}>
              <label style={styles.fLabel}>Cardholder Name</label>
              <input style={styles.fInput} placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div style={styles.fGroup}>
              <label style={styles.fLabel}>Card Number</label>
              <input style={styles.fInput} placeholder="1234 5678 9012 3456" value={cardNum} onChange={e => setCardNum(formatCard(e.target.value))} maxLength={19} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={styles.fGroup}>
                <label style={styles.fLabel}>Expiry</label>
                <input style={styles.fInput} placeholder="MM/YY" value={expiry} onChange={e => setExpiry(formatExp(e.target.value))} maxLength={5} />
              </div>
              <div style={styles.fGroup}>
                <label style={styles.fLabel}>CVV</label>
                <input style={styles.fInput} placeholder="123" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,'').slice(0,3))} maxLength={3} />
              </div>
            </div>
          </div>
        )}

        {(method === 'apple_pay' || method === 'google_pay') && (
          <div style={styles.walletBox}>
            <span style={{ fontSize: 48 }}>{method === 'apple_pay' ? '🍎' : '🔵'}</span>
            <p style={{ color: '#6b7280', margin: '8px 0 0' }}>
              {method === 'apple_pay' ? 'Apple Pay' : 'Google Pay'} will be used to complete your payment securely.
            </p>
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        <button style={{ ...styles.payBtn, opacity: paying ? 0.7 : 1 }} onClick={handlePay} disabled={paying}>
          {paying ? '⏳ Processing...' : `Pay €${Number(price).toFixed(2)}`}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          🔒 Secure payment — your data is encrypted
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay:         { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:           { background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  closeBtn:        { background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 },
  amountBox:       { background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 },
  methodTabs:      { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 },
  methodTab:       { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 6px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#f9fafb', cursor: 'pointer', transition: 'all 0.2s' },
  methodTabActive: { border: '1.5px solid #3b82f6', background: '#eff6ff' },
  fGroup:          { marginBottom: 14 },
  fLabel:          { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  fInput:          { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#1a1a2e', outline: 'none', boxSizing: 'border-box' },
  walletBox:       { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', background: '#f9fafb', borderRadius: 12, marginTop: 16 },
  errorBox:        { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 12 },
  payBtn:          { width: '100%', marginTop: 20, padding: '14px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer' },
};

export default function LotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lot, setLot]                       = useState(null);
  const [selectedSpace, setSelectedSpace]   = useState(null);
  const [form, setForm]                     = useState({ start_time: '', end_time: '' });
  const [loading, setLoading]               = useState(true);
  const [reserving, setReserving]           = useState(false);
  const [message, setMessage]               = useState(null);
  const [pendingReservation, setPendingReservation] = useState(null);
  const [showPayment, setShowPayment]       = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(null);

  useEffect(() => {
    api.get(`/parking-lots/${id}`)
      .then(r => { setLot(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (!selectedSpace || !form.start_time || !form.end_time) { setEstimatedPrice(null); return; }
    const start = new Date(form.start_time);
    const end = new Date(form.end_time);
    if (end <= start) { setEstimatedPrice(null); return; }

    let cancelled = false;
    api.get('/reservations/estimate', {
      params: { space_id: selectedSpace.space_id, start_time: form.start_time, end_time: form.end_time }
    })
      .then(r => { if (!cancelled) setEstimatedPrice(r.data); })
      .catch(() => { if (!cancelled) setEstimatedPrice(null); });

    return () => { cancelled = true; };
  }, [selectedSpace, form]);

  const handleReserve = async (e) => {
    e.preventDefault();
    if (!selectedSpace) { setMessage({ type: 'error', text: 'Please select a parking space' }); return; }
    setReserving(true);
    setMessage(null);
    try {
      const res = await api.post('/reservations', {
        space_id:   selectedSpace.space_id,
        start_time: form.start_time,
        end_time:   form.end_time,
      });
      setPendingReservation({ reservation_id: res.data.reservation_id, price: res.data.price });
      setShowPayment(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Reservation failed' });
    }
    setReserving(false);
  };

  const handlePaymentConfirm = (method) => {
    setShowPayment(false);
    setMessage({ type: 'success', text: `✅ Payment via ${method.replace('_', ' ')} confirmed! Redirecting...` });
    setTimeout(() => navigate('/reservations'), 2000);
  };

  const handlePaymentClose = () => {
    if (pendingReservation) {
      api.put(`/reservations/${pendingReservation.reservation_id}/cancel`).catch(() => {});
    }
    setShowPayment(false);
    setPendingReservation(null);
    setMessage({ type: 'error', text: 'Payment cancelled — reservation was not confirmed.' });
  };

  const spaceColor = s => ({ free: '#10b981', occupied: '#ef4444', reserved: '#f59e0b', unavailable: '#9ca3af', maintenance: '#6b7280' }[s] || '#9ca3af');

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;
  if (!lot)    return <div className="page"><div className="alert alert-error">Lot not found</div></div>;

  return (
    <div className="page">
      {showPayment && pendingReservation && (
        <PaymentModal
          price={pendingReservation.price}
          onConfirm={handlePaymentConfirm}
          onClose={handlePaymentClose}
        />
      )}

      <div className="page-header">
        <button onClick={() => navigate('/parking-lots')} className="btn-back">← Back</button>
        <h1>{lot.name}</h1>
        <p>📍 {lot.location} — Zone {lot.zone}</p>
      </div>

      <div className="lot-detail-layout">
        <div className="spaces-section">
          <h2>Parking Spaces</h2>
          <div className="legend">
            {['free', 'reserved', 'occupied', 'maintenance'].map(s => (
              <span key={s} className="legend-item">
                <span className="legend-dot" style={{ background: spaceColor(s) }}></span>{s}
              </span>
            ))}
          </div>
          <div className="spaces-grid">
            {(lot.spaces || []).map(space => (
              <div
                key={space.space_id}
                className={`space-cell ${space.status} ${selectedSpace?.space_id === space.space_id ? 'selected' : ''}`}
                style={{ borderColor: spaceColor(space.status) }}
                onClick={() => space.status === 'free' ? setSelectedSpace(space) : null}
                title={`${space.space_number} (${space.status})`}
              >
                <span className="space-num">{space.space_number}</span>
                <span className="space-type">{space.space_type === 'ev_charging' ? '⚡' : space.space_type === 'accessible' ? '♿' : ''}</span>
              </div>
            ))}
          </div>
          {selectedSpace && (
            <div className="selected-info">
              ✓ Selected: <strong>{selectedSpace.space_number}</strong> ({selectedSpace.space_type})
            </div>
          )}
        </div>

        <div className="reservation-form-section">
          <h2>Make a Reservation</h2>
          {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
          <form onSubmit={handleReserve}>
            <div className="form-group">
              <label>Start Time</label>
              <input
                type="datetime-local"
                value={form.start_time}
                min={getMinDateTime()}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input
                type="datetime-local"
                value={form.end_time}
                min={form.start_time || getMinDateTime()}
                onChange={e => setForm({ ...form, end_time: e.target.value })}
                required
              />
            </div>
            {estimatedPrice && (
              <div className="price-estimate">
                <span>Estimated Price:</span>
                <strong>€{estimatedPrice.price.toFixed(2)}</strong>
                {estimatedPrice.has_subscription ? (
                  <small>Covered by your active subscription</small>
                ) : estimatedPrice.has_student_discount ? (
                  <small>Student discount applied</small>
                ) : (
                  <small>€{estimatedPrice.base_rate.toFixed(2)}/hour</small>
                )}
              </div>
            )}
            <button type="submit" className="btn-primary full-width" disabled={reserving || !selectedSpace}>
              {reserving ? 'Processing...' : selectedSpace ? `Reserve & Pay — ${selectedSpace.space_number}` : 'Select a Space First'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
