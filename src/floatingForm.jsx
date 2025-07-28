import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

function FloatingForm({ onSave, onClose, initialData = {} }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    resumePath: "",
    ...initialData,
  });
  const [fieldMeta, setFieldMeta] = useState({});
  const [status, setStatus] = useState("");

  // Load form data and field metadata on mount
  useEffect(() => {
    const loadFormData = async () => {
      try {
        const result = await chrome.storage.local.get(["formProfiles"]);
        // Use a single set of data for all forms
        const data = result.formProfiles || {};
        setFormData((prev) => ({ ...prev, ...(data.values || data) }));
        setFieldMeta(data.fields || {});
      } catch (error) {
        console.error("Error loading form data:", error);
      }
    };
    loadFormData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Save both values and field metadata
  const handleSave = async () => {
    try {
      // Save both values and fields (metadata) to a single object
      const data = {
        values: formData,
        fields: fieldMeta,
      };
      await chrome.storage.local.set({ formProfiles: data });
      setStatus("Saved successfully!");
      setTimeout(() => {
        onSave(formData);
      }, 1000);
    } catch (error) {
      console.error("Error saving form data:", error);
      setStatus("Error saving data");
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Render a field based on its metadata
  const renderDynamicField = (key, value) => {
    // Skip known static fields
    if (["name", "email", "phone", "address", "resumePath"].includes(key))
      return null;
    const meta = fieldMeta[key] || {};
    if (meta.type === "date") {
      return (
        <div key={key} className="field-group">
          <label htmlFor={key}>
            {key.charAt(0).toUpperCase() + key.slice(1)}:
          </label>
          <input
            id={key}
            type="date"
            value={value || ""}
            onChange={(e) => handleInputChange(key, e.target.value)}
            placeholder={`Enter your ${key}`}
          />
        </div>
      );
    } else if (meta.type === "select" && Array.isArray(meta.options)) {
      return (
        <div key={key} className="field-group">
          <label htmlFor={key}>
            {key.charAt(0).toUpperCase() + key.slice(1)}:
          </label>
          <select
            id={key}
            value={value || ""}
            onChange={(e) => handleInputChange(key, e.target.value)}
          >
            <option value="">Select {key}</option>
            {meta.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    } else {
      // fallback to text
      return (
        <div key={key} className="field-group">
          <label htmlFor={key}>
            {key.charAt(0).toUpperCase() + key.slice(1)}:
          </label>
          <input
            id={key}
            type="text"
            value={value || ""}
            onChange={(e) => handleInputChange(key, e.target.value)}
            placeholder={`Enter your ${key}`}
          />
        </div>
      );
    }
  };

  return (
    <div className="floating-form-overlay">
      <div className="floating-form">
        <div className="floating-form-header">
          <h3>Form Data Editor</h3>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="floating-form-content">
          {/* Form Fields */}
          <div className="field-group">
            <label htmlFor="name">Name:</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="field-group">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div className="field-group">
            <label htmlFor="phone">Phone:</label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="Enter your phone"
            />
          </div>

          <div className="field-group">
            <label htmlFor="address">Address:</label>
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter your address"
            />
          </div>

          <div className="field-group">
            <label htmlFor="resumePath">Resume Path:</label>
            <input
              id="resumePath"
              type="text"
              value={formData.resumePath}
              onChange={(e) => handleInputChange("resumePath", e.target.value)}
              placeholder="Path to resume file"
            />
          </div>

          {/* Dynamic fields from learned data */}
          {Object.entries(formData).map(([key, value]) =>
            renderDynamicField(key, value)
          )}
        </div>

        <div className="floating-form-footer">
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
          <button className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
        </div>

        {status && <div className="status-message">{status}</div>}
      </div>
    </div>
  );
}

// Function to inject the floating form
export function injectFloatingForm(onSave, onClose, initialData) {
  // Remove any existing floating form
  const existingForm = document.getElementById("floating-form-container");
  if (existingForm) {
    existingForm.remove();
  }

  // Create container
  const container = document.createElement("div");
  container.id = "floating-form-container";
  document.body.appendChild(container);

  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    .floating-form-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    }

    .floating-form {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    }

    .floating-form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 20px 0;
      border-bottom: 1px solid #e1e5e9;
      margin-bottom: 20px;
    }

    .floating-form-header h3 {
      margin: 0;
      color: #333;
      font-size: 18px;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .close-btn:hover {
      background: #f5f5f5;
    }

    .floating-form-content {
      padding: 0 20px;
    }

    .field-group {
      margin-bottom: 15px;
    }

    .field-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .field-group input,
    .field-group textarea,
    .field-group select {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #e1e5e9;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }

    .field-group input:focus,
    .field-group textarea:focus,
    .field-group select:focus {
      outline: none;
      border-color: #667eea;
    }

    .field-group textarea {
      resize: vertical;
      min-height: 60px;
    }

    .floating-form-footer {
      display: flex;
      gap: 10px;
      padding: 20px;
      border-top: 1px solid #e1e5e9;
      margin-top: 20px;
    }

    .btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5a6fd8;
    }

    .btn-secondary {
      background: #f8f9fa;
      color: #333;
      border: 1px solid #e1e5e9;
    }

    .btn-secondary:hover {
      background: #e9ecef;
    }

    .status-message {
      padding: 10px 20px;
      margin: 0 20px 20px;
      border-radius: 6px;
      text-align: center;
      font-size: 14px;
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
  `;
  document.head.appendChild(style);

  // Render the form
  ReactDOM.render(
    <FloatingForm
      onSave={onSave}
      onClose={onClose}
      initialData={initialData}
    />,
    container
  );

  return container;
}

export default FloatingForm;
