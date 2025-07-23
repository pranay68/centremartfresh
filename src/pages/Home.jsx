import React, { useEffect, useState, useRef, useCallback } from 'react';
import ProductCard from '../components/ProductGrid/ProductCard';
import CategoryPanel from '../components/ProductGrid/CategoryPanel';
import FlashSaleSection from '../components/FlashSaleSection';
import TopSaleSection from '../components/TopSaleSection';
import NewArrivalsSection from '../components/NewArrivalsSection';
import Header from '../components/Header';
import BottomNav from '../components/ui/BottomNav';
import { useMediaQuery } from 'react-responsive';
import { db } from '../firebase/config';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  where,
} from 'firebase/firestore';
import './HomeNew.css';
import HomeMobile from './HomeMobile'; // Import the new mobile component

const Home = () => {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const isMobile = useMediaQuery({ query: '(max-width: 640px)' });
  const observer = useRef();

  const fetchProducts = useCallback(async (initial = false) => {
    if (loading || (!hasMore && !initial)) return;

    try {
      setLoading(true);
      const productsRef = collection(db, 'products');
      let q;

      if (initial) {
        q = query(productsRef, orderBy('name'), limit(12));
      } else {
        if (!lastDoc) return;
        q = query(productsRef, orderBy('name'), startAfter(lastDoc), limit(12));
      }

      const snapshot = await getDocs(q);
      const fetchedProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts((prev) =>
        initial ? fetchedProducts : [...prev, ...fetchedProducts]
      );
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 12);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  }, [loading, lastDoc, hasMore]);

  const lastProductRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchProducts(false);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, fetchProducts]
  );

  useEffect(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  if (isMobile) {
    return <HomeMobile />;
  }

  // ... (rest of the desktop component)
};

export default Home;