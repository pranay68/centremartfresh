import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const OrderCancellation = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(fetchedOrders);
      } catch (err) {
        setError('Failed to fetch orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);


  const handleCancel = async (orderId) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
      setOrders(orders => orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch (err) {
      setError('Failed to cancel order.');
    }
  };

  return (
    <div>
      <h2>Order Cancellation</h2>
      {loading && <p>Loading orders...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {orders.map(order => (
          <li key={order.id} style={{ marginBottom: 16 }}>
            <div>Order ID: {order.id}</div>
            <div>Status: {order.status}</div>
            {order.status !== 'cancelled' && (
              <button onClick={() => handleCancel(order.id)}>Cancel Order</button>
            )}
          </li>
        ))}
      </ul>
      {!loading && orders.length === 0 && <p>No orders found.</p>}
    </div>
  );
};

export default OrderCancellation;
