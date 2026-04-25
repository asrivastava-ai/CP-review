import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Ship, Plus, FileText, Clock, Trash2, ChevronRight,
  LogOut, User, AlertTriangle, CheckCircle, Info, BookOpen, Users, Shield
} from 'lucide-react';

const ADMIN_EMAIL = 'aloksrius@yahoo.com';
const RISK_ICONS = { high: AlertTriangle, medium: AlertTriangle, low: CheckCircle, info: Info };
const RISK_COLORS = { high: 'var(--accent)', medium: 'var(--amber)', low: 'var(--green)', info: 'var(--blue)' };

export default function DashboardPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const q = query(
          collection(db, 'reviews'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
        toast.error('Could not load reviews');
      } finally { setLoading(false); }
    }
    fetchReviews();
  }, [currentUser]);

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm('Delete this review?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
      setReviews(p => p.filter(r => r.id !== id));
      toast.success('Review deleted');
    } catch { toast.error('Delete failed'); }
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function riskSummary(comments = []) {
    const counts = { high: 0, medium: 0, low: 0, info: 0 };
    comments.forEach(c => { if (counts[c.risk] !== undefined) counts[c.risk]++; });
    return counts;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--navy)', borderBottom: '3px solid var(--gold)',
        padding: '0 40px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--gold)', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Ship size={20} color="#0f1923" />
          </div>
          <div>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 17, fontWeight: 900, color: 'white' }}>GEOSERVE</div>
            <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginTop: -2 }}>CP Review</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Admin links */}
          {currentUser.email === ADMIN_EMAIL && (
            <>
              <button className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)' }}
                onClick={() => navigate('/users')}>
                <Users size={15} /> Users
              </button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)' }}
                onClick={() => navigate('/knowledge')}>
                <BookOpen size={15} /> Knowledge
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 20, padding: '3px 10px' }}>
                <Shield size={11} color="var(--gold)" />
                <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>Admin</span>
              </div>
            </>
          )}
          {/* User avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(201,168,76,0.4)' }} />
            ) : (
              <div style={{ width: 32, height: 32, background: 'rgba(201,168,76,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} color="var(--gold)" />
              </div>
            )}
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
              {currentUser.displayName || currentUser.email}
            </span>
          </div>
          <button className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.6)' }} onClick={handleLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px' }}>
        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 30, marginBottom: 4 }}>CP Reviews</h1>
            <p style={{ color: 'var(--mid)', fontSize: 14 }}>
              {reviews.length} review{reviews.length !== 1 ? 's' : ''} in your workspace
            </p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/new-review')}>
            <Plus size={18} /> New Review
          </button>
        </div>

        {/* Reviews grid */}
        {loading ? (
          <div className="flex-center" style={{ height: 300 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ width: 36, height: 36, marginBottom: 16 }} />
              <p style={{ color: 'var(--mid)' }}>Loading reviews…</p>
            </div>
          </div>
        ) : reviews.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 40px',
            border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)'
          }}>
            <FileText size={48} color="var(--border)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontFamily: 'Playfair Display', fontSize: 22, marginBottom: 8 }}>No reviews yet</h3>
            <p style={{ color: 'var(--mid)', marginBottom: 24 }}>Upload your first charterparty to get started</p>
            <button className="btn btn-primary" onClick={() => navigate('/new-review')}>
              <Plus size={16} /> Start First Review
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {reviews.map(review => {
              const counts = riskSummary(review.comments || []);
              return (
                <div key={review.id} className="card" style={{
                  cursor: 'pointer', transition: 'all 0.18s', position: 'relative'
                }}
                  onClick={() => navigate(`/review/${review.id}`)}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{
                      background: review.charterType === 'period' ? 'var(--navy)' : 'var(--blue-light)',
                      color: review.charterType === 'period' ? 'white' : 'var(--blue)',
                      fontSize: 11, fontWeight: 700, letterSpacing: 1,
                      textTransform: 'uppercase', padding: '3px 10px', borderRadius: 3
                    }}>
                      {review.charterType === 'period' ? 'Period TC' : 'Trip TC'}
                    </div>
                    <button className="btn btn-ghost btn-sm"
                      style={{ padding: '4px 8px', color: 'var(--mid)' }}
                      onClick={e => handleDelete(e, review.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <h3 style={{ fontFamily: 'Playfair Display', fontSize: 17, marginBottom: 4, lineHeight: 1.3 }}>
                    {review.vesselName || 'Unnamed Vessel'}
                  </h3>
                  <p style={{ color: 'var(--mid)', fontSize: 13, marginBottom: 16 }}>
                    {review.party === 'charterers' ? '📋 Charterers' : '⚓ Owners'} ·{' '}
                    {review.cpDate || 'Date TBC'}
                  </p>

                  {/* Risk summary */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    {Object.entries(counts).map(([risk, count]) => count > 0 && (
                      <span key={risk} className={`badge badge-${risk}`}>{count} {risk}</span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--mid)', fontSize: 12 }}>
                      <Clock size={12} />
                      {review.createdAt?.toDate
                        ? review.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Recently'}
                    </div>
                    <ChevronRight size={16} color="var(--mid)" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
