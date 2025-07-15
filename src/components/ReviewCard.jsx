import React, { useState } from 'react';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  Camera, 
  User, 
  Calendar,
  Flag,
  Share2,
  Heart
} from 'lucide-react';
import './ReviewCard.css';

const ReviewCard = ({ 
  review, 
  onHelpful, 
  onReport, 
  onShare, 
  onLike,
  showFullReview = false 
}) => {
  const [isLiked, setIsLiked] = useState(review.isLiked || false);
  const [isHelpful, setIsHelpful] = useState(review.isHelpful || false);
  const [isNotHelpful, setIsNotHelpful] = useState(review.isNotHelpful || false);
  const [showImages, setShowImages] = useState(false);

  const handleHelpful = () => {
    if (isHelpful) {
      setIsHelpful(false);
      review.helpfulCount = Math.max(0, review.helpfulCount - 1);
    } else {
      setIsHelpful(true);
      setIsNotHelpful(false);
      review.helpfulCount = (review.helpfulCount || 0) + 1;
      if (isNotHelpful) {
        review.notHelpfulCount = Math.max(0, review.notHelpfulCount - 1);
      }
    }
    if (onHelpful) onHelpful(review);
  };

  const handleNotHelpful = () => {
    if (isNotHelpful) {
      setIsNotHelpful(false);
      review.notHelpfulCount = Math.max(0, review.notHelpfulCount - 1);
    } else {
      setIsNotHelpful(true);
      setIsHelpful(false);
      review.notHelpfulCount = (review.notHelpfulCount || 0) + 1;
      if (isHelpful) {
        review.helpfulCount = Math.max(0, review.helpfulCount - 1);
      }
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (onLike) onLike(review);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Review by ${review.author}`,
        text: review.comment,
        url: window.location.href
      });
    }
    if (onShare) onShare(review);
  };

  const handleReport = () => {
    if (onReport) onReport(review);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={14}
        className={index < rating ? 'star-filled' : 'star-empty'}
      />
    ));
  };

  const formatDate = (date) => {
    const reviewDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - reviewDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const isVerified = review.verified || review.purchased;
  const hasImages = review.images && review.images.length > 0;
  const hasVideo = !!review.video;

  return (
    <div className="review-card">
      <div className="review-header">
        <div className="reviewer-info">
          <div className="reviewer-avatar">
            {review.avatar ? (
              <img src={review.avatar} alt={review.author} />
            ) : (
              <User size={16} />
            )}
          </div>
          <div className="reviewer-details">
            <div className="reviewer-name">
              {review.author}
              {isVerified && (
                <span className="verified-badge">
                  ✓ Verified Purchase
                </span>
              )}
            </div>
            <div className="review-date">
              <Calendar size={12} />
              {formatDate(review.date)}
            </div>
          </div>
        </div>
        
        <div className="review-rating">
          <div className="stars">
            {renderStars(review.rating)}
          </div>
          <span className="rating-text">{review.rating}/5</span>
        </div>
      </div>

      {review.title && (
        <h4 className="review-title">{review.title}</h4>
      )}

      <div className="review-content">
        {showFullReview ? (
          <p className="review-text">{review.comment}</p>
        ) : (
          <p className="review-text">
            {review.comment.length > 200 
              ? `${review.comment.substring(0, 200)}...` 
              : review.comment
            }
          </p>
        )}
        
        {!showFullReview && review.comment.length > 200 && (
          <button className="read-more-btn">Read more</button>
        )}
      </div>

      {hasImages && (
        <div className="review-images">
          <div className="images-grid">
            {review.images.slice(0, 3).map((image, index) => (
              <div key={index} className="review-image">
                <img 
                  src={image} 
                  alt={`Review image ${index + 1}`}
                  onClick={() => setShowImages(true)}
                />
                {index === 2 && review.images.length > 3 && (
                  <div className="more-images-overlay">
                    <Camera size={16} />
                    <span>+{review.images.length - 3}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {hasVideo && (
        <div className="review-video" style={{marginTop:8}}>
          <video src={review.video} controls style={{width:'100%',maxWidth:320,borderRadius:8}} />
        </div>
      )}

      {review.pros && review.pros.length > 0 && (
        <div className="review-pros">
          <h5>Pros:</h5>
          <ul>
            {review.pros.map((pro, index) => (
              <li key={index}>{pro}</li>
            ))}
          </ul>
        </div>
      )}

      {review.cons && review.cons.length > 0 && (
        <div className="review-cons">
          <h5>Cons:</h5>
          <ul>
            {review.cons.map((con, index) => (
              <li key={index}>{con}</li>
            ))}
          </ul>
        </div>
      )}

      {review.recommendation && (
        <div className="review-recommendation">
          <span className={`recommendation-badge ${review.recommendation}`}>
            {review.recommendation === 'yes' ? '✓ Recommended' : '✗ Not Recommended'}
          </span>
        </div>
      )}

      <div className="review-actions">
        <div className="helpful-actions">
          <button 
            className={`helpful-btn ${isHelpful ? 'active' : ''}`}
            onClick={handleHelpful}
          >
            <ThumbsUp size={14} />
            Helpful ({review.helpfulCount || 0})
          </button>
          
          <button 
            className={`not-helpful-btn ${isNotHelpful ? 'active' : ''}`}
            onClick={handleNotHelpful}
          >
            <ThumbsDown size={14} />
            Not Helpful ({review.notHelpfulCount || 0})
          </button>
        </div>

        <div className="secondary-actions">
          <button 
            className="action-btn like-btn"
            onClick={handleLike}
          >
            <Heart size={14} className={isLiked ? 'filled' : ''} />
          </button>
          
          <button 
            className="action-btn share-btn"
            onClick={handleShare}
          >
            <Share2 size={14} />
          </button>
          
          <button 
            className="action-btn report-btn"
            onClick={handleReport}
          >
            <Flag size={14} />
          </button>
        </div>
      </div>

      {review.replies && review.replies.length > 0 && (
        <div className="review-replies">
          <h6>Replies ({review.replies.length})</h6>
          {review.replies.map((reply, index) => (
            <div key={index} className="reply">
              <div className="reply-header">
                <span className="reply-author">{reply.author}</span>
                <span className="reply-date">{formatDate(reply.date)}</span>
              </div>
              <p className="reply-text">{reply.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewCard; 