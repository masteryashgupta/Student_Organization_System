import { useState } from "react";

export default function Merch() {
  const [bagCount, setBagCount] = useState(0);
  const [activeItem, setActiveItem] = useState(null);
  const [orderedModal, setOrderedModal] = useState(null);

  const products = [
    {
      id: 1,
      name: "Skyline Varsity Jacket",
      variant: "Navy / Gold",
      price: 1299,
      image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80",
      inStock: true,
    },
    {
      id: 2,
      name: "Everyday Campus Tee",
      variant: "Cobalt Blue",
      price: 499,
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
      inStock: true,
    },
    {
      id: 3,
      name: "Canvas Field Tote",
      variant: "Natural / Blue",
      price: 349,
      image: "https://images.unsplash.com/photo-1597484662317-9bd7bdda2907?w=600&auto=format&fit=crop&q=80",
      inStock: true,
    },
    {
      id: 4,
      name: "Steel Water Bottle",
      variant: "Matte White",
      price: 599,
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
      inStock: true,
    },
  ];

  const handleAddToCart = (product) => {
    setBagCount((prev) => prev + 1);
    setOrderedModal(product);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="section-tag">The Skyline Shop</div>
          <h1 className="page-title">Wear what you’re building.</h1>
          <p className="page-subtitle">
            Limited campus essentials for members, makers, and late-night idea people.
          </p>
        </div>

        <button
          className="btn-primary"
          style={{ background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" }}
          onClick={() => alert(`Your shopping bag has ${bagCount} item(s).`)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
            <path d="M3 6h18"></path>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span>Bag ({bagCount})</span>
        </button>
      </div>

      {/* Member Perk Banner */}
      <div className="merch-perk-banner">
        <div>
          <div className="perk-pill">Member Perk</div>
          <h3>15% off, always.</h3>
          <p>Your Premium membership discount is applied automatically at checkout.</p>
        </div>

        {/* Isometric 3D wireframe cube SVG */}
        <svg
          className="perk-cube-icon"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="50,15 85,35 50,55 15,35" />
          <polygon points="15,35 50,55 50,90 15,70" />
          <polygon points="85,35 50,55 50,90 85,70" />
        </svg>
      </div>

      {/* Products Grid */}
      <div className="merch-grid">
        {products.map((item) => (
          <div
            key={item.id}
            className="merch-card"
            onClick={() => handleAddToCart(item)}
            style={{ cursor: "pointer" }}
          >
            <div className="merch-media">
              <img src={item.image} alt={item.name} />
              {item.inStock && <span className="stock-tag">In stock</span>}
            </div>

            <div className="merch-info">
              <div className="merch-meta">
                <div className="merch-title">{item.name}</div>
                <div className="merch-variants">{item.variant}</div>
              </div>
              <div className="merch-price">₹{item.price}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Added to Bag Modal */}
      {orderedModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 100, padding: 20
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, maxWidth: 380, width: "100%",
            padding: 24, textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
          }}>
            <div style={{
              width: 50, height: 50, background: "#eff6ff", color: "#2563eb",
              borderRadius: "50%", margin: "0 auto 14px", display: "flex",
              alignItems: "center", justifyContent: "center"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                <path d="M3 6h18"></path>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>

            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 6 }}>
              Added to Bag!
            </h3>
            <p style={{ fontSize: "0.86rem", color: "#64748b", marginBottom: 16 }}>
              <strong>{orderedModal.name}</strong> ({orderedModal.variant}) added with your 15% discount applied.
            </p>

            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#f8fafc", padding: "12px 16px", borderRadius: 10, marginBottom: 18
            }}>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Member Price:</span>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                ₹{Math.round(orderedModal.price * 0.85)}
              </span>
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setOrderedModal(null)}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
