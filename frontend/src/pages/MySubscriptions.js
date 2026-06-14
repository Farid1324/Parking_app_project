import React, { useState, useEffect } from 'react';
import api from '../api';

function PaymentModal({ plan, onClose, onConfirm }) {
  const [method, setMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    if (method === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) return alert('Enter a valid card number');
      if (expiry.length < 5) return alert('Enter expiry MM/YY');
      if (cvv.length < 3) return alert('Enter CVV');
    }
    setPaying(true);
    await onConfirm();
    setPaying(false);
  };

  const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'white',borderRadius:16,padding:28,width:380,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontSize:18,fontWeight:700,margin:0}}>Complete Payment</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#9ca3af'}}>✕</button>
        </div>

        <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'12px 16px',marginBottom:20}}>
          <div style={{fontSize:13,color:'#15803d',fontWeight:500}}>{plan.name}</div>
          <div style={{fontSize:24,fontWeight:700,color:'#166534'}}>€{plan.price}
            <span style={{fontSize:13,fontWeight:400,color:'#16a34a'}}>/{plan.duration_months === 1 ? 'month' : `${plan.duration_months} months`}</span>
          </div>
          <div style={{fontSize:12,color:'#15803d'}}>Zone: {plan.zone}</div>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:20}}>
          {['card','paypal','bank'].map(m => (
            <button key={m} onClick={() => setMethod(m)} style={{
              flex:1,padding:'8px 4px',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer',
              border: method === m ? '2px solid #3b82f6' : '1.5px solid #e5e7eb',
              background: method === m ? '#eff6ff' : 'white',
              color: method === m ? '#1d4ed8' : '#6b7280'
            }}>
              {m === 'card' ? '💳 Card' : m === 'paypal' ? '🅿️ PayPal' : '🏦 Bank'}
            </button>
          ))}
        </div>

        {method === 'card' && (
          <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20}}>
            <div>
              <label style={{fontSize:12,color:'#6b7280',display:'block',marginBottom:4}}>Card number</label>
              <input value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))}
                placeholder="1234 5678 9012 3456" maxLength={19}
                style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:14,boxSizing:'border-box'}}/>
            </div>
            <div style={{display:'flex',gap:12}}>
              <div style={{flex:1}}>
                <label style={{fontSize:12,color:'#6b7280',display:'block',marginBottom:4}}>Expiry</label>
                <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY" maxLength={5}
                  style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:14,boxSizing:'border-box'}}/>
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:12,color:'#6b7280',display:'block',marginBottom:4}}>CVV</label>
                <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,'').slice(0,3))}
                  placeholder="123" maxLength={3} type="password"
                  style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:14,boxSizing:'border-box'}}/>
              </div>
            </div>
          </div>
        )}

        {method === 'paypal' && (
          <div style={{textAlign:'center',padding:'20px 0 28px',color:'#6b7280',fontSize:14}}>
            You'll be redirected to PayPal to complete payment.
          </div>
        )}

        {method === 'bank' && (
          <div style={{background:'#f9fafb',borderRadius:8,padding:14,marginBottom:20,fontSize:13,color:'#374151'}}>
            <div style={{marginBottom:4}}><strong>IBAN:</strong> SI56 0110 0600 0001 234</div>
            <div style={{marginBottom:4}}><strong>Reference:</strong> {plan.plan_id}-SUB</div>
            <div style={{color:'#9ca3af'}}>Payment may take 1–2 business days.</div>
          </div>
        )}

        <button onClick={handlePay} disabled={paying} style={{
          width:'100%',padding:'12px',background:'#3b82f6',color:'white',border:'none',
          borderRadius:10,fontSize:15,fontWeight:600,cursor:paying?'not-allowed':'pointer',
          opacity:paying?0.7:1
        }}>
          {paying ? 'Processing...' : `Pay €${plan.price}`}
        </button>
      </div>
    </div>
  );
}

export default function MySubscriptions() {
  const [plans, setPlans] = useState([]);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

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

  const confirmSubscribe = async () => {
    try {
      await api.post('/subscriptions', { plan_id: selectedPlan.plan_id });
      setMessage({ type: 'success', text: 'Subscription activated!' });
      setSelectedPlan(null);
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
      setSelectedPlan(null);
    }
  };

  const cancelSubscription = async (subId) => {
    if (!window.confirm('Cancel this subscription?')) return;
    try {
      await api.put(`/subscriptions/${subId}/cancel`);
      setMessage({ type: 'success', text: 'Subscription cancelled.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to cancel' });
    }
  };

  const hasActiveSub = (zone) => mySubscriptions.some(s => s.zone === zone && s.status === 'active' && new Date(s.end_date) > new Date());

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>;

  return (
    <div className="page">
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onConfirm={confirmSubscribe}
        />
      )}

      <div className="page-header">
        <h1>Subscriptions</h1>
        <p>Monthly and annual parking plans for frequent users</p>
      </div>
      {message && <div className={`alert alert-${message.type}`} onClick={() => setMessage(null)}>{message.text} ✕</div>}

      {mySubscriptions.length > 0 && (
        <div className="section">
          <h2>My Subscriptions</h2>
          <div className="subs-grid">
            {mySubscriptions.map(sub => (
              <div key={sub.subscription_id} className={`sub-card ${sub.status}`}>
                <h3>{sub.plan_name}</h3>
                <p>Zone: <strong>{sub.zone}</strong></p>
                <p>Valid: {sub.start_date?.split('T')[0]} — {sub.end_date?.split('T')[0]}</p>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
                  <span className={`status-badge ${sub.status}`}>{sub.status}</span>
                  {sub.status === 'active' && (
                    <button onClick={() => cancelSubscription(sub.subscription_id)}
                      style={{background:'none',border:'1px solid #ef4444',color:'#ef4444',borderRadius:6,padding:'4px 10px',fontSize:12,cursor:'pointer'}}>
                      Cancel
                    </button>
                  )}
                </div>
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
                onClick={() => setSelectedPlan(plan)}
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

