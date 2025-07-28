import React, { useState } from "react";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Ready");

  // Fill form on current page
  const handleFillForm = async () => {
    try {
      setStatus("Filling form...");

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "fillForm",
      });

      if (response && response.success) {
        setStatus("Form filled!");
        setTimeout(() => setStatus("Ready"), 2000);
      } else {
        setStatus("No forms found");
        setTimeout(() => setStatus("Ready"), 2000);
      }
    } catch (error) {
      console.error("Error filling form:", error);
      setStatus("Error occurred");
      setTimeout(() => setStatus("Ready"), 2000);
    }
  };

  // Open floating form editor
  const handleOpenFormEditor = async () => {
    try {
      setStatus("Opening editor...");

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "openFormEditor",
      });

      if (response && response.success) {
        setStatus("Editor opened!");
        setTimeout(() => setStatus("Ready"), 2000);
      } else {
        setStatus("Error opening editor");
        setTimeout(() => setStatus("Ready"), 2000);
      }
    } catch (error) {
      console.error("Error opening form editor:", error);
      setStatus("Error occurred");
      setTimeout(() => setStatus("Ready"), 2000);
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>Form AutoFill</h1>
        <p className="subtitle">Smart form filling</p>
      </div>

      <div className="content">
        <div className="button-group">
          <button className="btn btn-primary" onClick={handleFillForm}>
            Fill Now
          </button>
          <button className="btn btn-secondary" onClick={handleOpenFormEditor}>
            Form Data
          </button>
        </div>

        <div className="status">{status}</div>
      </div>
    </div>
  );
}

export default App;
