import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Ship, ArrowLeft, Download, Save, ChevronDown, ChevronUp,
  Edit3, Check, X, AlertTriangle, CheckCircle, Info, Trash2, BookOpen, Users, FileText
} from 'lucide-react';

const ADMIN_EMAIL = 'aloksrius@yahoo.com';

const RISK_CONFIG = {
  high:   { label: 'High Risk',  color: '#c0392b', bg: '#fdecea', border: '#f5b7b1', Icon: AlertTriangle },
  medium: { label: 'Medium',     color: '#d4720a', bg: '#fef5e7', border: '#f8c471', Icon: AlertTriangle },
  low:    { label: 'Acceptable', color: '#1e7e4a', bg: '#eafaf1', border: '#a9dfbf', Icon: CheckCircle },
  info:   { label: 'Note',       color: '#1a5c8a', bg: '#eaf3fb', border: '#aed6f1', Icon: Info }
};

const TYPE_CONFIG = {
  critical: { label: '⚑ Critical',   border: '#c0392b' },
  concern:  { label: '⚠ Concern',    border: '#d4720a' },
  ok:       { label: '✓ Favourable', border: '#1e7e4a' },
  note:     { label: 'ℹ Note',       border: '#1a5c8a' }
};

// ── Add to Knowledge Base Modal ────────────────────────────
function KnowledgeModal({ comment, clauseTitle, onSave, onSkip }) {
  const [topic, setTopic] = useState(clauseTitle || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!topic.trim()) return toast.error('Please enter a topic');
    setSaving(true);
    try {
      await addDoc(collection(db, 'knowledge'), {
        topic: topic.trim(),
        clauseContext: clauseTitle,
        text: comment.text,
        suggestedAmendment: comment.suggested || '',
        createdAt: serverTimestamp()
      });
      toast.success('Added to Knowledge Base!');
      onSave();
    } catch (e) {
      toast.error('Failed to save to Knowledge Base');
    } finally { setSaving(false); }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,25,35,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24
    }}>
      <div style={{
        background: 'var(--paper)', borderRadius: 12, padding: '32px 36px',
        maxWidth: 500, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <BookOpen size={20} color="var(--green)" />
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: 20 }}>Add to Knowledge Base?</h3>
        </div>
        <p style={{ color: 'var(--mid)', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
          This comment will be saved anonymously and used to improve future GeoAI reviews for all users.
        </p>

        <div style={{
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#2c2c3e'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--mid)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Comment</div>
          {comment.text}
          {comment.suggested && (
            <div style={{ marginTop: 8, fontStyle: 'italic', color: 'var(--blue)', fontSize: 13 }}>
              Suggested: {comment.suggested}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Topic / Category</label>
          <input className="form-input" value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Cargo Exclusions — Coal, NAABSA provisions, Hire grace period" />
          <p className="form-hint">Describe the commercial/legal topic so future reviews can match it correctly</p>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-outline" onClick={onSkip}>Skip</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><BookOpen size={14} /> Save to Knowledge Base</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Comment Modal ──────────────────────────────────────
function AddCommentModal({ clauseTitle, onAdd, onClose }) {
  const [draft, setDraft] = useState({ type: 'note', label: '', text: '', suggested: '' });
  const [saveToKB, setSaveToKB] = useState(false);

  function handleAdd() {
    if (!draft.label || !draft.text) return toast.error('Please fill in label and comment');
    onAdd({ ...draft, source: 'user' }, saveToKB);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,25,35,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24
    }}>
      <div style={{
        background: 'var(--paper)', borderRadius: 12, padding: '32px 36px',
        maxWidth: 520, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.4)'
      }}>
        <h3 style={{ fontFamily: 'Playfair Display', fontSize: 20, marginBottom: 20 }}>Add Comment</h3>

        <div className="form-group">
          <label className="form-label">Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['critical','concern','ok','note'].map(t => (
              <button key={t} onClick={() => setDraft(p => ({ ...p, type: t }))}
                style={{
                  padding: '6px 14px', borderRadius: 4, border: '1.5px solid',
                  borderColor: draft.type === t ? TYPE_CONFIG[t].border : 'var(--border)',
                  background: draft.type === t ? TYPE_CONFIG[t].border + '18' : 'transparent',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: draft.type === t ? TYPE_CONFIG[t].border : 'var(--mid)',
                  textTransform: 'capitalize'
                }}>{t}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Label</label>
          <input className="form-input" placeholder="Short heading for this comment"
            value={draft.label} onChange={e => setDraft(p => ({ ...p, label: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Comment</label>
          <textarea className="form-textarea" rows={4} placeholder="Your detailed comment..."
            value={draft.text} onChange={e => setDraft(p => ({ ...p, text: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Suggested Amendment (optional)</label>
          <textarea className="form-textarea" rows={2} placeholder="What should the clause say instead?"
            value={draft.suggested} onChange={e => setDraft(p => ({ ...p, suggested: e.target.value }))} />
        </div>

        {/* Knowledge base toggle */}
        <div onClick={() => setSaveToKB(!saveToKB)} style={{
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          background: saveToKB ? 'var(--green-light)' : 'var(--paper)',
          border: `1.5px solid ${saveToKB ? 'var(--green)' : 'var(--border)'}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 20, transition: 'all 0.2s'
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 4,
            border: `2px solid ${saveToKB ? 'var(--green)' : 'var(--border)'}`,
            background: saveToKB ? 'var(--green)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {saveToKB && <Check size={12} color="white" />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: saveToKB ? 'var(--green)' : 'var(--ink)' }}>
              <BookOpen size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              Also save to Knowledge Base
            </div>
            <div style={{ fontSize: 12, color: 'var(--mid)' }}>
              Anonymously shared with all users to improve future GeoAI reviews
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Add Comment</button>
        </div>
      </div>
    </div>
  );
}

// ── Comment Block ──────────────────────────────────────────
function CommentBlock({ comment, onUpdate, onDelete, clauseTitle }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...comment });
  const [showKBModal, setShowKBModal] = useState(false);
  const cfg = TYPE_CONFIG[comment.type] || TYPE_CONFIG.note;
  const isUserComment = comment.source === 'user';
  const isCommunity = comment.source === 'community';

  function save() { onUpdate(draft); setEditing(false); }
  function cancel() { setDraft({ ...comment }); setEditing(false); }

  return (
    <>
      {showKBModal && (
        <KnowledgeModal
          comment={comment}
          clauseTitle={clauseTitle}
          onSave={() => setShowKBModal(false)}
          onSkip={() => setShowKBModal(false)}
        />
      )}
      <div style={{
        borderLeft: `3px solid ${isCommunity ? '#7d3c98' : cfg.border}`,
        background: isCommunity ? '#fdf5ff' : 'var(--white)',
        padding: '14px 16px', marginBottom: 12, borderRadius: '0 6px 6px 0'
      }}>
        {editing ? (
          <div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Label</label>
              <input className="form-input" style={{ fontSize: 14 }} value={draft.label}
                onChange={e => setDraft(p => ({ ...p, label: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Comment</label>
              <textarea className="form-textarea" style={{ fontSize: 14 }} value={draft.text}
                onChange={e => setDraft(p => ({ ...p, text: e.target.value }))} rows={4} />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Suggested Amendment</label>
              <textarea className="form-textarea" style={{ fontSize: 14 }} value={draft.suggested || ''}
                onChange={e => setDraft(p => ({ ...p, suggested: e.target.value }))} rows={3} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={save}><Check size={14} /> Save</button>
              <button className="btn btn-ghost btn-sm" onClick={cancel}><X size={14} /> Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                  textTransform: 'uppercase', color: isCommunity ? '#7d3c98' : cfg.border
                }}>{comment.label}</span>
                {/* Source badge */}
                {isCommunity ? (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10,
                    background: '#f3e5ff', color: '#7d3c98', border: '1px solid #d7a8f0',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3
                  }}>
                    <Users size={9} /> Community
                  </span>
                ) : isUserComment ? (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10,
                    background: 'var(--blue-light)', color: 'var(--blue)',
                    border: '1px solid #aed6f1', fontWeight: 600
                  }}>You</span>
                ) : (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10,
                    background: 'rgba(201,168,76,0.15)', color: 'var(--gold)',
                    border: '1px solid rgba(201,168,76,0.4)', fontWeight: 600
                  }}>GeoAI</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {!isCommunity && (
                  <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }} onClick={() => setEditing(true)}>
                    <Edit3 size={13} />
                  </button>
                )}
                {!isCommunity && isUserComment && (
                  <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', color: 'var(--green)' }}
                    title="Save to Knowledge Base" onClick={() => setShowKBModal(true)}>
                    <BookOpen size={13} />
                  </button>
                )}
                {!isCommunity && (
                  <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', color: 'var(--accent)' }} onClick={onDelete}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            <p style={{ fontSize: 14, color: '#2c2c3e', marginBottom: comment.suggested ? 10 : 0 }}>{comment.text}</p>
            {comment.suggested && (
              <div style={{
                background: '#f0f7ff', border: '1px dashed #aed6f1',
                padding: '8px 12px', borderRadius: 4, fontSize: 13, color: '#1a3a5c', fontStyle: 'italic'
              }}>
                <strong style={{ fontStyle: 'normal', color: '#0a2540' }}>Suggested: </strong>{comment.suggested}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Clause Section ─────────────────────────────────────────
function ClauseSection({ clause, index, onUpdateClause, currentUser }) {
  const [open, setOpen] = useState(index < 3);
  const [showAddModal, setShowAddModal] = useState(false);
  const cfg = RISK_CONFIG[clause.risk] || RISK_CONFIG.info;
  const { Icon } = cfg;

  function updateComment(cIdx, updated) {
    const newComments = [...(clause.comments || [])];
    newComments[cIdx] = updated;
    onUpdateClause({ ...clause, comments: newComments });
  }

  function deleteComment(cIdx) {
    const newComments = (clause.comments || []).filter((_, i) => i !== cIdx);
    onUpdateClause({ ...clause, comments: newComments });
  }

  async function handleAddComment(newComment, saveToKB) {
    const newComments = [...(clause.comments || []), newComment];
    onUpdateClause({ ...clause, comments: newComments });
    setShowAddModal(false);

    if (saveToKB) {
      try {
        await addDoc(collection(db, 'knowledge'), {
          topic: clause.clauseTitle,
          clauseContext: clause.clauseRef,
          text: newComment.text,
          suggestedAmendment: newComment.suggested || '',
          createdAt: serverTimestamp()
        });
        toast.success('Saved to Knowledge Base!');
      } catch { toast.error('Could not save to Knowledge Base'); }
    }

    if (!open) setOpen(true);
  }

  const geoaiComments = (clause.comments || []).filter(c => c.source === 'geoai' || !c.source);
  const communityComments = (clause.comments || []).filter(c => c.source === 'community');
  const userComments = (clause.comments || []).filter(c => c.source === 'user');
  const allComments = clause.comments || [];

  return (
    <>
      {showAddModal && (
        <AddCommentModal
          clauseTitle={clause.clauseTitle}
          onAdd={handleAddComment}
          onClose={() => setShowAddModal(false)}
        />
      )}
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
        <div onClick={() => setOpen(!open)} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
          background: '#eee9d8', cursor: 'pointer', borderBottom: open ? '1px solid var(--border)' : 'none'
        }}>
          <Icon size={16} color={cfg.color} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700, minWidth: 60 }}>{clause.clauseRef}</span>
          <span style={{ fontFamily: 'Playfair Display', fontSize: 15, fontWeight: 700, flex: 1 }}>{clause.clauseTitle}</span>
          <span className={`badge badge-${clause.risk}`}>{cfg.label}</span>
          {communityComments.length > 0 && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 10,
              background: '#f3e5ff', color: '#7d3c98', border: '1px solid #d7a8f0', fontWeight: 600
            }}>
              <Users size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
              {communityComments.length} community
            </span>
          )}
          <span style={{ color: 'var(--mid)', fontSize: 12 }}>{allComments.length} comments</span>
          {open ? <ChevronUp size={16} color="var(--mid)" /> : <ChevronDown size={16} color="var(--mid)" />}
        </div>

        {open && (
          <div style={{ padding: '18px 22px', background: 'var(--card)' }}>
            {allComments.map((c, i) => (
              <CommentBlock key={i} comment={c} clauseTitle={clause.clauseTitle}
                onUpdate={updated => updateComment(i, updated)}
                onDelete={() => deleteComment(i)}
                currentUser={currentUser}
              />
            ))}
            <button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(true)} style={{ marginTop: 4 }}>
              + Add Comment
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Clause sort by number ──────────────────────────────────
function sortClauses(clauses) {
  return [...clauses].sort((a, b) => {
    const parse = s => {
      const m = (s || '').match(/(\d+)/);
      return m ? parseInt(m[1]) : 9999;
    };
    const n1 = parse(a.clauseRef), n2 = parse(b.clauseRef);
    if (n1 !== n2) return n1 - n2;
    return (a.clauseRef || '').localeCompare(b.clauseRef || '');
  });
}

// ── Word Doc Generator ─────────────────────────────────────
async function generateWord(review) {
  try {
    const res = await fetch('/api/generate-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review)
    });
    if (!res.ok) throw new Error('Server error');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GEOSERVE_CP_Review_${review.vesselName||'vessel'}_${new Date().toISOString().slice(0,10)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) {
    alert('Word download failed. Please try again.');
    console.error(e);
  }
}


// ── PDF Generator ──────────────────────────────────────────
function generatePDF(review) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, margin = 18;

  pdf.setFillColor(15, 25, 35);
  pdf.rect(0, 0, W, 297, 'F');
  pdf.setFillColor(201, 168, 76);
  pdf.rect(0, 270, W, 6, 'F');

  pdf.setTextColor(201, 168, 76);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('GEOSERVE  ·  CHARTERPARTY REVIEW', margin, 40);

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.text('CP Review Report', margin, 80);

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.text(review.vesselName || 'Vessel', margin, 96);

  pdf.setFontSize(12);
  pdf.setTextColor(180, 180, 200);
  const meta = [
    `Party: ${review.party?.toUpperCase() || 'N/A'}`,
    `Charter Type: ${review.charterType === 'period' ? 'Period TC' : 'Trip TC'}`,
    `CP Date: ${review.cpDate || 'N/A'}`,
    review.intendedCargo ? `Intended Cargo: ${review.intendedCargo}` : null,
    review.specificInstructions ? `Specific Focus: ${review.specificInstructions.slice(0, 80)}…` : null,
    `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`
  ].filter(Boolean);
  meta.forEach((m, i) => pdf.text(m, margin, 116 + i * 8));

  const counts = { high: 0, medium: 0, low: 0, info: 0 };
  (review.comments || []).forEach(c => { if (counts[c.risk] !== undefined) counts[c.risk]++; });
  pdf.setTextColor(201, 168, 76);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RISK SUMMARY', margin, 200);
  autoTable(pdf, {
    startY: 204,
    head: [['Risk Level', 'Count', 'Action']],
    body: [
      ['High Risk', counts.high.toString(), 'Seek immediate amendment'],
      ['Medium Risk', counts.medium.toString(), 'Monitor / negotiate'],
      ['Acceptable', counts.low.toString(), 'Favourable or market standard'],
      ['Information', counts.info.toString(), 'Note / clarify']
    ],
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [201, 168, 76], textColor: [15, 25, 35], fontStyle: 'bold' },
    styles: { textColor: [220, 220, 220], fillColor: [25, 35, 50], fontSize: 10 },
    alternateRowStyles: { fillColor: [30, 42, 60] }
  });

  pdf.setTextColor(100, 100, 120);
  pdf.setFontSize(9);
  pdf.text('Confidential — For internal use only. Not legal advice.', margin, 285);

  (review.comments || []).forEach(clause => {
    pdf.addPage();
    const cfg = RISK_CONFIG[clause.risk] || RISK_CONFIG.info;
    const barColor = clause.risk === 'high' ? [192,57,43] : clause.risk === 'medium' ? [212,114,10] : clause.risk === 'low' ? [30,126,74] : [26,92,138];
    pdf.setFillColor(...barColor);
    pdf.rect(0, 0, W, 20, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${clause.clauseRef}  ·  ${clause.clauseTitle}`, margin, 13);
    pdf.setFontSize(8);
    pdf.text(cfg.label.toUpperCase(), W - margin, 13, { align: 'right' });

    let y = 30;
    (clause.comments || []).forEach(c => {
      if (y > 260) { pdf.addPage(); y = 20; }
      const sourceLabel = c.source === 'community' ? ' [Community]' : c.source === 'user' ? ' [User]' : ' [GeoAI]';
      pdf.setTextColor(60, 60, 80);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(c.label + sourceLabel, margin + 2, y + 5);
      y += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 50);
      const lines = pdf.splitTextToSize(c.text, W - margin * 2 - 5);
      lines.forEach(line => {
        if (y > 265) { pdf.addPage(); y = 20; }
        pdf.text(line, margin + 2, y);
        y += 6;
      });
      if (c.suggested) {
        y += 3;
        pdf.setTextColor(26, 58, 92);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bolditalic');
        pdf.text('Suggested:', margin + 2, y);
        pdf.setFont('helvetica', 'italic');
        const slines = pdf.splitTextToSize(c.suggested, W - margin * 2 - 20);
        slines.forEach(line => {
          if (y > 265) { pdf.addPage(); y = 20; }
          pdf.text(line, margin + 25, y);
          y += 6;
        });
      }
      y += 10;
    });
  });

  pdf.save(`GEOSERVE_CP_Review_${review.vesselName || 'vessel'}_${new Date().toISOString().slice(0,10)}.pdf`);
  toast.success('PDF downloaded');
}

// ── Main Review Page ───────────────────────────────────────
export default function ReviewPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'reviews', id));
        if (!snap.exists() || snap.data().userId !== currentUser.uid) {
          toast.error('Review not found'); navigate('/dashboard'); return;
        }
        setReview({ id: snap.id, ...snap.data() });
      } catch { toast.error('Failed to load review'); }
      finally { setLoading(false); }
    }
    load();
  }, [id, currentUser, navigate]);

  function updateClause(idx, updated) {
    setReview(prev => {
      const comments = [...prev.comments];
      comments[idx] = updated;
      return { ...prev, comments };
    });
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'reviews', id), { comments: review.comments, updatedAt: serverTimestamp() });
      setDirty(false);
      toast.success('Saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex-center" style={{ height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, marginBottom: 16 }} />
        <p style={{ color: 'var(--mid)' }}>Loading review…</p>
      </div>
    </div>
  );

  if (!review) return null;
  const counts = { high: 0, medium: 0, low: 0, info: 0 };
  (review.comments || []).forEach(c => { if (counts[c.risk] !== undefined) counts[c.risk]++; });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <header style={{
        background: 'var(--navy)', borderBottom: '3px solid var(--gold)',
        padding: '0 32px', height: 64, position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', gap: 16
      }}>
        <button className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.6)' }} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 32, height: 32, background: 'var(--gold)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ship size={18} color="#0f1923" />
          </div>
          <div>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 16, fontWeight: 700, color: 'white' }}>
              {review.vesselName || 'Unnamed Vessel'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              {review.party?.toUpperCase()} · {review.charterType === 'period' ? 'Period TC' : 'Trip TC'} · {review.cpDate}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.6)' }}
            onClick={() => navigate('/knowledge')}>
            <BookOpen size={16} /> Knowledge Base
          </button>
          {dirty && (
            <button className="btn btn-dark btn-sm" onClick={save} disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => generatePDF(review)}>
            <Download size={14} /> Export PDF
          </button>
          <button className="btn btn-dark btn-sm" onClick={() => generateWord(review)}
            style={{ background: '#1B3A6B', borderColor: '#1B3A6B', color: 'white' }}>
            <FileText size={14} /> Download Word
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        {/* Specific instructions shown if set */}
        {review.specificInstructions && (
          <div style={{
            background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 8, padding: '12px 18px', marginBottom: 28,
            display: 'flex', alignItems: 'flex-start', gap: 10
          }}>
            <Info size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Specific Focus Applied</div>
              <div style={{ fontSize: 13, color: 'var(--ink)' }}>{review.specificInstructions}</div>
            </div>
          </div>
        )}

        {/* Risk summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 36 }}>
          {Object.entries(RISK_CONFIG).map(([risk, cfg]) => {
            const { Icon } = cfg;
            return (
              <div key={risk} style={{
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                borderRadius: 8, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12
              }}>
                <Icon size={22} color={cfg.color} />
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: cfg.color, fontFamily: 'Playfair Display' }}>{counts[risk]}</div>
                  <div style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>{cfg.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { color: 'var(--gold)', bg: 'rgba(201,168,76,0.15)', label: 'GeoAI' },
            { color: '#7d3c98', bg: '#f3e5ff', label: 'Community Knowledge' },
            { color: 'var(--blue)', bg: 'var(--blue-light)', label: 'Your Comments' }
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ padding: '2px 8px', borderRadius: 10, background: l.bg, color: l.color, fontSize: 11, fontWeight: 600 }}>{l.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: 22 }}>
            Clause Comments ({(review.comments || []).length} clauses)
          </h2>
          {dirty && <span style={{ fontSize: 13, color: 'var(--amber)', fontStyle: 'italic' }}>Unsaved changes</span>}
        </div>

        {sortClauses(review.comments || []).map((clause, idx) => {
          const origIdx = (review.comments || []).indexOf(clause);
          return (
            <ClauseSection key={origIdx} clause={clause} index={idx}
              onUpdateClause={updated => updateClause(origIdx, updated)}
              currentUser={currentUser}
            />
          );
        })}
      </main>
    </div>
  );
}
