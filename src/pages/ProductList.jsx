import React, { useEffect, useState } from "react";
import publicProducts from '../utils/publicProducts';
import ProductCard from "../components/ProductGrid/ProductCard";
import ProductDetailPanel from "../components/ProductDetailPanel";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 200;
  const [total, setTotal] = useState(0);

  const loadPage = async (pageIndex = 0) => {
    setLoading(true);
    try {
      const start = pageIndex * PAGE_SIZE;
      // Ensure public snapshot loaded
      await publicProducts.ensureLoaded();
      const chunk = publicProducts.getChunk(start, PAGE_SIZE);
      setProducts(chunk || []);
      const cnt = publicProducts.getTotalCount();
      setTotal(cnt || 0);
      setPage(pageIndex);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('ProductList load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage(0);
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>All Products 🛍️</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {loading ? (
          <div style={{ padding: 20 }}>Loading...</div>
        ) : (
          products.map((product) => (
            <div key={product.id} onClick={() => setSelectedProduct(product)} style={{ cursor: "pointer" }}>
              <ProductCard product={product} compact={true} />
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 18, alignItems: 'center' }}>
        <button onClick={() => loadPage(Math.max(0, page - 1))} disabled={page === 0}>Prev</button>
        <span>Page {page + 1} · Showing {products.length} of {total}</span>
        <button onClick={() => loadPage(page + 1)} disabled={(page + 1) * PAGE_SIZE >= (total || Infinity)}>Next</button>
        <button onClick={() => loadPage(0)}>First</button>
      </div>

      {selectedProduct && (
        <ProductDetailPanel
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default ProductList;
