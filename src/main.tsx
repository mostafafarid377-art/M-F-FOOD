import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/router";
import "./index.css";

const rootElement = document.getElementById("root") as HTMLElement | null;
ReactDOM.createRoot(rootElement!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);