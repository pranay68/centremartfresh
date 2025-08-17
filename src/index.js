// src/index.js

import React from "react";
import { createRoot } from "react-dom/client";
import TempApp from "./TempApp";
import ErrorBoundary from './components/ErrorBoundary';
import initGlobalErrorLogger from './utils/globalErrorLogger';
import "./index.css"; // Optional: if you plan to use global styles

// Grab the root div from public/index.html
const container = document.getElementById("root");

// Create root (React 18+ style)
const root = createRoot(container);

// Proper JSX formatting here ⬇️
root.render( <
    React.StrictMode >
    <
    ErrorBoundary >
    <
    TempApp / >
    <
    /ErrorBoundary> < /
    React.StrictMode >
);

// Initialize global error logger (captures window errors & promise rejections)
if (typeof window !== 'undefined') {
    try { initGlobalErrorLogger(); } catch (e) { /* ignore logger init errors */ }
}