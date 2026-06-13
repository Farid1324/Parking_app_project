import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function LotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lot, setLot] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [form, setForm] = useState({ start_time: '', end_time: '' });
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get(`/parking-lots/${id}`).then(r => { setLot(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (!form.start_time || !form.end_time) return;
    const start = new Date(form.start_time);
    const end = new Date(form.end_time);
    if (end <= start) return;
    const hours = Math.max((end - start) / (1000 * 60 * 60), 0.5);
    setEstimatedPrice((hours * 2.00).toFixed(2));
  }, [form]);

  const handleReserve = async (e) => {
    e.preventDefault();
    if (!selectedSpace) { setMessage({ type: 'error', text: 'Please select a parking space' }); return; }
    setReserving(true);
    setMessage(null);
    try {
      const res = await api.post('/reservations', {
        space_id: selectedSpace.space_id,
        start_time: form.start_time,
        end_time: form.end_time
      });
      setMessage({ type: 'success', text: `Reservation created! Price: €${res.data.price}. Redirecting...` });
      setTimeout(() => navigate('/reservations'), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Reservation failed' });
    }
    setReserving(false);
  };

  const spaceColor = s => ({ free:'#10b981', occupied:'#ef4444', reserved:'#f59e0b', unavailable:'#9ca3af', maintenance:'#6b7280' }[s] || '#9ca3af');

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;
  if (!lot) return <div className="page"><div className="alert alert-error">Lot not found</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => navigate('/parking-lots')} className="btn-back">← Back</button>
        <h1>{lot.name}</h1>
        <p>📍 {lot.location} — Zone {lot.zone}</p>
      </div>

      <div className="lot-detail-layout">
        <div className="spaces-section">
          <h2>Parking Spaces</h2>
          <div className="legend">
            {['free','reserved','occupied','maintenance'].map(s => (
              <span key={s} className="legend-item">
                <span className="legend-dot" style={{background: spaceColor(s)}}></span>{s}
              </span>
            ))}
          </div>
          <div className="spaces-grid">
            {(lot.spaces || []).map(space => (
              <div
                key={space.space_id}
                className={`space-cell ${space.status} ${selectedSpace?.space_id === space.space_id ? 'selected' : ''}`}
                style={{borderColor: spaceColor(space.status)}}
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
                onChange={e => setForm({...form, start_time: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input
                type="datetime-local"
                value={form.end_time}
                min={form.start_time || getMinDateTime()}
                onChange={e => setForm({...form, end_time: e.target.value})}
                required
              />
            </div>
            {estimatedPrice && (
              <div className="price-estimate">
                <span>Estimated Price:</span>
                <strong>€{estimatedPrice}</strong>
                <small>(discounts/subscriptions applied at checkout)</small>
              </div>
            )}
            <button type="submit" className="btn-primary full-width" disabled={reserving || !selectedSpace}>
              {reserving ? 'Reserving...' : selectedSpace ? `Reserve ${selectedSpace.space_number}` : 'Select a Space First'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

