import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import CategoryPage from './pages/CategoryPage';
import Orders from './pages/Orders';
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
        /> < /
        Routes > <
        ReviewModal / >
        <
        /> < /
        Router > <
        /CartProvider> < /
        div >
    );
}

export default App;