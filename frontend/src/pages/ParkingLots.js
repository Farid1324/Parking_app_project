import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function ParkingLots() {
  const [lots, setLots] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/parking-lots').then(r => { setLots(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = lots.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.location.toLowerCase().includes(search.toLowerCase()) ||
    l.zone.toLowerCase().includes(search.toLowerCase())
  );

  const occupancyPct = lot => {
    const total = lot.total_spaces || lot.total_capacity;
    if (!total) return 0;
    return Math.round(((total - (lot.free_spaces || 0)) / total) * 100);
  };

  if (loading) return <div className="page"><div className="loading">Loading parking lots...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Parking Lots</h1>
        <p>Real-time availability across all locations</p>
      </div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name, location, or zone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="lots-grid">
        {filtered.map(lot => (
          <Link to={`/parking-lots/${lot.lot_id}`} key={lot.lot_id} className="lot-detail-card">
            <div className="lot-header">
              <h2>{lot.name}</h2>
              <span className={`status-badge ${lot.status}`}>{lot.status}</span>
            </div>
            <p className="lot-location">📍 {lot.location}</p>
            <div className="lot-meta">
              <span className="zone-badge">Zone {lot.zone}</span>
              {lot.opening_hours && <span>🕐 {lot.opening_hours}</span>}
            </div>
            <div className="availability-bar">
              <div className="avail-row">
                <span>Free: <strong className="green">{lot.free_spaces || 0}</strong></span>
                <span>Reserved: <strong className="yellow">{lot.reserved_spaces || 0}</strong></span>
                <span>Occupied: <strong className="red">{lot.occupied_spaces || 0}</strong></span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${occupancyPct(lot)}%`}}></div>
              </div>
              <div className="progress-label">{occupancyPct(lot)}% occupied</div>
            </div>
            <div className="lot-action">
              <span className="btn-primary">View & Reserve →</span>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty-state"><p>No parking lots found</p></div>}
    </div>
  );
}
