import React, { useState, useEffect } from 'react';
import api from '../api';

export default function StudentDiscount() {
  const [discounts, setDiscounts] = useState([]);
  const [form, setForm] = useState({ student_id_number: '', university_email: '', institution: '' });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.get('/discounts/my');
      setDiscounts(r.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/discounts', form);
      setMessage({ type: 'success', text: 'Application submitted! Awaiting admin review.' });
      setForm({ student_id_number: '', university_email: '', institution: '' });
      load();
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' }); }
  };

  const hasPending = discounts.some(d => d.status === 'pending' || d.status === 'approved');
  const statusColor = s => ({ pending:'#f59e0b', approved:'#10b981', rejected:'#ef4444', revoked:'#9ca3af' }[s] || '#6b7280');

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Student Discount</h1>
        <p>Apply for a 50% discount on parking fees with valid student ID</p>
      </div>
      {message && <div className={`alert alert-${message.type}`} onClick={() => setMessage(null)}>{message.text} ✕</div>}

      {discounts.length > 0 && (
        <div className="section">
          <h2>My Applications</h2>
          {discounts.map(d => (
            <div key={d.discount_id} className="discount-card">
              <div>
                <p>Student ID: <strong>{d.student_id_number}</strong></p>
                <p>University: <strong>{d.institution}</strong></p>
                <p>Email: {d.university_email}</p>
                <p>Applied: {new Date(d.applied_at).toLocaleDateString()}</p>
              </div>
              <span className="status-badge" style={{background: statusColor(d.status)}}>{d.status}</span>
            </div>
          ))}
        </div>
      )}

      {!hasPending && (
        <div className="section">
          <h2>Apply for Discount</h2>
          <div className="discount-info">
            <p>✓ Valid student ID required</p>
            <p>✓ 50% discount on all parking fees after approval</p>
            <p>✓ Admin review within 1-2 business days</p>
          </div>
          <form onSubmit={handleSubmit} className="form-card">
            <div className="form-group">
              <label>Student ID Number</label>
              <input
                value={form.student_id_number}
                onChange={e => setForm({...form, student_id_number: e.target.value})}
                placeholder="e.g. 76250114"
                required
              />
            </div>
            <div className="form-group">
              <label>University Email</label>
              <input
                type="email"
                value={form.university_email}
                onChange={e => setForm({...form, university_email: e.target.value})}
                placeholder="student@uni.si"
                required
              />
            </div>
            <div className="form-group">
              <label>Institution Name</label>
              <input
                value={form.institution}
                onChange={e => setForm({...form, institution: e.target.value})}
                placeholder="University of Ljubljana"
                required
              />
            </div>
            <button type="submit" className="btn-primary">Submit Application</button>
          </form>
        </div>
      )}
    </div>
  );
}
