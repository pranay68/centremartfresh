import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import Modal from '../../components/ui/Modal';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const MainPanel = () => {
  // Category order management state
  const [categories, setCategories] = useState([]);
  const [orderedCategories, setOrderedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Banner management state
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [banners, setBanners] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedBannerIdx, setSelectedBannerIdx] = useState(0);

  // Fetch categories and order from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'categories'), (catSnap) => {
      const cats = catSnap.docs.map(doc => doc.data().name).filter(Boolean);
      // Get saved order
      getDoc(doc(db, 'settings', 'categoryOrder')).then(orderDoc => {
        let order = [];
        if (orderDoc.exists()) {
          order = orderDoc.data().order || [];
        }
        // Merge: keep order, append new
        const merged = [...order.filter(c => cats.includes(c)), ...cats.filter(c => !order.includes(c))];
        setCategories(cats); 
        setOrderedCategories(merged);
        setLoading(false);
      });
    });
    return () => unsubscribe();
  }, []);

  // Fetch banners from Firestore
  useEffect(() => {
    const fetchBanners = async () => {
      setBannerLoading(true);
      const docRef = doc(db, 'settings', 'banners');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBanners(docSnap.data().urls || []);
      } else {
        setBanners([]);
      }
      setBannerLoading(false);
    };
    if (showBannerModal) fetchBanners();
  }, [showBannerModal]);

  // Move category up/down
  const moveCategory = (idx, dir) => {
    setOrderedCategories(prev => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  // Save order to Firestore
  const saveOrder = async () => {
    setSaving(true);
    await setDoc(doc(db, 'settings', 'categoryOrder'), { order: orderedCategories });
    setSaving(false);
    alert('Category order saved!');
  };

  // Upload new banner
  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const newBanners = [...banners, url];
      await setDoc(doc(db, 'settings', 'banners'), { urls: newBanners });
      setBanners(newBanners);
    } catch (err) {
      alert('Failed to upload banner');
    }
    setUploadingBanner(false);
  };

  // Delete banner
  const handleDeleteBanner = async (idx) => {
    const url = banners[idx];
    if (!window.confirm('Delete this banner?')) return;
    try {
      // Try to delete from storage (optional, best effort)
      const storage = getStorage();
      const path = url.split('/o/')[1]?.split('?')[0]?.replace(/%2F/g, '/');
      if (path) {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef).catch(() => {});
      }
      const newBanners = banners.filter((_, i) => i !== idx);
      await setDoc(doc(db, 'settings', 'banners'), { urls: newBanners });
      setBanners(newBanners);
      setSelectedBannerIdx(0);
    } catch (err) {
      alert('Failed to delete banner');
    }
  };

  // Banner modal UI
  const BannerModal = () => (
    <Modal open={showBannerModal} onClose={() => setShowBannerModal(false)}>
      <div style={{ minWidth: 320, minHeight: 220 }}>
        <h3>Manage Banners</h3>
        {bannerLoading ? <div>Loading banners...</div> : banners.length === 0 ? <div>No banners yet.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 280, height: 120, marginBottom: 12, position: 'relative' }}>
              <img src={banners[selectedBannerIdx]} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
              <button style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }} disabled={selectedBannerIdx === 0} onClick={() => setSelectedBannerIdx(i => Math.max(0, i - 1))}>⟨</button>
              <button style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }} disabled={selectedBannerIdx === banners.length - 1} onClick={() => setSelectedBannerIdx(i => Math.min(banners.length - 1, i + 1))}>⟩</button>
            </div>
            <button onClick={() => handleDeleteBanner(selectedBannerIdx)} style={{ color: 'red', marginBottom: 8 }}>Delete This Banner</button>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <input type="file" accept="image/*" onChange={handleBannerUpload} disabled={uploadingBanner} />
          {uploadingBanner && <span>Uploading...</span>}
        </div>
      </div>
    </Modal>
  );

  return (
    <div className="main-panel-container">
      <h1>Main Panel</h1>
      <section>
        <h2>Category Order</h2>
        {loading ? <div>Loading...</div> : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {orderedCategories.map((cat, idx) => (
              <li key={cat} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ flex: 1 }}>{cat}</span>
                <button onClick={() => moveCategory(idx, -1)} disabled={idx === 0}>↑</button>
                <button onClick={() => moveCategory(idx, 1)} disabled={idx === orderedCategories.length - 1}>↓</button>
              </li>
            ))}
          </ul>
        )}
        <button onClick={saveOrder} disabled={saving || loading} style={{ marginTop: 12 }}>
          {saving ? 'Saving...' : 'Save Order'}
        </button>
      </section>
      {/* Top Products and Banner Management sections remain as placeholders for now */}
      <section>
        <h2>Top Products</h2>
        <div>Manage top products here (coming soon)</div>
      </section>
      {/* Banner Management Section */}
      <section>
        <h2>Banner Management</h2>
        <button onClick={() => setShowBannerModal(true)} style={{ marginBottom: 8 }}>Add / Manage Banners</button>
        {showBannerModal && <BannerModal />}
      </section>
    </div>
  );
};

export default MainPanel; 