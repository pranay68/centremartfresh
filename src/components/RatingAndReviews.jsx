import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import './RatingAndReviews.css';
import ReviewCard from './ReviewCard';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

const RatingAndReviews = ({ reviews = [], onSubmitReview }) => {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0';

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    setVideo(file);
    setVideoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!rating) {
      setError('Please select a star rating before submitting your review!');
      return;
    }
    if (!text) return;
    setSubmitting(true);
    setUploading(true);
    let imageUrl = null;
    let videoUrl = null;
    try {
      if (image) {
        imageUrl = await uploadToCloudinary(image, 'image');
      }
      if (video) {
        videoUrl = await uploadToCloudinary(video, 'video');
      }
    } catch (err) {
      setError('Image/video upload failed. (Cloudinary 401 error: Check your cloud name and upload preset in cloudinaryUpload.js!)');
      setUploading(false);
      setSubmitting(false);
      return;
    }
    setUploading(false);
    await onSubmitReview({ rating, text, imageUrl, videoUrl });
    setRating(0);
    setText('');
    setImage(null);
    setVideo(null);
    setImagePreview(null);
    setVideoPreview(null);
    setSubmitting(false);
  };

  return (
    <div className="rating-reviews-section">
      <h3>Ratings & Reviews</h3>
      <div className="avg-rating-row">
        <span className="avg-rating-number">{avgRating}</span>
        <span className="stars">{
          Array.from({ length: 5 }, (_, i) => (
            <FaStar key={i} className={i < Math.round(avgRating) ? 'filled' : 'empty'} />
          ))
        }</span>
        <span className="total-reviews">({reviews.length} reviews)</span>
      </div>
      {/* Review Form */}
      <form className="review-form" onSubmit={handleSubmit}>
        <div className="review-stars" style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontWeight:600,marginRight:8}}>Your Rating:</span>
          {[1,2,3,4,5].map(star => (
            <span
              key={star}
              className={rating >= star ? 'star-filled' : 'star-empty'}
              onClick={() => setRating(star)}
              style={error && !rating ? {border:'2px solid #e53e3e',borderRadius:4,background:'#fff3f3'} : {}}
            >★</span>
          ))}
        </div>
        <textarea className="review-textarea" placeholder="Write your review..." value={text} onChange={e => setText(e.target.value)} />
        <div style={{display:'flex',gap:16,alignItems:'center',marginTop:8}}>
          <label style={{cursor:'pointer'}}>
            📷 Image
            <input type="file" accept="image/*" style={{display:'none'}} onChange={handleImageChange} />
          </label>
          {imagePreview && <img src={imagePreview} alt="preview" style={{width:48,height:48,borderRadius:8,objectFit:'cover'}} />}
          <label style={{cursor:'pointer'}}>
            🎥 Video
            <input type="file" accept="video/*" style={{display:'none'}} onChange={handleVideoChange} />
          </label>
          {videoPreview && <video src={videoPreview} controls style={{width:64,maxHeight:48,borderRadius:8}} />}
        </div>
        {error && <div style={{color:'#e53e3e',marginTop:8,fontWeight:600}}>{error}</div>}
        {uploading && <div style={{color:'#00d4ff',marginTop:8}}>Uploading...</div>}
        <button className="review-submit-btn" type="submit" disabled={submitting || !text || uploading}>Submit Review</button>
      </form>
      <div className="reviews-list">
        {reviews.length === 0 && <div className="no-reviews">No reviews yet. Be the first to review!</div>}
        {reviews.map(r => (
          <ReviewCard key={r.id} review={{
            ...r,
            author: r.userName ? `${r.userName.slice(0,3)}${'*'.repeat(Math.max(0, r.userName.length-3))}` : '***',
            date: r.createdAt,
            verified: r.verified,
            images: r.images || [],
            video: r.videoUrl,
            purchased: r.verified,
            comment: r.text,
          }} />
        ))}
      </div>
    </div>
  );
};

export default RatingAndReviews; 