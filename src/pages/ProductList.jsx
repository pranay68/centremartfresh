import React, { useEffect, useState } from "react";
import { getAllProducts } from '../utils/productData';
import ProductCard from "../components/ProductCard";
import ProductPanel from "../components/ProductPanel";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const items = getAllProducts();
    setProducts(items);
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>All Products 🛍️</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {products.map((product) => (
          <div key={product.id} onClick={() => setSelectedProduct(product)} style={{ cursor: "pointer" }}>
            <ProductCard product={product} compact={true} />
          </div>
        ))}
      </div>

      {selectedProduct && (
        <ProductPanel
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default ProductList;
