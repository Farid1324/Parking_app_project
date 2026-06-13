import React, { useState, useEffect } from 'react';
import api from '../api';

export default function MySubscriptions() {
  const [plans, setPlans] = useState([]);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const load = async () => {
    try {
      const [plansRes, subsRes] = await Promise.all([
        api.get('/subscription-plans'),
        api.get('/subscriptions/my')
      ]);
      setPlans(plansRes.data);
      setMySubscriptions(subsRes.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const subscribe = async (planId) => {
    try {
      await api.post('/subscriptions', { plan_id: planId });
      setMessage({ type: 'success', text: 'Subscription activated!' });
      load();
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' }); }
  };

  const hasActiveSub = (zone) => mySubscriptions.some(s => s.zone === zone && s.status === 'active' && new Date(s.end_date) > new Date());

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Subscriptions</h1>
        <p>Monthly and annual parking plans for frequent users</p>
      </div>
      {message && <div className={`alert alert-${message.type}`} onClick={() => setMessage(null)}>{message.text} ✕</div>}

      {mySubscriptions.length > 0 && (
        <div className="section">
          <h2>My Active Subscriptions</h2>
          <div className="subs-grid">
            {mySubscriptions.map(sub => (
              <div key={sub.subscription_id} className={`sub-card ${sub.status}`}>
                <h3>{sub.plan_name}</h3>
                <p>Zone: <strong>{sub.zone}</strong></p>
                <p>Valid: {sub.start_date?.split('T')[0]} — {sub.end_date?.split('T')[0]}</p>
                <span className={`status-badge ${sub.status}`}>{sub.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <h2>Available Plans</h2>
        <div className="plans-grid">
          {plans.map(plan => (
            <div key={plan.plan_id} className="plan-card">
              <h3>{plan.name}</h3>
              <div className="plan-price">€{plan.price}<span>/{plan.duration_months === 1 ? 'month' : `${plan.duration_months} months`}</span></div>
              <p>Zone: <strong>{plan.zone}</strong></p>
              {plan.allowed_user_type && <p className="plan-note">For {plan.allowed_user_type}s only</p>}
              <button
                onClick={() => subscribe(plan.plan_id)}
                className="btn-primary full-width"
                disabled={hasActiveSub(plan.zone)}
              >
                {hasActiveSub(plan.zone) ? 'Already Subscribed' : 'Subscribe Now'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
