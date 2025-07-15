import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import ProductCard from "../components/ProductCard";
import ProductPanel from "../components/ProductPanel";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, "products"));
      const items = [];
      querySnapshot.forEach((doc) =>
        items.push({ id: doc.id, ...doc.data() })
      );
      setProducts(items);
    };

    fetchProducts();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>All Products 🛍️</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {products.map((product) => (
          <div key={product.id} onClick={() => setSelectedProduct(product)} style={{ cursor: "pointer" }}>
            <ProductCard product={product} />
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
