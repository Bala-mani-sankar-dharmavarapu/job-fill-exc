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
          <div class="form-group"><label for="state">State</label><input id="state" name="state" type="text"></div>
          <div class="form-group"><label for="postalCode">Postal Code</label><input id="postalCode" name="postalCode" type="text"></div>
          <div class="form-group"><label for="country">Country</label><input id="country" name="country" type="text"></div>
          <div class="form-group"><label for="phoneDeviceType">Phone Device Type</label><select id="phoneDeviceType" name="phoneDeviceType"><option>Mobile</option><option>Landline</option><option>Other</option></select></div>
          <div class="form-group"><label for="password">Password</label><input id="password" name="password" type="password"></div>
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
          <div class="form-group"><label for="voluntaryDisclosures">Voluntary Disclosures</label><textarea id="voluntaryDisclosures" name="voluntaryDisclosures"></textarea></div>
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
          <div class="form-group"><label for="salaryRange">Salary Range</label><input id="salaryRange" name="salaryRange" type="text" placeholder="e.g. 50000-70000"></div>
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
          <div class="form-group"><label for="applicationQuestion">Application Question</label><textarea id="applicationQuestion" name="applicationQuestion"></textarea></div>
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
  chrome.storage.local.get("formData", (storageResult) => {
    const data = storageResult.formData || {};
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

// Extract job description from the current page
function extractJobDescription() {
  // Common selectors for job descriptions
  const selectors = [
    '[class*="job-description"]',
    '[class*="description"]',
    '[id*="job-description"]',
    '[id*="description"]',
    "article",
    ".job-description",
    ".description",
    "#job-description",
    "#description",
    '[data-testid*="job-description"]',
    '[data-testid*="description"]',
  ];

  let jobDescription = "";

  // Try to find job description using selectors
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent.trim();
      if (text.length > 100 && text.length < 10000) {
        // Reasonable length for job description
        jobDescription = text;
        break;
      }
    }
    if (jobDescription) break;
  }

  // If no specific job description found, try to extract from page content
  if (!jobDescription) {
    const bodyText = document.body.textContent;
    const sentences = bodyText
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 20);

    // Look for sentences that might be job requirements or descriptions
    const jobKeywords = [
      "experience",
      "skills",
      "requirements",
      "responsibilities",
      "duties",
      "qualifications",
      "job",
      "position",
      "role",
    ];
    const relevantSentences = sentences.filter((sentence) =>
      jobKeywords.some((keyword) => sentence.toLowerCase().includes(keyword))
    );

    if (relevantSentences.length > 0) {
      jobDescription = relevantSentences.slice(0, 10).join(". ") + ".";
    }
  }

  return jobDescription;
}

// Create custom resume based on job description
async function createCustomResume(jobDescription) {
  try {
    // Get user's form data
    const result = await chrome.storage.local.get("formData");
    const formData = result.formData || {};

    // Prepare the data for the resume generation
    const resumeData = {
      jobDescription: jobDescription,
      userData: {
        firstName: formData.firstName || "",
        lastName: formData.lastName || "",
        email: formData.email || "",
        phoneNumber: formData.phoneNumber || "",
        address: formData.address || "",
        state: formData.state || "",
        postalCode: formData.postalCode || "",
        country: formData.country || "",
        jobTitle: formData.jobTitle || "",
        companyName: formData.companyName || "",
        jobTitleHistory: formData.jobTitleHistory || "",
        jobDuties: formData.jobDuties || "",
        schoolName: formData.schoolName || "",
        degree: formData.degree || "",
        fieldOfStudy: formData.fieldOfStudy || "",
        graduationYear: formData.graduationYear || "",
        skills: formData.skills || [],
        languages: formData.languages || [],
        certifications: formData.certifications || [],
        training: formData.training || [],
      },
    };

    // Try to send to backend for resume generation
    try {
      const response = await fetch(
        "https://job-fill-backend.onrender.com/generate-resume",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resumeData),
        }
      );

      if (response.ok) {
        const resumeResult = await response.json();
        return resumeResult.resume;
      }
    } catch (backendError) {
      console.log("Backend not available, generating local resume");
    }

    // Fallback: Generate a basic resume locally
    return generateLocalResume(resumeData);
  } catch (error) {
    console.error("Error generating resume:", error);
    throw error;
  }
}

// Generate a basic resume locally when backend is not available
function generateLocalResume(resumeData) {
  const { userData, jobDescription } = resumeData;

  // Extract key skills and requirements from job description
  const jobKeywords = extractKeywordsFromJobDescription(jobDescription);

  const resume = `
<h1>${userData.firstName} ${userData.lastName}</h1>
<p><strong>Email:</strong> ${userData.email} | <strong>Phone:</strong> ${
    userData.phoneNumber
  }</p>
<p><strong>Address:</strong> ${userData.address}, ${userData.state} ${
    userData.postalCode
  }, ${userData.country}</p>

<h2>Professional Summary</h2>
<p>Experienced professional with expertise in ${
    userData.jobTitle || "relevant field"
  }. Skilled in ${jobKeywords
    .slice(0, 3)
    .join(", ")} and committed to delivering high-quality results.</p>

<h2>Work Experience</h2>
<h3>${userData.jobTitleHistory || "Previous Position"}</h3>
<p><strong>${userData.companyName || "Company Name"}</strong></p>
<p>${
    userData.jobDuties ||
    "Responsible for various duties and responsibilities in the role."
  }</p>

<h2>Education</h2>
<h3>${userData.degree || "Degree"}</h3>
<p><strong>${userData.schoolName || "Institution"}</strong> - ${
    userData.fieldOfStudy || "Field of Study"
  }</p>
<p>Graduated: ${userData.graduationYear || "Year"}</p>

<h2>Skills</h2>
<ul>
${userData.skills.map((skill) => `<li>${skill}</li>`).join("")}
${jobKeywords
  .slice(0, 5)
  .map((keyword) => `<li>${keyword}</li>`)
  .join("")}
</ul>

<h2>Languages</h2>
<ul>
${userData.languages.map((lang) => `<li>${lang}</li>`).join("")}
</ul>

<h2>Certifications</h2>
<ul>
${userData.certifications.map((cert) => `<li>${cert}</li>`).join("")}
</ul>

<h2>Training</h2>
<ul>
${userData.training.map((train) => `<li>${train}</li>`).join("")}
</ul>
`;

  return resume;
}

// Extract relevant keywords from job description
function extractKeywordsFromJobDescription(jobDescription) {
  const commonSkills = [
    "JavaScript",
    "Python",
    "Java",
    "React",
    "Node.js",
    "SQL",
    "HTML",
    "CSS",
    "Project Management",
    "Leadership",
    "Communication",
    "Problem Solving",
    "Data Analysis",
    "Machine Learning",
    "AWS",
    "Docker",
    "Git",
    "Agile",
    "Customer Service",
    "Sales",
    "Marketing",
    "Design",
    "Writing",
    "Research",
  ];

  const foundSkills = commonSkills.filter((skill) =>
    jobDescription.toLowerCase().includes(skill.toLowerCase())
  );

  return foundSkills.length > 0
    ? foundSkills
    : ["Problem Solving", "Communication", "Teamwork"];
}

// Show resume in a floating window
function showResumeWindow(resumeContent, title = "Custom Resume") {
  // Remove existing resume window if any
  const existingWindow = document.getElementById("resume-window");
  if (existingWindow) {
    existingWindow.remove();
  }

  // Create style for resume window
  const style = document.createElement("style");
  style.textContent = `
    #resume-window {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 99999;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      width: 90vw;
      max-width: 800px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .resume-header {
      background: #f8f9fa;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .resume-header h2 {
      margin: 0;
      color: #333;
      font-size: 1.2rem;
    }
    .resume-close {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .resume-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      line-height: 1.6;
      color: #333;
    }
    .resume-content h1, .resume-content h2, .resume-content h3 {
      color: #2c3e50;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .resume-content h1 {
      font-size: 1.8rem;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    .resume-content h2 {
      font-size: 1.4rem;
      color: #34495e;
    }
    .resume-content h3 {
      font-size: 1.2rem;
      color: #7f8c8d;
    }
    .resume-content p {
      margin-bottom: 12px;
    }
    .resume-content ul {
      margin-bottom: 16px;
      padding-left: 20px;
    }
    .resume-content li {
      margin-bottom: 6px;
    }
    .resume-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .resume-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .resume-btn-primary {
      background: #007bff;
      color: white;
    }
    .resume-btn-secondary {
      background: #6c757d;
      color: white;
    }
  `;
  document.head.appendChild(style);

  // Create resume window
  const resumeWindow = document.createElement("div");
  resumeWindow.id = "resume-window";
  resumeWindow.innerHTML = `
    <div class="resume-header">
      <h2>${title}</h2>
      <button class="resume-close" id="resume-close">×</button>
    </div>
    <div class="resume-content">
      ${resumeContent}
    </div>
    <div class="resume-actions">
      <button class="resume-btn resume-btn-secondary" id="resume-copy">Copy to Clipboard</button>
      <button class="resume-btn resume-btn-primary" id="resume-download">Download PDF</button>
    </div>
  `;

  document.body.appendChild(resumeWindow);

  // Add event listeners
  document.getElementById("resume-close").onclick = () => {
    resumeWindow.remove();
    style.remove();
  };

  document.getElementById("resume-copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(resumeContent);
      alert("Resume copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy resume:", error);
      alert("Failed to copy resume to clipboard");
    }
  };

  document.getElementById("resume-download").onclick = () => {
    // Create a blob and download
    const blob = new Blob([resumeContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "custom-resume.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
}

// Show resume update window
function showResumeUpdateWindow() {
  // Prevent multiple windows
  if (document.getElementById("resume-update-window")) return;

  // Create style element for window CSS
  const style = document.createElement("style");
  style.textContent = `
    #resume-update-window {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 99999;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      width: 90vw;
      max-width: 800px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .resume-update-header {
      background: #f8f9fa;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .resume-update-header h2 {
      margin: 0;
      color: #333;
      font-size: 1.2rem;
    }
    .resume-update-close {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .resume-update-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      line-height: 1.6;
      color: #333;
    }
    .upload-section {
      margin-bottom: 24px;
      padding: 20px;
      border: 2px dashed #ddd;
      border-radius: 8px;
      text-align: center;
      background: #fafafa;
    }
    .upload-section.dragover {
      border-color: #007bff;
      background: #f0f8ff;
    }
    .file-input {
      display: none;
    }
    .upload-btn {
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 12px 24px;
      font-size: 1rem;
      cursor: pointer;
      margin: 10px;
    }
    .upload-btn:hover {
      background: #0056b3;
    }
    .file-info {
      margin-top: 10px;
      font-size: 0.9rem;
      color: #666;
    }
    .job-description-section {
      margin-bottom: 24px;
    }
    .job-description-section h3 {
      margin-bottom: 12px;
      color: #333;
    }
    .job-description-text {
      width: 100%;
      min-height: 120px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-family: inherit;
      resize: vertical;
    }
    .update-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .update-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: 500;
    }
    .update-btn-primary {
      background: #28a745;
      color: white;
    }
    .update-btn-primary:hover {
      background: #218838;
    }
    .update-btn-secondary {
      background: #6c757d;
      color: white;
    }
    .loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .error-message {
      color: #dc3545;
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      padding: 10px;
      margin: 10px 0;
    }
    .success-message {
      color: #155724;
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
      padding: 10px;
      margin: 10px 0;
    }
  `;
  document.head.appendChild(style);

  // Create resume update window
  const updateWindow = document.createElement("div");
  updateWindow.id = "resume-update-window";
  updateWindow.innerHTML = `
    <div class="resume-update-header">
      <h2>Update Resume with Job Description</h2>
      <button class="resume-update-close" id="resume-update-close">×</button>
    </div>
    <div class="resume-update-content">
      <div class="upload-section" id="upload-section">
        <h3>Upload Your Resume</h3>
        <p>Drag and drop your resume file here, or click to browse</p>
        <input type="file" id="resume-file-input" class="file-input" accept=".pdf,.doc,.docx,.txt">
        <button class="upload-btn" id="browse-btn">Browse Files</button>
        <div class="file-info" id="file-info"></div>
      </div>
      
      <div class="job-description-section">
        <h3>Job Description</h3>
        <p>We'll automatically extract the job description from this page, or you can edit it below:</p>
        <textarea class="job-description-text" id="job-description-text" placeholder="Job description will be automatically filled..."></textarea>
      </div>
      
      <div id="status-message"></div>
    </div>
    <div class="update-actions">
      <button class="update-btn update-btn-secondary" id="resume-update-cancel">Cancel</button>
      <button class="update-btn update-btn-primary" id="update-resume-btn" disabled>
        <span class="loading" id="loading-spinner" style="display: none;"></span>
        Update Resume
      </button>
    </div>
  `;

  document.body.appendChild(updateWindow);

  // Get elements
  const uploadSection = document.getElementById("upload-section");
  const fileInput = document.getElementById("resume-file-input");
  const browseBtn = document.getElementById("browse-btn");
  const fileInfo = document.getElementById("file-info");
  const jobDescriptionText = document.getElementById("job-description-text");
  const updateBtn = document.getElementById("update-resume-btn");
  const statusMessage = document.getElementById("status-message");
  const loadingSpinner = document.getElementById("loading-spinner");

  let uploadedFile = null;
  let jobDescription = "";

  // Auto-extract job description
  jobDescription = extractJobDescription();
  if (jobDescription) {
    jobDescriptionText.value = jobDescription;
  }

  // File upload handlers
  browseBtn.onclick = () => fileInput.click();

  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Drag and drop handlers
  uploadSection.ondragover = (e) => {
    e.preventDefault();
    uploadSection.classList.add("dragover");
  };

  uploadSection.ondragleave = () => {
    uploadSection.classList.remove("dragover");
  };

  uploadSection.ondrop = (e) => {
    e.preventDefault();
    uploadSection.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  function handleFileUpload(file) {
    // Validate file type
    const allowedTypes = [".pdf", ".doc", ".docx", ".txt"];
    const fileExtension = "." + file.name.split(".").pop().toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      showStatus("Please upload a PDF, DOC, DOCX, or TXT file.", "error");
      return;
    }

    uploadedFile = file;
    fileInfo.textContent = `Selected: ${file.name} (${(
      file.size / 1024
    ).toFixed(1)} KB)`;
    updateBtn.disabled = false;
    showStatus("File uploaded successfully!", "success");
  }

  function showStatus(message, type) {
    statusMessage.innerHTML = `<div class="${type}-message">${message}</div>`;
    setTimeout(() => {
      statusMessage.innerHTML = "";
    }, 5000);
  }

  // Update resume handler
  updateBtn.onclick = async () => {
    if (!uploadedFile) {
      showStatus("Please upload a resume file first.", "error");
      return;
    }

    const jobDesc = jobDescriptionText.value.trim();
    if (!jobDesc) {
      showStatus("Please provide a job description.", "error");
      return;
    }

    // Show loading state
    updateBtn.disabled = true;
    loadingSpinner.style.display = "inline-block";
    updateBtn.textContent = "Updating Resume...";

    try {
      const updatedResume = await updateResumeWithJobDescription(
        uploadedFile,
        jobDesc
      );
      showResumeWindow(updatedResume, "Updated Resume");
      updateWindow.remove();
      style.remove();
    } catch (error) {
      console.error("Error updating resume:", error);
      showStatus("Error updating resume: " + error.message, "error");
    } finally {
      // Reset button state
      updateBtn.disabled = false;
      loadingSpinner.style.display = "none";
      updateBtn.innerHTML =
        '<span class="loading" id="loading-spinner" style="display: none;"></span>Update Resume';
    }
  };

  // Close handlers
  document.getElementById("resume-update-close").onclick = () => {
    updateWindow.remove();
    style.remove();
  };

  document.getElementById("resume-update-cancel").onclick = () => {
    updateWindow.remove();
    style.remove();
  };
}

// Update resume with job description
async function updateResumeWithJobDescription(resumeFile, jobDescription) {
  try {
    // Read the resume file
    const resumeText = await readResumeFile(resumeFile);

    // Get user's form data for additional context
    const result = await chrome.storage.local.get("formData");
    const formData = result.formData || {};

    // Prepare data for resume update
    const updateData = {
      originalResume: resumeText,
      jobDescription: jobDescription,
      userData: {
        firstName: formData.firstName || "",
        lastName: formData.lastName || "",
        email: formData.email || "",
        phoneNumber: formData.phoneNumber || "",
        skills: formData.skills || [],
        languages: formData.languages || [],
        certifications: formData.certifications || [],
        training: formData.training || [],
      },
    };

    // Try to send to backend for resume update
    try {
      const response = await fetch(
        "https://job-fill-backend.onrender.com/update-resume",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );

      if (response.ok) {
        const result = await response.json();
        return result.resume;
      }
    } catch (backendError) {
      console.log("Backend not available, updating resume locally");
    }

    // Fallback: Update resume locally
    return updateResumeLocally(updateData);
  } catch (error) {
    console.error("Error updating resume:", error);
    throw error;
  }
}

// Read resume file content
function readResumeFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = (e) => {
      reject(new Error("Failed to read file"));
    };

    // Read as text for now (can be enhanced for PDF parsing)
    reader.readAsText(file);
  });
}

// Update resume locally when backend is not available
function updateResumeLocally(updateData) {
  const { originalResume, jobDescription, userData } = updateData;

  // Extract key skills and requirements from job description
  const jobKeywords = extractKeywordsFromJobDescription(jobDescription);

  // Simple text-based resume update
  let updatedResume = originalResume;

  // Add relevant skills if not present
  const skillsSection = jobKeywords.slice(0, 5).join(", ");
  if (!updatedResume.toLowerCase().includes("skills") && skillsSection) {
    updatedResume += `\n\nSKILLS\n${skillsSection}`;
  }

  // Add a tailored summary if not present
  if (
    !updatedResume.toLowerCase().includes("summary") &&
    !updatedResume.toLowerCase().includes("objective")
  ) {
    const summary = `\n\nPROFESSIONAL SUMMARY\nExperienced professional with expertise in ${
      userData.jobTitle || "relevant field"
    }. Skilled in ${jobKeywords
      .slice(0, 3)
      .join(", ")} and committed to delivering high-quality results.`;
    updatedResume = summary + "\n\n" + updatedResume;
  }

  // Highlight relevant keywords in the resume
  jobKeywords.forEach((keyword) => {
    const regex = new RegExp(`(${keyword})`, "gi");
    updatedResume = updatedResume.replace(regex, "**$1**");
  });

  return updatedResume;
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

  // Handler for creating custom resume
  if (request.action === "createCustomResume") {
    (async () => {
      try {
        const jobDescription = extractJobDescription();

        if (!jobDescription) {
          sendResponse({
            success: false,
            error: "No job description found on this page",
          });
          return;
        }

        const resume = await createCustomResume(jobDescription);
        showResumeWindow(resume);
        sendResponse({ success: true });
      } catch (error) {
        console.error("Error in createCustomResume:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Indicates async response
  }

  // Handler for updating existing resume
  if (request.action === "updateResume") {
    showResumeUpdateWindow();
    sendResponse({ success: true });
    return true;
  }
});
