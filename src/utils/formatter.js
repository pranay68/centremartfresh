export const formatPrice = (price) =>
    `₹${price.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;