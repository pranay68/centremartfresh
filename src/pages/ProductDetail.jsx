import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('Janakpur');
  const [customLocation, setCustomLocation] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    };

    fetchProduct();
  }, [id]);

  const handleBuy = () => {
    const finalLoc = isCustom ? customLocation : location;
    alert(`Buying "${product.name}" to be delivered in ${finalLoc}`);
  };

  if (loading) return <p>Loading product...</p>;
  if (!product) return <p>Product not found</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>{product.name}</h2>
      <img
        src={product.imageUrl}
        alt={product.name}
        style={{ width: '100%', maxWidth: 500, objectFit: 'contain' }}
      />
      <p><strong>Price:</strong> Rs {product.price}</p>
      <p><strong>Description:</strong> {product.description}</p>

      <div style={{ marginTop: 20 }}>
        <label>Delivery Location:</label><br />
        <select
          value={isCustom ? 'custom' : location}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              setIsCustom(true);
              setCustomLocation('');
            } else {
              setIsCustom(false);
              setLocation(e.target.value);
            }
          }}
          style={{ padding: 5, marginTop: 5 }}
        >
          <option value="Janakpur">Janakpur</option>
          <option value="custom">Add new location</option>
        </select>

        {isCustom && (
          <input
            type="text"
            placeholder="Enter your location"
            value={customLocation}
            onChange={(e) => setCustomLocation(e.target.value)}
            style={{ display: 'block', marginTop: 10, padding: 5, width: '100%' }}
          />
        )}
      </div>

      <button
        onClick={handleBuy}
        style={{ marginTop: 20, background: 'green', color: 'white', padding: '10px 20px', border: 'none', cursor: 'pointer' }}
      >
        Buy Now
      </button>
    </div>
  );
};

export default ProductDetailPage;
