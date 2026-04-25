import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { Ship, ArrowLeft, Users, Shield, Mail, Calendar, Search, RefreshCw } from 'lucide-react';

const ADMIN_EMAIL = 'aloksrius@yahoo.com';

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" style={{ verticalAlign: 'middle' }}>
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.77-2.7.77-2.07 0-3.83-1.4-4.46-3.28H1.85v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.52 10.54A4.8 4.8 0 0 1 4.27 9c0-.53.09-1.05.25-1.54V5.39H1.85A8 8 0 0 0 .98 9c0 1.29.31 2.51.87 3.61l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 3.58c1.16 0 2.2.4 3.02 1.19l2.26-2.26A8 8 0 0 0 1.85 5.39l2.67 2.07C5.15 5 6.9 3.58 8.98 3.58z"/>
    </svg>
  );
}

export default function UsersPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Redirect non-admins
  useEffect(() => {
    if (currentUser?.email !== ADMIN_EMAIL) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('firstLogin', 'desc'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // Try without orderBy if index not ready
      try {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { toast.error('Could not load users'); }
    } finally { setLoading(false); }
  }

  function formatDate(ts) {
    if (!ts) return 'N/A';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const googleUsers = users.filter(u => u.provider === 'google').length;
  const emailUsers = users.filter(u => u.provider === 'email').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <header style={{
        background: 'var(--navy)', borderBottom: '3px solid var(--gold)',
        padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', gap: 16
      }}>
        <button className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.6)' }} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 32, height: 32, background: 'var(--gold)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ship size={18} color="#0f1923" />
          </div>
          <div>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 16, fontWeight: 700, color: 'white' }}>GEOSERVE</div>
            <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase' }}>User Management</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 20, padding: '4px 12px' }}>
          <Shield size={13} color="var(--gold)" />
          <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>Admin</span>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 32px' }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Users size={28} color="var(--gold)" />
            <h1 style={{ fontSize: 30 }}>Registered Users</h1>
          </div>
          <p style={{ color: 'var(--mid)', fontSize: 15 }}>All users who have signed up to GEOSERVE CP Review.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 36 }}>
          {[
            { label: 'Total Users', value: users.length, color: 'var(--gold)', icon: Users },
            { label: 'Google Sign-In', value: googleUsers, color: '#4285F4', icon: Users },
            { label: 'Email Sign-Up', value: emailUsers, color: 'var(--blue)', icon: Mail },
            { label: 'Today', value: users.filter(u => {
              if (!u.firstLogin?.toDate) return false;
              const today = new Date();
              const d = u.firstLogin.toDate();
              return d.toDateString() === today.toDateString();
            }).length, color: 'var(--green)', icon: Calendar }
          ].map(s => (
            <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <s.icon size={22} color={s.color} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Playfair Display', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--mid)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Refresh */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)' }} />
            <input className="form-input" style={{ paddingLeft: 42 }} placeholder="Search by name or email…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadUsers}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Users table */}
        {loading ? (
          <div className="flex-center" style={{ height: 200 }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', border: '2px dashed var(--border)', borderRadius: 12 }}>
            <Users size={48} color="var(--border)" style={{ marginBottom: 16 }} />
            <p style={{ color: 'var(--mid)' }}>No users found</p>
          </div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
              padding: '12px 20px', background: 'var(--navy)',
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
              letterSpacing: 1, textTransform: 'uppercase'
            }}>
              <div>Name</div>
              <div>Email</div>
              <div>Sign-in</div>
              <div>Joined</div>
              <div>Last Active</div>
            </div>

            {/* Table rows */}
            {filtered.map((user, i) => (
              <div key={user.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)'
              }}>
                {/* Name + Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'var(--gold)'
                    }}>
                      {(user.name || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name || '—'}</div>
                    {user.email === ADMIN_EMAIL && (
                      <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: 0.5 }}>ADMIN</span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div style={{ fontSize: 13, color: 'var(--mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>

                {/* Provider */}
                <div>
                  {user.provider === 'google' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4285F4', background: '#f0f7ff', padding: '3px 8px', borderRadius: 10, border: '1px solid #aed6f1' }}>
                      <GoogleIcon /> Google
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--blue)', background: 'var(--blue-light)', padding: '3px 8px', borderRadius: 10, border: '1px solid #aed6f1' }}>
                      Email
                    </span>
                  )}
                </div>

                {/* First Login */}
                <div style={{ fontSize: 12, color: 'var(--mid)' }}>{formatDate(user.firstLogin)}</div>

                {/* Last Login */}
                <div style={{ fontSize: 12, color: 'var(--mid)' }}>{formatDate(user.lastLogin)}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
