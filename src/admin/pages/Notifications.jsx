import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import Button from '../../components/ui/Button';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'adminNotifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const sendNotification = async (e) => {
    e.preventDefault();
    if (!title || !body) return;
    setSending(true);
    await addDoc(collection(db, 'adminNotifications'), {
      title,
      body,
      createdAt: serverTimestamp(),
      read: false,
      type: 'global',
    });
    setTitle('');
    setBody('');
    setSending(false);
  };

  return (
    <div className="notification-bg">
      <div className="notification-glass">
        <h2 className="notification-title">Notifications</h2>
        <form onSubmit={sendNotification} className="notification-form">
          <input className="notification-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className="notification-textarea" placeholder="Body" value={body} onChange={e => setBody(e.target.value)} rows={3} />
          <Button type="submit" disabled={sending || !title || !body} className="notification-btn">Send Notification</Button>
        </form>
        <div className="notification-list-section">
          <h3 className="notification-list-title">Recent Notifications</h3>
          {notifications.length === 0 && <div className="notification-empty">No notifications yet.</div>}
          {notifications.map(n => (
            <div key={n.id} className={`notification-item${n.read ? ' read' : ''}`}> 
              <div className="notification-item-title">{n.title || n.type || 'Notification'}</div>
              <div className="notification-item-body">{n.body}</div>
              <div className="notification-item-date">{n.createdAt?.toDate?.().toLocaleString?.() || ''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notifications; 