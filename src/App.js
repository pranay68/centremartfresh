import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import CategoryPage from './pages/CategoryPage';
import Orders from './pages/Orders';
import NewArrivals from './pages/NewArrivals';
import TopSellers from './pages/TopSellers';
import FlashSale from './pages/FlashSale';
import SearchResults from './pages/SearchResults';
import { CartProvider } from './context/CartContext';
import './App.css';
import ReviewModal from './components/ReviewModal';

function App() {
    return ( <
        div className = "App"
        style = {
            { backgroundColor: 'white', minHeight: '100vh' }
        } >
        <
        CartProvider >
        <
        Router >
        <
        >
        <
        Routes >
        <
        Route path = "/"
        element = { < Home / > }
        /> <
        Route path = "/product/:id"
        element = { < ProductDetail / > }
        /> <
        Route path = "/cart"
        element = { < Cart / > }
        /> <
        Route path = "/category/:category"
        element = { < CategoryPage / > }
        /> <
        Route path = "/orders"
        element = { < Orders / > }
        /> <
        Route path = "/new-arrivals"
        element = { < NewArrivals / > }
        /> <
        Route path = "/top-sellers"
        element = { < TopSellers / > }
        /> <
        Route path = "/flash-sale"
        element = { < FlashSale / > }
        /> <
        Route path = "/search"
        element = { < SearchResults / > }
        /> < /
        Routes > <
        ReviewModal / >
        <
        /Router> < /
        CartProvider > <
        /div>
    );
}

export default App;