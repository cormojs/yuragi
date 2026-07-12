import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ConfigProvider } from "antd";
import "antd/dist/reset.css";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root");

if (root == null) {
  throw new Error("Root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <ConfigProvider theme={{ token: { colorPrimary: "#1f7a5c" } }}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
);
