console.log("Job Application Content Script loaded");

function extractFormFields() {
  const fields = [];
  const fieldMap = {}; // id -> DOM element

  document.querySelectorAll("input, select, textarea").forEach((el, index) => {
    const id = el.id || el.name || `field_${index}`;
    const label = document.querySelector(`label[for='${el.id}']`);
    const labelText = label?.innerText || "";
    const placeholder = el.placeholder || "";
    const surroundingText =
      el.closest("form")?.innerText.slice(0, 500) ||
      document.body.innerText.slice(0, 500);

    fields.push({ id, labelText, placeholder, surroundingText });
    fieldMap[id] = el;
  });

  return { fields, fieldMap };
}

// Send fields + existing user data to LLM backend
async function requestLLMMappings(fields, storedData) {
  try {
    // const res = await fetch("http://localhost:5001/autofill-map", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ fields, userData: storedData }),
    // });
    const res = await fetch(
      "https://job-fill-backend.onrender.com/autofill-map",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, userData: storedData }),
      }
    );
    const { mappings } = await res.json();
    return mappings; // [{ fieldId, value }]
  } catch (err) {
    console.error("LLM autofill failed:", err);
    return [];
  }
}

// Listen for user input and learn new field values
function setupFieldLearning(fieldMap) {
  // Get the latest formData from storage
  chrome.storage.local.get("formData", (result) => {
    const formData = result.formData || {};
    Object.entries(fieldMap).forEach(([fieldId, el]) => {
      // Listen for user input
      el.addEventListener("change", () => {
        const value =
          el.type === "checkbox" || el.type === "radio" ? el.checked : el.value;
        // If this field is not in formData or value is different, update storage
        if (!(fieldId in formData) || formData[fieldId] !== value) {
          const newFormData = { ...formData, [fieldId]: value };
          chrome.storage.local.set({ formData: newFormData });
        }
      });
    });
  });
}

// Main fill function
async function fillFormFieldsSmart() {
  const { fields, fieldMap } = extractFormFields();

  const result = await chrome.storage.local.get("formData");
  const formData = result.formData || {};

  // Filter fields that are not already filled
  const unfilledFields = fields.filter((f) => {
    const val = formData[f.id];
    return val === undefined || val === "";
  });

  const mappings = await requestLLMMappings(unfilledFields, formData);

  // Fill the form fields
  for (const { fieldId, value } of mappings) {
    const el = fieldMap[fieldId];
    if (!el) continue;

    if (el.type === "checkbox" || el.type === "radio") {
      el.checked = value === true || value === "true";
    } else {
      el.value = value;
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Set up learning for user input (do not update formData here)
  setupFieldLearning(fieldMap);

  // Optional feedback
  chrome.runtime.sendMessage({
    action: "showFeedback",
    message: "Form filled!",
  });
}

// Export for popup
window.fillFormFieldsSmart = fillFormFieldsSmart;

function showFloatingFormEditor() {
  // Prevent multiple editors
  if (document.getElementById("floating-form-editor")) return;

  // Create style element for form CSS
  const style = document.createElement("style");
  style.textContent = `
  #floating-form-editor {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 99999;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.2);
    padding: 0;
    max-width: 700px;
    width: 95vw;
    max-height: 90vh;
    overflow-y: auto;
  }
  .job-app-form {
    padding: 32px 24px 24px 24px;
  }
  .job-app-form h2 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 1.5rem;
  }
  .accordion-section {
    margin-bottom: 18px;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    background: #fafbfc;
    overflow: hidden;
  }
  .accordion-section summary {
    font-weight: bold;
    font-size: 1.1rem;
    padding: 12px 16px;
    cursor: pointer;
    outline: none;
    background: #f0f2f5;
    border-bottom: 1px solid #e0e0e0;
  }
  .accordion-section[open] summary {
    background: #e6f0fa;
  }
  .accordion-content {
    padding: 18px 16px 8px 16px;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }
  @media (max-width: 768px) {
    .form-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 480px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }
  .form-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;
  }
  .form-group label {
    margin-bottom: 6px;
    font-weight: 500;
    font-size: 0.98rem;
  }
  /* Highlight required fields that are invalid */
  .job-app-form input:invalid,
  .job-app-form select:invalid,
  .job-app-form textarea:invalid {
    border: 2px solid #e53935;
    background: #fff5f5;
  }
  /* Red asterisk for required fields */
  .job-app-form .form-group label.required::after {
    content: " *";
    color: #e53935;
    font-weight: bold;
  }
  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 8px;
    border: 1px solid #bdbdbd;
    border-radius: 5px;
    font-size: 1rem;
    background: #fff;
    resize: vertical;
  }
  .form-group textarea {
    min-height: 60px;
    max-height: 180px;
  }
  .multi-entry-list {
    margin: 0 0 8px 0;
    padding: 0;
    list-style: none;
  }
  .multi-entry-list li {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
  }
  .multi-entry-list input {
    flex: 1;
    margin-right: 8px;
  }
  .add-entry-btn, .remove-entry-btn {
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 4px 10px;
    margin-left: 2px;
    cursor: pointer;
    font-size: 0.95rem;
  }
  .remove-entry-btn {
    background: #e53935;
  }
  .form-actions {
    text-align: right;
    margin-top: 18px;
  }
  .form-actions button {
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 5px;
    padding: 8px 18px;
    font-size: 1rem;
    margin-left: 8px;
    cursor: pointer;
  }
  .form-actions .close-btn {
    background: #bdbdbd;
    color: #222;
  }
  `;
  document.head.appendChild(style);

  // Modal container
  const editor = document.createElement("div");
  editor.id = "floating-form-editor";

  // HTML for the form
  editor.innerHTML = `
    <form class="job-app-form" id="job-app-form">
      <h2>Job Application Form</h2>
      <details class="accordion-section" open>
        <summary>1. Personal Information</summary>
        <div class="accordion-content form-grid">
          <div class="form-group"><label for="firstName" class="required">First Name</label><input id="firstName" name="firstName" type="text" required></div>
          <div class="form-group"><label for="lastName" class="required">Last Name</label><input id="lastName" name="lastName" type="text" required></div>
          <div class="form-group"><label for="phoneNumber" class="required">Phone Number</label><input id="phoneNumber" name="phoneNumber" type="text" required></div>
          <div class="form-group"><label for="email" class="required">Email Address</label><input id="email" name="email" type="email" required></div>
          <div class="form-group"><label for="address">Home Address</label><input id="address" name="address" type="text"></div>
          <div class="form-group"><label for="contactMethod">Preferred Contact Method</label><select id="contactMethod" name="contactMethod"><option>Email</option><option>Phone</option></select></div>
          <div class="form-group"><label for="workEligibility">Eligibility to Work in the Country</label><input id="workEligibility" name="workEligibility" type="text"></div>
          <div class="form-group"><label for="jobTitle">Desired Job Title / Position Applied For</label><input id="jobTitle" name="jobTitle" type="text"></div>
        </div>
      </details>
      <details class="accordion-section">
        <summary>2. Work Authorization</summary>
        <div class="accordion-content form-grid">
          <div class="form-group"><label for="citizenship">Citizenship or Legal Right to Work</label><input id="citizenship" name="citizenship" type="text"></div>
          <div class="form-group"><label for="relocate">Willingness to Relocate</label><select id="relocate" name="relocate"><option>Yes</option><option>No</option></select></div>
          <div class="form-group"><label for="travel">Willingness to Travel</label><select id="travel" name="travel"><option>Yes</option><option>No</option></select></div>
        </div>
      </details>
      <details class="accordion-section">
        <summary>3. Employment History</summary>
        <div class="accordion-content form-grid">
          <div class="form-group"><label for="companyName">Company Name</label><input id="companyName" name="companyName" type="text"></div>
          <div class="form-group"><label for="jobTitleHistory">Job Title</label><input id="jobTitleHistory" name="jobTitleHistory" type="text"></div>
          <div class="form-group"><label for="startDate">Start Date</label><input id="startDate" name="startDate" type="date"></div>
          <div class="form-group"><label for="endDate">End Date</label><input id="endDate" name="endDate" type="date"></div>
          <div class="form-group" style="grid-column: 1 / -1;"><label for="jobDuties">Job Responsibilities / Duties</label><textarea id="jobDuties" name="jobDuties"></textarea></div>
          <div class="form-group" style="grid-column: 1 / -1;"><label for="reasonLeaving">Reason for Leaving</label><textarea id="reasonLeaving" name="reasonLeaving"></textarea></div>
          <div class="form-group"><label for="supervisor">Supervisor's Name and Contact Information</label><input id="supervisor" name="supervisor" type="text"></div>
          <div class="form-group"><label for="contactPrevEmployer">Permission to Contact Previous Employer</label><select id="contactPrevEmployer" name="contactPrevEmployer"><option>Yes</option><option>No</option></select></div>
        </div>
      </details>
      <details class="accordion-section">
        <summary>4. Education</summary>
        <div class="accordion-content form-grid">
          <div class="form-group"><label for="schoolName">School/Institution Name</label><input id="schoolName" name="schoolName" type="text"></div>
          <div class="form-group"><label for="degree">Degree or Certification</label><input id="degree" name="degree" type="text"></div>
          <div class="form-group"><label for="fieldOfStudy">Field of Study</label><input id="fieldOfStudy" name="fieldOfStudy" type="text"></div>
          <div class="form-group"><label for="graduationYear">Graduation Year</label><input id="graduationYear" name="graduationYear" type="text"></div>
          <div class="form-group"><label for="gpa">GPA (optional)</label><input id="gpa" name="gpa" type="number" step="any"></div>
        </div>
      </details>
      <details class="accordion-section">
        <summary>5. Skills and Qualifications</summary>
        <div class="accordion-content">
          <div class="form-group"><label>Technical Skills</label><ul class="multi-entry-list" id="skills-list"></ul><button type="button" class="add-entry-btn" id="add-skill">Add Skill</button></div>
          <div class="form-group"><label>Languages Spoken/Written</label><ul class="multi-entry-list" id="languages-list"></ul><button type="button" class="add-entry-btn" id="add-language">Add Language</button></div>
          <div class="form-group"><label>Certifications or Licenses</label><ul class="multi-entry-list" id="certifications-list"></ul><button type="button" class="add-entry-btn" id="add-certification">Add Certification</button></div>
          <div class="form-group"><label>Relevant Training or Workshops</label><ul class="multi-entry-list" id="training-list"></ul><button type="button" class="add-entry-btn" id="add-training">Add Training</button></div>
        </div>
      </details>
      <details class="accordion-section">
        <summary>6. References</summary>
        <div class="accordion-content form-grid">
          <div class="form-group"><label for="ref1Name">Reference 1: Full Name</label><input id="ref1Name" name="ref1Name" type="text"></div>
          <div class="form-group"><label for="ref1Contact">Reference 1: Contact Information</label><input id="ref1Contact" name="ref1Contact" type="text"></div>
          <div class="form-group"><label for="ref1Relationship">Reference 1: Relationship to Reference</label><input id="ref1Relationship" name="ref1Relationship" type="text"></div>
          <div class="form-group"><label for="ref2Name">Reference 2: Full Name</label><input id="ref2Name" name="ref2Name" type="text"></div>
          <div class="form-group"><label for="ref2Contact">Reference 2: Contact Information</label><input id="ref2Contact" name="ref2Contact" type="text"></div>
          <div class="form-group"><label for="ref2Relationship">Reference 2: Relationship to Reference</label><input id="ref2Relationship" name="ref2Relationship" type="text"></div>
          <div class="form-group"><label for="contactReference">Permission to Contact References</label><select id="contactReference" name="contactReference"><option>Yes</option><option>No</option></select></div>
        </div>
      </details>
      <details class="accordion-section">
        <summary>7. Availability</summary>
        <div class="accordion-content form-grid">
          <div class="form-group"><label for="startDate">Earliest Start Date</label><input id="startDate" name="startDate" type="date"></div>
          <div class="form-group"><label for="availability">Availability</label><select id="availability" name="availability" multiple><option>Full-time</option><option>Part-time</option><option>Shifts</option></select></div>
          <div class="form-group"><label for="schedule">Preferred Schedule</label><select id="schedule" name="schedule" multiple><option>Days</option><option>Evenings</option><option>Weekends</option></select></div>
        </div>
      </details>
      <details class="accordion-section">
        <summary>8. Resume and Cover Letter Upload</summary>
        <div class="accordion-content form-grid">
          <div class="form-group"><label for="resume">Resume (File Upload)</label><input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx,.txt"></div>
          <div class="form-group"><label for="coverLetter">Cover Letter (Optional, File Upload)</label><input id="coverLetter" name="coverLetter" type="file" accept=".pdf,.doc,.docx,.txt"></div>
        </div>
      </details>
      <div class="form-actions">
        <button type="submit">Save</button>
        <button type="button" class="close-btn" id="form-data-editor-close">Close</button>
      </div>
    </form>
  `;

  document.body.appendChild(editor);

  // Helper for multi-entry fields
  function setupMultiEntry(listId, addBtnId, fieldName) {
    const list = document.getElementById(listId);
    const addBtn = document.getElementById(addBtnId);
    function addEntry(value = "") {
      const li = document.createElement("li");
      const input = document.createElement("input");
      input.type = "text";
      input.value = value;
      input.name = fieldName;
      input.required = false;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-entry-btn";
      removeBtn.textContent = "Remove";
      removeBtn.onclick = () => li.remove();
      li.appendChild(input);
      li.appendChild(removeBtn);
      list.appendChild(li);
    }
    addBtn.onclick = () => addEntry();
    return addEntry;
  }

  // Setup multi-entry fields
  const addSkill = setupMultiEntry("skills-list", "add-skill", "skills");
  const addLanguage = setupMultiEntry(
    "languages-list",
    "add-language",
    "languages"
  );
  const addCertification = setupMultiEntry(
    "certifications-list",
    "add-certification",
    "certifications"
  );
  const addTraining = setupMultiEntry(
    "training-list",
    "add-training",
    "training"
  );

  // Load existing data
  chrome.storage.local.get("formData", (result) => {
    const data = result.formData || {};
    const form = document.getElementById("job-app-form");
    if (!form) return;
    // Simple fields
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === "file") continue;
      if (el.type === "select-multiple" && Array.isArray(data[el.name])) {
        for (const option of el.options) {
          option.selected = data[el.name].includes(option.value);
        }
      } else if (el.type !== "select-multiple" && data[el.name]) {
        el.value = data[el.name];
      }
    }
    // Multi-entry fields
    if (Array.isArray(data.skills)) data.skills.forEach(addSkill);
    if (Array.isArray(data.languages)) data.languages.forEach(addLanguage);
    if (Array.isArray(data.certifications))
      data.certifications.forEach(addCertification);
    if (Array.isArray(data.training)) data.training.forEach(addTraining);
  });

  // Save handler
  document.getElementById("job-app-form").onsubmit = async (e) => {
    // Find the first invalid field
    const form = document.getElementById("job-app-form");
    const firstInvalid = form.querySelector(":invalid");
    if (firstInvalid) {
      // Find the closest <details> ancestor and open it
      const details = firstInvalid.closest("details");
      if (details && !details.open) {
        details.open = true;
        // Optionally, scroll to the invalid field
        setTimeout(() => firstInvalid.focus(), 100);
      }
      // Let the browser show its validation message
      e.preventDefault();
      return false;
    }
    e.preventDefault();
    const formData = {};
    // Collect all form fields
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === "file") {
        if (el.files && el.files[0]) {
          // Read file as base64
          const file = el.files[0];
          formData[el.name] = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        } else {
          formData[el.name] = null;
        }
      } else if (el.type === "select-multiple") {
        formData[el.name] = Array.from(el.selectedOptions).map(
          (opt) => opt.value
        );
      } else if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked) formData[el.name] = el.value;
      } else if (
        ["skills", "languages", "certifications", "training"].includes(el.name)
      ) {
        // Handled below
      } else {
        formData[el.name] = el.value;
      }
    }
    // Multi-entry fields
    formData.skills = Array.from(
      document.querySelectorAll("#skills-list input")
    )
      .map((i) => i.value)
      .filter(Boolean);
    formData.languages = Array.from(
      document.querySelectorAll("#languages-list input")
    )
      .map((i) => i.value)
      .filter(Boolean);
    formData.certifications = Array.from(
      document.querySelectorAll("#certifications-list input")
    )
      .map((i) => i.value)
      .filter(Boolean);
    formData.training = Array.from(
      document.querySelectorAll("#training-list input")
    )
      .map((i) => i.value)
      .filter(Boolean);
    // Debug log
    console.log("Saving form data:", formData);
    chrome.storage.local.set({ formData }, () => {
      alert("Saved!");
    });
  };

  // Close handler
  document.getElementById("form-data-editor-close").onclick = () => {
    editor.remove();
    style.remove();
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.action === "fillForm") {
    fillFormFieldsSmart()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates async response
  }

  // Handler for opening the form editor
  if (request.action === "openFormEditor") {
    showFloatingFormEditor();
    sendResponse({ success: true });
    return true;
  }
});
