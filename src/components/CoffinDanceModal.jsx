import React, { useEffect, useRef } from 'react';
import './CoffinDanceModal.css';

const CoffinDanceModal = ({ open, onClose }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    if (open && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="coffin-modal-overlay">
      <div className="coffin-modal">
        <div className="coffin-emoji-container">
          <span className="coffin-dance-emoji" role="img" aria-label="dancing">💃🕺💃🕺</span>
        </div>
        <h2 className="coffin-title">Thanks for ordering, <span className="coffin-genius">you're a genius!</span></h2>
        <p className="coffin-desc">Enjoy the vibe! Your order is on its way. 🎉</p>
        <audio ref={audioRef} src={require('../assets/Coffin Dance - [edit audio].mp3')} autoPlay loop />
        <button className="coffin-stop-btn" onClick={onClose}>🛑 Stop Music & Close</button>
      </div>
    </div>
  );
};

export default CoffinDanceModal; 