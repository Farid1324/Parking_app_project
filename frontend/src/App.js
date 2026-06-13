import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ParkingLots from './pages/ParkingLots';
import LotDetail from './pages/LotDetail';
import MyReservations from './pages/MyReservations';
import MySubscriptions from './pages/MySubscriptions';
import StudentDiscount from './pages/StudentDiscount';
import MyViolations from './pages/MyViolations';
import AdminPanel from './pages/AdminPanel';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/" />;
  return children;
};

function AppContent() {
  const { user } = useAuth();
  return (
    <div className="app">
      {user && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/parking-lots" element={<PrivateRoute><ParkingLots /></PrivateRoute>} />
          <Route path="/parking-lots/:id" element={<PrivateRoute><LotDetail /></PrivateRoute>} />
          <Route path="/reservations" element={<PrivateRoute><MyReservations /></PrivateRoute>} />
          <Route path="/subscriptions" element={<PrivateRoute><MySubscriptions /></PrivateRoute>} />
          <Route path="/discount" element={<PrivateRoute><StudentDiscount /></PrivateRoute>} />
          <Route path="/violations" element={<PrivateRoute><MyViolations /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
