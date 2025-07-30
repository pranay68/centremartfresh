import React, { useState } from 'react';
import { useCart } from '../context/CartContext'; // The proper way to grab cart stuff now
import './CheckoutForm.css';

const CheckoutForm = () => {
  const { cartItems, clearCart, getTotal } = useCart(); // Hook magic doing the heavy lifting

  const [form, setForm] = useState({
    name: '',
    number: '',
    address: '',
    addressDetails: '',
    email: '',
  });

  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name || !form.address || !form.email || !form.number) {
      alert('Bro fill the fields... we don’t ship to ghosts 🧟‍♂️');
      return;
    }

    // Fake payment simulation — intergalactic delivery style
    console.log('Order placed:', {
      customer: form,
      items: cartItems,
      total: getTotal(),
    });

    setSuccess(true);
    clearCart();
  };

  if (success) {
    return (
      <div className="checkout-success">
        <h2>🔥 Order Confirmed!</h2>
        <p>Thanks, {form.name}! Your intergalactic package is on the way 🚀📦</p>
      </div>
    );
  }

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      <h2>🧾 Checkout</h2>

      <label>
        Name:
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Phone Number:
        <input
          type="tel"
          name="number"
          value={form.number}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Address:
        <textarea
          name="address"
          value={form.address}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Address Details (optional):
        <textarea
          name="addressDetails"
          value={form.addressDetails}
          onChange={handleChange}
          placeholder="Landmark, instructions, etc."
        />
      </label>

      <label>
        Email:
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </label>

      <h3>Total: ₹{getTotal()}</h3>

      <button type="submit">💥 Place Order</button>
    </form>
  );
};

export default CheckoutForm;
