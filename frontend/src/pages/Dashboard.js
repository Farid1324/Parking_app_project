import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentReservations, setRecentReservations] = useState([]);
  const [lots, setLots] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [lotsRes, resRes] = await Promise.all([
          api.get('/parking-lots'),
          api.get('/reservations/my')
        ]);
        setLots(lotsRes.data.slice(0, 3));
        setRecentReservations(resRes.data.slice(0, 3));
        if (isAdmin) {
          const statsRes = await api.get('/reports/summary');
          setStats(statsRes.data);
        }
      } catch (err) { console.error(err); }
    };
    load();
  }, [isAdmin]);

  const statusColor = s => ({ pending:'#f59e0b', active:'#10b981', completed:'#6b7280', cancelled:'#ef4444', expired:'#9ca3af' }[s] || '#6b7280');

  return (
    <div className="page">
      <div className="page-header">
        <h1>Welcome back, {user?.first_name}!</h1>
        <p>Manage your parking reservations and subscriptions</p>
      </div>

      {isAdmin && stats && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Total Users</div></div>
          <div className="stat-card"><div className="stat-value">{stats.totalReservations}</div><div className="stat-label">Total Reservations</div></div>
          <div className="stat-card"><div className="stat-value">{stats.activeReservations}</div><div className="stat-label">Active Now</div></div>
          <div className="stat-card"><div className="stat-value">€{parseFloat(stats.totalRevenue).toFixed(2)}</div><div className="stat-label">Total Revenue</div></div>
          <div className="stat-card alert-stat"><div className="stat-value">{stats.pendingDiscounts}</div><div className="stat-label">Pending Discounts</div></div>
          <div className="stat-card alert-stat"><div className="stat-value">{stats.unpaidFines}</div><div className="stat-label">Unpaid Fines</div></div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Available Parking Lots</h2>
            <Link to="/parking-lots" className="btn-secondary">View All</Link>
          </div>
          {lots.map(lot => (
            <Link to={`/parking-lots/${lot.lot_id}`} key={lot.lot_id} className="lot-card">
              <div className="lot-info">
                <h3>{lot.name}</h3>
                <p>{lot.location}</p>
                <span className="zone-badge">Zone {lot.zone}</span>
              </div>
              <div className="lot-availability">
                <div className="avail-num">{lot.free_spaces || 0}</div>
                <div className="avail-label">Free Spaces</div>
                <div className={`status-dot ${lot.status}`}></div>
              </div>
            </Link>
          ))}
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Reservations</h2>
            <Link to="/reservations" className="btn-secondary">View All</Link>
          </div>
          {recentReservations.length === 0 ? (
            <div className="empty-state">
              <p>No reservations yet</p>
              <Link to="/parking-lots" className="btn-primary">Reserve a Space</Link>
            </div>
          ) : recentReservations.map(r => (
            <div key={r.reservation_id} className="reservation-card">
              <div>
                <h3>{r.lot_name} - Space {r.space_number}</h3>
                <p>{new Date(r.start_time).toLocaleString()} → {new Date(r.end_time).toLocaleString()}</p>
              </div>
              <div className="res-right">
                <span className="status-badge" style={{background: statusColor(r.status)}}>{r.status}</span>
                <span className="price">€{r.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/parking-lots" className="action-card"><div className="action-icon">🅿</div><span>Find Parking</span></Link>
          <Link to="/reservations" className="action-card"><div className="action-icon">📋</div><span>My Reservations</span></Link>
          <Link to="/subscriptions" className="action-card"><div className="action-icon">🎫</div><span>Subscriptions</span></Link>
          <Link to="/violations" className="action-card"><div className="action-icon">⚠️</div><span>My Fines</span></Link>
          {(user?.role === 'student') && <Link to="/discount" className="action-card"><div className="action-icon">🎓</div><span>Student Discount</span></Link>}
          {isAdmin && <Link to="/admin" className="action-card"><div className="action-icon">⚙️</div><span>Admin Panel</span></Link>}
        </div>
      </div>
    </div>
  );
}
