import React, { useState, useEffect } from 'react';
import api from '../api';

const TABS = ['Overview', 'Users', 'Parking Lots', 'Reservations', 'Payments', 'Discounts', 'Violations', 'Pricing'];

export default function AdminPanel() {
  const [tab, setTab] = useState('Overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [newLot, setNewLot] = useState({ name:'', location:'', total_capacity:'', opening_hours:'', zone:'A', status:'active' });
  const [newPlan, setNewPlan] = useState({ name:'', price:'', duration_months:'1', zone:'', allowed_user_type:'' });
  const [newRule, setNewRule] = useState({ lot_id:'', user_type:'', rate_per_hour:'', peak_start:'', peak_end:'', peak_rate:'' });

  const load = async (t) => {
    setLoading(true);
    setMessage(null);
    try {
      const map = {
        'Overview': () => api.get('/reports/summary'),
        'Users': () => api.get('/users'),
        'Parking Lots': () => api.get('/parking-lots'),
        'Reservations': () => api.get('/reservations'),
        'Payments': () => api.get('/payments'),
        'Discounts': () => api.get('/discounts'),
        'Violations': () => api.get('/violations'),
        'Pricing': () => api.get('/pricing-rules')
      };
      const res = await map[t]();
      setData(d => ({ ...d, [t]: res.data }));
    } catch (err) { setMessage({ type: 'error', text: 'Failed to load data' }); }
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  const handleDiscountAction = async (id, status) => {
    try {
      await api.put(`/discounts/${id}`, { status });
      setMessage({ type: 'success', text: `Discount ${status}` });
      load('Discounts');
    } catch (err) { setMessage({ type: 'error', text: 'Failed' }); }
  };

  const handleUserUpdate = async (id, status, user_type) => {
    try {
      await api.put(`/users/${id}`, { status, user_type });
      setMessage({ type: 'success', text: 'User updated' });
      load('Users');
    } catch (err) { setMessage({ type: 'error', text: 'Failed' }); }
  };

  const handleCreateLot = async (e) => {
    e.preventDefault();
    try {
      await api.post('/parking-lots', { ...newLot, total_capacity: parseInt(newLot.total_capacity) });
      setMessage({ type: 'success', text: 'Parking lot created!' });
      setNewLot({ name:'', location:'', total_capacity:'', opening_hours:'', zone:'A', status:'active' });
      load('Parking Lots');
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' }); }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await api.post('/subscription-plans', { ...newPlan, price: parseFloat(newPlan.price), duration_months: parseInt(newPlan.duration_months) });
      setMessage({ type: 'success', text: 'Subscription plan created!' });
    } catch (err) { setMessage({ type: 'error', text: 'Failed' }); }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pricing-rules', { ...newRule, lot_id: parseInt(newRule.lot_id), rate_per_hour: parseFloat(newRule.rate_per_hour) });
      setMessage({ type: 'success', text: 'Pricing rule created!' });
      load('Pricing');
    } catch (err) { setMessage({ type: 'error', text: 'Failed' }); }
  };

  const handleDeleteLot = async (id) => {
    if (!window.confirm('Delete this parking lot and all its spaces?')) return;
    try {
      await api.delete(`/parking-lots/${id}`);
      setMessage({ type: 'success', text: 'Lot deleted' });
      load('Parking Lots');
    } catch (err) { setMessage({ type: 'error', text: 'Failed to delete' }); }
  };

  const d = data[tab];
  const statusColor = s => ({ pending:'#f59e0b', active:'#10b981', completed:'#6b7280', cancelled:'#ef4444', expired:'#9ca3af', approved:'#10b981', rejected:'#ef4444', unpaid:'#ef4444', paid:'#10b981' }[s] || '#6b7280');

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p>Manage all system resources</p>
      </div>
      {message && <div className={`alert alert-${message.type}`} onClick={() => setMessage(null)}>{message.text} ✕</div>}

      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab-btn ${tab === t ? 'active' : ''}`}>{t}</button>
        ))}
      </div>

      {loading ? <div className="loading">Loading...</div> : (
        <div className="admin-content">

          {tab === 'Overview' && d && (
            <div>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-value">{d.totalUsers}</div><div className="stat-label">Total Users</div></div>
                <div className="stat-card"><div className="stat-value">{d.totalReservations}</div><div className="stat-label">Reservations</div></div>
                <div className="stat-card"><div className="stat-value">{d.activeReservations}</div><div className="stat-label">Active Now</div></div>
                <div className="stat-card"><div className="stat-value">€{parseFloat(d.totalRevenue).toFixed(2)}</div><div className="stat-label">Revenue</div></div>
                <div className="stat-card alert-stat"><div className="stat-value">{d.pendingDiscounts}</div><div className="stat-label">Pending Discounts</div></div>
                <div className="stat-card alert-stat"><div className="stat-value">{d.unpaidFines}</div><div className="stat-label">Unpaid Fines</div></div>
              </div>
              <h3 style={{marginTop:24}}>Top Parking Lots</h3>
              <table className="admin-table">
                <thead><tr><th>Lot Name</th><th>Reservations</th></tr></thead>
                <tbody>{(d.topLots || []).map((l,i) => <tr key={i}><td>{l.name}</td><td>{l.reservations}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {tab === 'Users' && Array.isArray(d) && (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {d.map(u => (
                    <tr key={u.id}>
                      <td>{u.first_name} {u.last_name}</td>
                      <td>{u.email}</td>
                      <td><span className="role-badge">{u.user_type}</span></td>
                      <td><span className="status-badge" style={{background: statusColor(u.status)}}>{u.status}</span></td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <button onClick={() => handleUserUpdate(u.id, u.status === 'active' ? 'inactive' : 'active', u.user_type)} className="btn-xs">
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Parking Lots' && (
            <div>
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Location</th><th>Zone</th><th>Capacity</th><th>Free</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {Array.isArray(d) && d.map(l => (
                      <tr key={l.lot_id}>
                        <td>{l.name}</td>
                        <td>{l.location}</td>
                        <td>{l.zone}</td>
                        <td>{l.total_capacity}</td>
                        <td>{l.free_spaces || 0}</td>
                        <td><span className="status-badge" style={{background: statusColor(l.status)}}>{l.status}</span></td>
                        <td><button onClick={() => handleDeleteLot(l.lot_id)} className="btn-xs danger">Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3 style={{marginTop:24}}>Create New Parking Lot</h3>
              <form onSubmit={handleCreateLot} className="form-card inline-form">
                <div className="form-row">
                  <div className="form-group"><label>Name</label><input value={newLot.name} onChange={e=>setNewLot({...newLot,name:e.target.value})} required /></div>
                  <div className="form-group"><label>Location</label><input value={newLot.location} onChange={e=>setNewLot({...newLot,location:e.target.value})} required /></div>
                  <div className="form-group"><label>Capacity</label><input type="number" min="1" value={newLot.total_capacity} onChange={e=>setNewLot({...newLot,total_capacity:e.target.value})} required /></div>
                  <div className="form-group"><label>Zone</label>
                    <select value={newLot.zone} onChange={e=>setNewLot({...newLot,zone:e.target.value})}>
                      {['A','B','C','D'].map(z=><option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Opening Hours</label><input value={newLot.opening_hours} onChange={e=>setNewLot({...newLot,opening_hours:e.target.value})} placeholder="24/7" /></div>
                  <div className="form-group"><label>Status</label>
                    <select value={newLot.status} onChange={e=>setNewLot({...newLot,status:e.target.value})}>
                      <option value="active">Active</option><option value="inactive">Inactive</option><option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary">Create Lot & Auto-Generate Spaces</button>
              </form>
            </div>
          )}

          {tab === 'Reservations' && Array.isArray(d) && (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>ID</th><th>User</th><th>Lot</th><th>Space</th><th>Start</th><th>End</th><th>Price</th><th>Status</th></tr></thead>
                <tbody>
                  {d.map(r => (
                    <tr key={r.reservation_id}>
                      <td>#{r.reservation_id}</td>
                      <td>{r.first_name} {r.last_name}</td>
                      <td>{r.lot_name}</td>
                      <td>{r.space_number}</td>
                      <td>{new Date(r.start_time).toLocaleString()}</td>
                      <td>{new Date(r.end_time).toLocaleString()}</td>
                      <td>€{r.price}</td>
                      <td><span className="status-badge" style={{background: statusColor(r.status)}}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Payments' && Array.isArray(d) && (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>ID</th><th>User</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {d.map(p => (
                    <tr key={p.payment_id}>
                      <td>#{p.payment_id}</td>
                      <td>{p.first_name} {p.last_name}</td>
                      <td><strong>€{p.amount}</strong></td>
                      <td>{p.payment_type}</td>
                      <td><span className="status-badge" style={{background: statusColor(p.status)}}>{p.status}</span></td>
                      <td>{p.paid_at ? new Date(p.paid_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Discounts' && Array.isArray(d) && (
            <div>
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Student ID</th><th>University Email</th><th>Institution</th><th>Status</th><th>Applied</th><th>Actions</th></tr></thead>
                  <tbody>
                    {d.map(disc => (
                      <tr key={disc.discount_id}>
                        <td>{disc.first_name} {disc.last_name}</td>
                        <td>{disc.student_id_number}</td>
                        <td>{disc.university_email}</td>
                        <td>{disc.institution}</td>
                        <td><span className="status-badge" style={{background: statusColor(disc.status)}}>{disc.status}</span></td>
                        <td>{new Date(disc.applied_at).toLocaleDateString()}</td>
                        <td>
                          {disc.status === 'pending' && (
                            <>
                              <button onClick={() => handleDiscountAction(disc.discount_id, 'approved')} className="btn-xs success">Approve</button>
                              <button onClick={() => handleDiscountAction(disc.discount_id, 'rejected')} className="btn-xs danger">Reject</button>
                            </>
                          )}
                          {disc.status === 'approved' && (
                            <button onClick={() => handleDiscountAction(disc.discount_id, 'revoked')} className="btn-xs">Revoke</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Violations' && Array.isArray(d) && (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>User</th><th>Reservation</th><th>Overstay (min)</th><th>Fine</th><th>Status</th><th>Detected</th></tr></thead>
                <tbody>
                  {d.map(v => (
                    <tr key={v.id}>
                      <td>{v.first_name} {v.last_name}</td>
                      <td>#{v.reservation_id}</td>
                      <td>{v.minutes_overstayed}</td>
                      <td><strong>€{v.fine_amount}</strong></td>
                      <td><span className="status-badge" style={{background: statusColor(v.status)}}>{v.status}</span></td>
                      <td>{new Date(v.detected_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Pricing' && (
            <div>
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead><tr><th>Lot</th><th>User Type</th><th>Rate/hr</th><th>Peak Start</th><th>Peak End</th><th>Peak Rate</th></tr></thead>
                  <tbody>
                    {Array.isArray(d) && d.map(r => (
                      <tr key={r.rule_id}>
                        <td>{r.lot_name}</td>
                        <td>{r.user_type || 'All'}</td>
                        <td>€{r.rate_per_hour}</td>
                        <td>{r.peak_start || '-'}</td>
                        <td>{r.peak_end || '-'}</td>
                        <td>{r.peak_rate ? `€${r.peak_rate}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3 style={{marginTop:24}}>Add Pricing Rule</h3>
              <form onSubmit={handleCreateRule} className="form-card inline-form">
                <div className="form-row">
                  <div className="form-group"><label>Lot ID</label><input type="number" value={newRule.lot_id} onChange={e=>setNewRule({...newRule,lot_id:e.target.value})} required /></div>
                  <div className="form-group"><label>User Type</label>
                    <select value={newRule.user_type} onChange={e=>setNewRule({...newRule,user_type:e.target.value})}>
                      <option value="">All</option><option value="driver">Driver</option><option value="student">Student</option><option value="subscriber">Subscriber</option><option value="employee">Employee</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Rate/hr (€)</label><input type="number" step="0.01" value={newRule.rate_per_hour} onChange={e=>setNewRule({...newRule,rate_per_hour:e.target.value})} required /></div>
                  <div className="form-group"><label>Peak Start</label><input type="time" value={newRule.peak_start} onChange={e=>setNewRule({...newRule,peak_start:e.target.value})} /></div>
                  <div className="form-group"><label>Peak End</label><input type="time" value={newRule.peak_end} onChange={e=>setNewRule({...newRule,peak_end:e.target.value})} /></div>
                  <div className="form-group"><label>Peak Rate (€)</label><input type="number" step="0.01" value={newRule.peak_rate} onChange={e=>setNewRule({...newRule,peak_rate:e.target.value})} /></div>
                </div>
                <button type="submit" className="btn-primary">Add Rule</button>
              </form>
              <h3 style={{marginTop:24}}>Add Subscription Plan</h3>
              <form onSubmit={handleCreatePlan} className="form-card inline-form">
                <div className="form-row">
                  <div className="form-group"><label>Plan Name</label><input value={newPlan.name} onChange={e=>setNewPlan({...newPlan,name:e.target.value})} required /></div>
                  <div className="form-group"><label>Price (€)</label><input type="number" step="0.01" value={newPlan.price} onChange={e=>setNewPlan({...newPlan,price:e.target.value})} required /></div>
                  <div className="form-group"><label>Duration (months)</label><input type="number" min="1" value={newPlan.duration_months} onChange={e=>setNewPlan({...newPlan,duration_months:e.target.value})} required /></div>
                  <div className="form-group"><label>Zone</label><input value={newPlan.zone} onChange={e=>setNewPlan({...newPlan,zone:e.target.value})} required /></div>
                  <div className="form-group"><label>User Type (optional)</label>
                    <select value={newPlan.allowed_user_type} onChange={e=>setNewPlan({...newPlan,allowed_user_type:e.target.value})}>
                      <option value="">Any</option><option value="student">Student</option><option value="employee">Employee</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary">Create Plan</button>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
