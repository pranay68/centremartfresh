import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import RatingAndReviews from './RatingAndReviews';
import toast from 'react-hot-toast';
import Modal from './ui/Modal';

const ReviewModal = () => {
  const { user } = useAuth();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [reviewingOrder, setReviewingOrder] = useState(null);

  const handleOpenReviews = async () => {
    if (!user) {
      toast.error('Please sign in to view your reviews.');
      return;
    }
    // Fetch all orders for this user
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );
    const snap = await getDocs(q);
    setUserOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setShowReviewModal(true);
  };

  // Review submission handler
  const handleSubmitReview = async (order, review) => {
    await addDoc(collection(db, 'productReviews'), {
      productId: order.productId,
      userId: user.uid,
      userName: user.displayName || user.email || 'Anonymous',
      rating: review.rating,
      text: review.text,
      imageUrl: review.imageUrl || null,
      videoUrl: review.videoUrl || null,
      createdAt: new Date(),
      verified: true
    });
    toast.success('Review submitted!');
    setReviewingOrder(null);
    setShowReviewModal(false);
  };

  useEffect(() => {
    const openReviewsListener = () => handleOpenReviews();
    window.addEventListener('open-reviews-modal', openReviewsListener);
    return () => window.removeEventListener('open-reviews-modal', openReviewsListener);
    // eslint-disable-next-line
  }, [user]);

  return (
    <Modal isOpen={showReviewModal} onClose={() => { setShowReviewModal(false); setReviewingOrder(null); }} title="Rate & Review Your Purchases" size="lg">
      {userOrders.length === 0 ? (
        <div>No orders found.</div>
      ) : (
        userOrders.map(order => (
          <div key={order.id} className="review-order-item" style={{marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <img src={order.productImageURL || '/default-pfp.png'} alt={order.productName} style={{width:48,height:48,borderRadius:8,objectFit:'cover'}} />
              <div>
                <div style={{fontWeight:600}}>{order.productName}</div>
                <div style={{fontSize:12,color:'#888'}}>Status: {order.status}</div>
              </div>
            </div>
            <button
              className="review-btn"
              onClick={() => {
                if(order.status !== 'Delivered') {
                  setReviewingOrder(null);
                  setTimeout(() => setReviewingOrder(null), 1); // force re-render
                  order._showNotDelivered = true;
                  setUserOrders(prev => prev.map(o => o.id === order.id ? { ...o, _showNotDelivered: true } : o));
                  return;
                }
                setReviewingOrder(order);
              }}
              style={{marginTop:8}}
            >
              Write Review
            </button>
            {order.status !== 'Delivered' && order._showNotDelivered && (
              <div style={{ color: '#e53e3e', fontSize: 13, marginTop: 4 }}>
                Please let the order be delivered.
              </div>
            )}
          </div>
        ))
      )}
      {/* Review Form Modal */}
      {reviewingOrder && (
        <Modal isOpen={!!reviewingOrder} onClose={() => setReviewingOrder(null)} title={`Write a Review for ${reviewingOrder.productName}`} size="md">
          <RatingAndReviews reviews={[]} onSubmitReview={review => handleSubmitReview(reviewingOrder, review)} />
          <button className="review-submit-btn" style={{marginTop:16}} onClick={() => setReviewingOrder(null)}>Cancel</button>
        </Modal>
      )}
    </Modal>
  );
};

export default ReviewModal; 