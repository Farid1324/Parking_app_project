import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">🅿 SmartPark</Link>
      </div>
      <div className="navbar-links">
        <Link to="/" className={isActive('/')}>Dashboard</Link>
        <Link to="/parking-lots" className={isActive('/parking-lots')}>Parking Lots</Link>
        <Link to="/reservations" className={isActive('/reservations')}>My Reservations</Link>
        <Link to="/subscriptions" className={isActive('/subscriptions')}>Subscriptions</Link>
        {(user?.role === 'student' || user?.role === 'driver') && (
          <Link to="/discount" className={isActive('/discount')}>Student Discount</Link>
        )}
        <Link to="/violations" className={isActive('/violations')}>Fines</Link>
        {isAdmin && <Link to="/admin" className={isActive('/admin')}>Admin Panel</Link>}
      </div>
      <div className="navbar-user">
        <span className="user-badge">{user?.role}</span>
        <span className="user-name">{user?.first_name} {user?.last_name}</span>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
}
