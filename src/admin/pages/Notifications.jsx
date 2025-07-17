import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs } from 'firebase/firestore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [notificationType, setNotificationType] = useState('global'); // 'global' or 'specific'
  const [targetUserId, setTargetUserId] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const sendNotification = async (e) => {
    e.preventDefault();
    if (!title || !body) return;
    setSending(true);
    try {
      if (notificationType === 'global') {
        // Send to all users (fetch all user IDs from 'users' collection)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const notificationPromises = usersSnapshot.docs.map(userDoc =>
          addDoc(collection(db, 'notifications'), {
            userId: userDoc.id,
            title,
            message: body,
            type: 'admin',
            createdAt: serverTimestamp(),
            read: false,
            sentBy: 'admin',
          })
        );
        await Promise.all(notificationPromises);
      } else if (notificationType === 'specific' && targetUserId) {
        // Send to a specific user
        await addDoc(collection(db, 'notifications'), {
          userId: targetUserId,
          title,
          message: body,
          type: 'admin',
          createdAt: serverTimestamp(),
          read: false,
          sentBy: 'admin',
        });
      }
      setTitle('');
      setBody('');
      setTargetUserId('');
      setNotificationType('global');
    } catch (error) {
      console.error('Error sending notification:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="notification-bg">
      <div className="notification-glass">
        <h2 className="notification-title">Send Notifications</h2>
        <form onSubmit={sendNotification} className="notification-form">
          <div className="notification-type-selector">
            <label>
              <input
                type="radio"
                value="global"
                checked={notificationType === 'global'}
                onChange={(e) => setNotificationType(e.target.value)}
              />
              Send to All Users
            </label>
            <label>
              <input
                type="radio"
                value="specific"
                checked={notificationType === 'specific'}
                onChange={(e) => setNotificationType(e.target.value)}
              />
              Send to Specific User
            </label>
          </div>
          {notificationType === 'specific' && (
            <Input
              type="text"
              placeholder="User ID"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="notification-input"
            />
          )}
          <input
            className="notification-input"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="notification-textarea"
            placeholder="Body"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
          />
          <Button
            type="submit"
            disabled={sending || !title || !body || (notificationType === 'specific' && !targetUserId)}
            className="notification-btn"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </Button>
        </form>
        <div className="notification-list-section">
          <h3 className="notification-list-title">Recent Notifications</h3>
          {notifications.length === 0 && <div className="notification-empty">No notifications yet.</div>}
          {notifications.map(n => (
            <div key={n.id} className={`notification-item${n.read ? ' read' : ''}`}>
              <div className="notification-item-title">{n.title || n.type || 'Notification'}</div>
              <div className="notification-item-body">{n.message}</div>
              <div className="notification-item-meta">
                <span>Type: {n.type}</span>
                <span>User: {n.userId?.slice(0, 8)}...</span>
                <span>{n.createdAt?.toDate?.().toLocaleString?.() || ''}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notifications; 