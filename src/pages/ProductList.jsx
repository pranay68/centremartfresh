import React, { useEffect, useState } from "react";
<<<<<<< HEAD
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import ProductCard from "../components/ProductGrid/ProductCard";
import ProductDetailPanel from "../components/ProductDetailPanel";
=======
import { collection, getDocs, query, limit, startAfter } from "firebase/firestore";
import { db } from "../firebase/config";
import ProductCard from "../components/ProductCard";
import ProductPanel from "../components/ProductPanel";
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
<<<<<<< HEAD

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item && item.id && item.name); // Filter out invalid products
      setProducts(items);
    });
    return () => unsubscribe();
  }, []);

=======
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchProducts(true);
    // eslint-disable-next-line
  }, []);

  const fetchProducts = async (initial = false) => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      let q;
      const productsRef = collection(db, "products");
      if (initial) {
        q = query(productsRef, limit(15));
      } else if (lastDoc) {
        q = query(productsRef, startAfter(lastDoc), limit(10));
      } else {
        setLoading(false);
        return;
      }
      const snapshot = await getDocs(q);
      const newProducts = [];
      let lastVisible = null;
      snapshot.forEach((doc) => {
        newProducts.push({ id: doc.id, ...doc.data() });
        lastVisible = doc;
      });
      if (initial) {
        setProducts(newProducts);
      } else {
        setProducts((prev) => [...prev, ...newProducts]);
      }
      setLastDoc(lastVisible);
      setHasMore(newProducts.length >= (initial ? 15 : 10));
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll handler
  useEffect(() => {
    if (!hasMore || loading) return;
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        fetchProducts(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, lastDoc]);

>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
  return (
    <div style={{ padding: "20px" }}>
      <h2>All Products 🛍️</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {products.map((product) => (
          <div key={product.id} onClick={() => setSelectedProduct(product)} style={{ cursor: "pointer" }}>
<<<<<<< HEAD
            <ProductCard product={product} compact={true} />
=======
            <ProductCard product={product} />
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
          </div>
        ))}
      </div>

      {selectedProduct && (
<<<<<<< HEAD
        <ProductDetailPanel
=======
        <ProductPanel
>>>>>>> fe18f97f0bc70af05074cbfefd57cf9626683a1d
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default ProductList;
