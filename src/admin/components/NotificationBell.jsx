import React, { useEffect, useState, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { Bell } from 'lucide-react';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const bellRef = useRef();

  useEffect(() => {
    const q = query(collection(db, 'adminNotifications'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id) => {
    await updateDoc(doc(db, 'adminNotifications', id), { read: true });
  };

  return (
    <div ref={bellRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
        <Bell size={26} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#ff1744', color: '#fff', borderRadius: '50%', fontSize: 12, fontWeight: 700, padding: '2px 6px', minWidth: 18, textAlign: 'center' }}>{unreadCount}</span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 36, minWidth: 320, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(102,126,234,0.13)', zIndex: 100, padding: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Notifications</div>
          {notifications.length === 0 && <div style={{ color: '#888', padding: 12 }}>No notifications yet.</div>}
          {notifications.map(n => (
            <div key={n.id} style={{ padding: 8, borderRadius: 8, background: n.read ? '#f8fafc' : '#e0e7ff', marginBottom: 6, cursor: 'pointer', fontWeight: n.read ? 400 : 700 }} onClick={() => markAsRead(n.id)}>
              <div>{n.title || n.type || 'Notification'}</div>
              <div style={{ fontSize: 13, color: '#555' }}>{n.body}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{n.createdAt?.toDate?.().toLocaleString?.() || ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 