// src/index.js

import React from "react";
import { createRoot } from "react-dom/client";
import TempApp from "./TempApp";
import "./index.css"; // Optional: if you plan to use global styles

// Grab the root div from public/index.html
const container = document.getElementById("root");

// Create root (React 18+ style)
const root = createRoot(container);

// Proper JSX formatting here ⬇️
root.render(
  <React.StrictMode>
    <TempApp />
  </React.StrictMode>
);
