// LendSwift Digital Lending - Core Application Logic

let currentStep = 1;
const totalSteps = 8;

const LOAN_LIMITS = {
    education: { min: 100000, max: 600000, label: "₹1 Lakh - ₹6 Lakh", rate: 9.5 },
    home: { min: 500000, max: 10000000, label: "₹5 Lakh - ₹1 Crore", rate: 8.5 },
    business: { min: 5000000, max: 10000000, label: "₹50 Lakh - ₹1 Crore", rate: 12.0 }
};

const DOCS_CONFIG = {
    education: [
        { name: "10th & 12th Marksheets", desc: "Consolidated grade cards (PDF/JPG)" },
        { name: "College Admission Letter", desc: "Proof of enrollment & fee schedule" },
        { name: "Applicant Identity & Address Proof", desc: "Aadhaar Card / Passport" }
    ],
    home: [
        { name: "Property / Land Documents", desc: "Sale deed or builder allocation copy" },
        { name: "Electricity / Property Tax Bills", desc: "Latest 3 months utility records" },
        { name: "Salary Slips / Bank Statements", desc: "Last 6 months verified bank statement" }
    ],
    business: [
        { name: "Business Registration / License", desc: "GST Certificate / Shop Act / Udyam" },
        { name: "Last 2 Years ITR & Audit Balance Sheet", desc: "Income tax computation statement" },
        { name: "Current Bank Account Statements", desc: "Last 12 months transactional statement" }
    ]
};

// Alternative Document Knowledge Base for Robo Chatbot
const ALTERNATIVE_DOCS_KB = {
    salary: {
        title: "Salary Slip Alternative",
        missing: "Salary Slips (Last 3 Months)",
        alternatives: [
            "Form 16 (Part A & B) issued by employer",
            "6 Months Bank Statement with verified salary credits",
            "Appointment Letter + Latest CTC Breakup on company letterhead",
            "Employer Certificate stating designation & monthly gross/net pay"
        ]
    },
    itr: {
        title: "ITR / Tax Return Alternative",
        missing: "Income Tax Returns (ITR)",
        alternatives: [
            "GST 3B Returns for the last 12 months",
            "CA Certified Provisional Balance Sheet & Profit-Loss Account",
            "Form 26AS (Tax Credit Statement) downloaded from Income Tax portal",
            "12 Months Current Bank Account statement showing business turnover"
        ]
    },
    marksheet: {
        title: "Education Marksheet Alternative",
        missing: "Original Physical 10th/12th/Degree Marksheet",
        alternatives: [
            "DigiLocker Verified Digital Marksheet (PDF)",
            "Provisional Passing Certificate issued by School/University",
            "Consolidated Transcript / Web Copy signed & stamped by College Dean",
            "Migration Certificate or Official Bonafide Student Certificate"
        ]
    },
    address: {
        title: "Address & Utility Bill Alternative",
        missing: "Electricity Bill in your name",
        alternatives: [
            "Registered Rent Agreement + Landlord's Electricity Bill",
            "Valid Passport with current residence address",
            "Voter ID Card or Driving License",
            "Piped Gas Connection (PNG) or Water Board Tax Receipt",
            "Postpaid Mobile / Broadband Landline Bill (last 2 months)"
        ]
    },
    kyc: {
        title: "Aadhaar / PAN Alternative",
        missing: "Physical Aadhaar / PAN Card",
        alternatives: [
            "Masked e-Aadhaar PDF downloaded from UIDAI with QR code",
            "e-PAN digital copy from NSDL / UTIITSL",
            "Valid Indian Passport",
            "Driving License / Voter Identity Card + Form 60 declaration"
        ]
    },
    business_license: {
        title: "Business Proof Alternative",
        missing: "Shop Act / Trade License",
        alternatives: [
            "Udyam MSME Registration Certificate (Instant & Free)",
            "GST Registration Certificate (GSTIN)",
            "FSSAI Food License / Drug License / Factory Act License",
            "Partnership Deed / Certificate of Incorporation (MCA)"
        ]
    }
};

document.addEventListener("DOMContentLoaded", () => {
    setupLoanTypeSelection();
    setupAddressSync();
    setupCoApplicantToggle();
    setupRealtimeCalculators();
    updateDocRequirements();
    updateUI();
    setupChatbot();
});

function selectLoanType(type) {
    const radio = document.querySelector(`input[name="loanType"][value="${type}"]`);
    if (radio) {
        radio.checked = true;
    }
    document.querySelectorAll(".loan-card").forEach(c => c.classList.remove("selected"));
    const card = document.getElementById(`card-${type}`);
    if (card) card.classList.add("selected");
    
    updateDocRequirements();
    calculateEMI();
}

function setupLoanTypeSelection() {
    document.querySelectorAll(".loan-card").forEach(card => {
        card.addEventListener("click", () => {
            const radio = card.querySelector("input[type='radio']");
            if (radio) {
                selectLoanType(radio.value);
            }
        });
    });
}

function setupAddressSync() {
    const sameCheckbox = document.getElementById("sameAsPermanent");
    if (sameCheckbox) {
        sameCheckbox.addEventListener("change", (e) => {
            const currentAddr = document.getElementById("currentAddress");
            const permAddr = document.getElementById("permAddress");
            if (e.target.checked) {
                currentAddr.value = permAddr.value;
                currentAddr.disabled = true;
            } else {
                currentAddr.disabled = false;
            }
        });
    }
}

function setupCoApplicantToggle() {
    const toggle = document.getElementById("hasCoApplicant");
    const container = document.getElementById("coAppDetails");
    if (toggle && container) {
        toggle.addEventListener("change", (e) => {
            container.style.display = e.target.checked ? "block" : "none";
        });
    }
}

function setupRealtimeCalculators() {
    const amountInput = document.getElementById("loanAmount");
    const tenureInput = document.getElementById("loanTenure");
    if (amountInput) amountInput.addEventListener("input", calculateEMI);
    if (tenureInput) tenureInput.addEventListener("change", calculateEMI);
}

function calculateEMI() {
    const loanTypeChecked = document.querySelector("input[name='loanType']:checked");
    const amountVal = parseFloat(document.getElementById("loanAmount")?.value || 0);
    const tenureVal = parseInt(document.getElementById("loanTenure")?.value || 12);
    const emiDisplay = document.getElementById("emiDisplay");
    
    if (!loanTypeChecked || !amountVal || amountVal <= 0) {
        if (emiDisplay) emiDisplay.textContent = "₹0 / mo";
        return;
    }
    
    const config = LOAN_LIMITS[loanTypeChecked.value] || { rate: 10 };
    const monthlyRate = (config.rate / 12) / 100;
    const emi = (amountVal * monthlyRate * Math.pow(1 + monthlyRate, tenureVal)) / (Math.pow(1 + monthlyRate, tenureVal) - 1);
    
    if (emiDisplay && !isNaN(emi) && isFinite(emi)) {
        emiDisplay.textContent = `₹${Math.round(emi).toLocaleString("en-IN")} / mo`;
    }
}

function updateDocRequirements() {
    const loanType = document.querySelector("input[name='loanType']:checked")?.value || "education";
    const docContainer = document.getElementById("docUploadList");
    if (!docContainer) return;
    
    const docs = DOCS_CONFIG[loanType] || DOCS_CONFIG.education;
    docContainer.innerHTML = docs.map((doc, idx) => `
        <div class="doc-item">
            <div class="doc-info">
                <h4>${idx + 1}. ${doc.name}</h4>
                <p>${doc.desc}</p>
            </div>
            <div style="max-width: 200px;">
                <input type="file" class="doc-file-input" data-doc-name="${doc.name}" accept=".pdf,.png,.jpg,.jpeg">
            </div>
        </div>
    `).join("");
}

function validateStep(step) {
    let isValid = true;
    clearErrors();
    
    if (step === 1) {
        const typeEl = document.querySelector("input[name='loanType']:checked");
        const amountEl = document.getElementById("loanAmount");
        const tenureEl = document.getElementById("loanTenure");
        
        if (!typeEl) {
            setError("loanTypeError", "Please select a loan type");
            isValid = false;
        }
        
        const type = typeEl ? typeEl.value : "education";
        const limits = LOAN_LIMITS[type];
        const amt = parseFloat(amountEl.value);
        
        if (!amt || isNaN(amt) || amt < limits.min || amt > limits.max) {
            setError("loanAmountError", `Amount for ${type} loan must be between ₹${limits.min.toLocaleString("en-IN")} and ₹${limits.max.toLocaleString("en-IN")}`);
            isValid = false;
        }
        
        if (!tenureEl.value) {
            setError("loanTenureError", "Please select a tenure period");
            isValid = false;
        }
    } else if (step === 2) {
        const firstName = document.getElementById("firstName").value.trim();
        const lastName = document.getElementById("lastName").value.trim();
        const phone = document.getElementById("phoneNumber").value.trim();
        const email = document.getElementById("emailAddress").value.trim();
        
        if (!firstName) {
            setError("firstNameError", "First name is required");
            isValid = false;
        }
        if (!lastName) {
            setError("lastNameError", "Last name is required");
            isValid = false;
        }
        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError("phoneNumberError", "Enter a valid 10-digit phone number");
            isValid = false;
        }
        if (!/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            setError("emailAddressError", "Enter a valid email address");
            isValid = false;
        }
    } else if (step === 3) {
        const idType = document.getElementById("kycType").value;
        const idNumber = document.getElementById("kycNumber").value.trim();
        const otpChannel = document.querySelector("input[name='otpChannel']:checked");
        
        if (idType === "aadhaar" && !/^\d{12}$/.test(idNumber)) {
            setError("kycNumberError", "Enter a valid 12-digit Aadhaar number");
            isValid = false;
        } else if (idType === "pan" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(idNumber)) {
            setError("kycNumberError", "Enter a valid 10-character PAN number (e.g. ABCDE1234F)");
            isValid = false;
        }
        if (!otpChannel) {
            setError("otpChannelError", "Please select a verification channel");
            isValid = false;
        }
    } else if (step === 4) {
        const permAddress = document.getElementById("permAddress").value.trim();
        const city = document.getElementById("city").value.trim();
        const state = document.getElementById("state").value.trim();
        const pincode = document.getElementById("pincode").value.trim();
        
        if (!permAddress) {
            setError("permAddressError", "Permanent address is required");
            isValid = false;
        }
        if (!city) {
            setError("cityError", "City is required");
            isValid = false;
        }
        if (!state) {
            setError("stateError", "State is required");
            isValid = false;
        }
        if (!/^\d{6}$/.test(pincode)) {
            setError("pincodeError", "Enter a valid 6-digit Pincode");
            isValid = false;
        }
    } else if (step === 5) {
        const empType = document.getElementById("empType").value;
        const income = parseFloat(document.getElementById("monthlyIncome").value);
        
        if (!empType) {
            setError("empTypeError", "Please select employment status");
            isValid = false;
        }
        if (!income || isNaN(income) || income < 10000) {
            setError("monthlyIncomeError", "Please enter a valid monthly income (min ₹10,000)");
            isValid = false;
        }
    } else if (step === 6) {
        const hasCoApp = document.getElementById("hasCoApplicant").checked;
        if (hasCoApp) {
            const coName = document.getElementById("coAppName").value.trim();
            const coIncome = parseFloat(document.getElementById("coAppIncome").value);
            if (!coName) {
                setError("coAppNameError", "Co-applicant name is required");
                isValid = false;
            }
            if (!coIncome || isNaN(coIncome)) {
                setError("coAppIncomeError", "Co-applicant income is required");
                isValid = false;
            }
        }
    }
    
    return isValid;
}

function setError(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message;
}

function clearErrors() {
    document.querySelectorAll(".error-text").forEach(el => el.textContent = "");
}

function nextStep() {
    if (!validateStep(currentStep)) {
        return;
    }
    
    if (currentStep < totalSteps) {
        currentStep++;
        if (currentStep === 8) {
            populateReviewStep();
        }
        updateUI();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateUI();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

function updateUI() {
    for (let i = 1; i <= totalSteps; i++) {
        const stepEl = document.getElementById(`step-${i}`);
        if (stepEl) {
            stepEl.classList.toggle("active", i === currentStep);
        }
        
        const indicator = document.getElementById(`indicator-${i}`);
        if (indicator) {
            indicator.classList.remove("active", "completed");
            if (i === currentStep) indicator.classList.add("active");
            else if (i < currentStep) indicator.classList.add("completed");
        }
    }
    
    const fill = document.getElementById("progressFill");
    if (fill) {
        const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
        fill.style.width = `${percentage}%`;
    }
    
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");
    
    if (prevBtn) prevBtn.style.display = currentStep > 1 ? "inline-flex" : "none";
    if (nextBtn) nextBtn.style.display = currentStep < totalSteps ? "inline-flex" : "none";
    if (submitBtn) submitBtn.style.display = currentStep === totalSteps ? "inline-flex" : "none";
}

function populateReviewStep() {
    const loanType = document.querySelector("input[name='loanType']:checked")?.value || "education";
    const amount = document.getElementById("loanAmount").value || 0;
    const tenure = document.getElementById("loanTenure").value || 12;
    const fullName = `${document.getElementById("firstName").value} ${document.getElementById("lastName").value}`;
    const phone = document.getElementById("phoneNumber").value;
    const email = document.getElementById("emailAddress").value;
    const kycType = (document.getElementById("kycType").value || "").toUpperCase();
    const kycNumber = document.getElementById("kycNumber").value;
    const address = `${document.getElementById("permAddress").value}, ${document.getElementById("city").value}, ${document.getElementById("state").value} - ${document.getElementById("pincode").value}`;
    const empType = document.getElementById("empType").value;
    const income = document.getElementById("monthlyIncome").value;
    const hasCoApp = document.getElementById("hasCoApplicant").checked;
    
    const reviewGrid = document.getElementById("reviewContent");
    if (!reviewGrid) return;
    
    reviewGrid.innerHTML = `
        <div class="review-card">
            <h4>Loan Details</h4>
            <div class="review-row"><span class="review-label">Type:</span><span class="review-val" style="text-transform:capitalize;">${loanType} Loan</span></div>
            <div class="review-row"><span class="review-label">Amount:</span><span class="review-val">₹${parseFloat(amount).toLocaleString("en-IN")}</span></div>
            <div class="review-row"><span class="review-label">Tenure:</span><span class="review-val">${tenure} Months</span></div>
        </div>
        
        <div class="review-card">
            <h4>Applicant Details</h4>
            <div class="review-row"><span class="review-label">Name:</span><span class="review-val">${fullName}</span></div>
            <div class="review-row"><span class="review-label">Phone:</span><span class="review-val">${phone}</span></div>
            <div class="review-row"><span class="review-label">Email:</span><span class="review-val">${email}</span></div>
        </div>

        <div class="review-card">
            <h4>KYC & Verification</h4>
            <div class="review-row"><span class="review-label">${kycType}:</span><span class="review-val">${kycNumber}</span></div>
            <div class="review-row"><span class="review-label">Status:</span><span class="review-val" style="color:var(--success-green);">Verified ✓</span></div>
        </div>

        <div class="review-card">
            <h4>Financial Profile</h4>
            <div class="review-row"><span class="review-label">Employment:</span><span class="review-val" style="text-transform:capitalize;">${empType}</span></div>
            <div class="review-row"><span class="review-label">Monthly Income:</span><span class="review-val">₹${parseFloat(income).toLocaleString("en-IN")}</span></div>
            <div class="review-row"><span class="review-label">Co-Applicant:</span><span class="review-val">${hasCoApp ? "Yes" : "No"}</span></div>
        </div>
        
        <div class="review-card" style="grid-column: 1 / -1;">
            <h4>Address</h4>
            <div class="review-row"><span class="review-label">Address:</span><span class="review-val">${address}</span></div>
        </div>
    `;
}

function submitLoanApplication() {
    const terms = document.getElementById("termsAgree");
    if (terms && !terms.checked) {
        alert("Please accept the terms and declarations to proceed.");
        return;
    }
    
    const refId = "LS-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
    document.getElementById("refNumberDisplay").textContent = refId;
    document.getElementById("successModal").style.display = "flex";
}

function resetApplication() {
    document.getElementById("loanForm").reset();
    document.getElementById("successModal").style.display = "none";
    currentStep = 1;
    selectLoanType("education");
    updateUI();
}

/* ==========================================================================
   ROBO AI AGENT CHATBOT CONTROLLER
   ========================================================================== */
function toggleRoboChat() {
    const chatModal = document.getElementById("chatboxModal");
    const inputField = document.getElementById("chatInputField");
    if (!chatModal) return;
    
    const isVisible = chatModal.style.display === "flex";
    chatModal.style.display = isVisible ? "none" : "flex";
    if (!isVisible && inputField) {
        setTimeout(() => inputField.focus(), 150);
    }
}

function setupChatbot() {
    const sendBtn = document.getElementById("chatSendBtn");
    const inputField = document.getElementById("chatInputField");

    if (sendBtn && inputField) {
        sendBtn.addEventListener("click", handleUserMessage);
        inputField.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleUserMessage();
            }
        });
    }
}

function sendSuggestedQuery(text) {
    const inputField = document.getElementById("chatInputField");
    if (inputField) {
        inputField.value = text;
        handleUserMessage();
    }
}

function showAllAlternativeDocs() {
    appendUserMessage("Show all alternative documents for loan application");
    
    setTimeout(() => {
        let content = `<p><strong>🤖 Robo AI - Verified Alternative Document Guide:</strong></p><p style="margin-top:4px; font-size:12px; color:var(--text-secondary);">If you don't have any primary document, upload any of these authorized replacements:</p>`;
        
        for (const key in ALTERNATIVE_DOCS_KB) {
            const item = ALTERNATIVE_DOCS_KB[key];
            content += `
                <div class="doc-alt-card">
                    <div class="doc-missing-tag">❌ Missing: ${item.missing}</div>
                    <div class="doc-alt-tag">✅ Accepted Alternatives:</div>
                    <ul class="doc-alt-list">
                        ${item.alternatives.map(alt => `<li>${alt}</li>`).join("")}
                    </ul>
                </div>
            `;
        }
        appendBotMessage(content);
    }, 350);
}

function handleUserMessage() {
    const inputField = document.getElementById("chatInputField");
    if (!inputField) return;
    
    const query = inputField.value.trim();
    if (!query) return;
    
    inputField.value = "";
    appendUserMessage(query);
    
    setTimeout(() => {
        processBotQuery(query);
    }, 400);
}

function appendUserMessage(text) {
    const container = document.getElementById("chatMessages");
    if (!container) return;
    
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble user";
    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

function appendBotMessage(htmlContent) {
    const container = document.getElementById("chatMessages");
    if (!container) return;
    
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble bot";
    bubble.innerHTML = htmlContent;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

function processBotQuery(userText) {
    const q = userText.toLowerCase();

    if (q.includes("salary") || q.includes("payslip") || q.includes("pay slip") || q.includes("income slip")) {
        const item = ALTERNATIVE_DOCS_KB.salary;
        appendBotMessage(`
            <p><strong>🤖 Alternative for Salary Slip:</strong></p>
            <p style="margin: 4px 0 8px; font-size:12px;">If you don't have your official monthly payslip, you can upload:</p>
            <div class="doc-alt-card">
                <div class="doc-missing-tag">❌ ${item.missing}</div>
                <div class="doc-alt-tag">✅ Accepted Alternatives:</div>
                <ul class="doc-alt-list">
                    ${item.alternatives.map(a => `<li>${a}</li>`).join("")}
                </ul>
            </div>
        `);
    } else if (q.includes("itr") || q.includes("tax return") || q.includes("business return") || q.includes("balance sheet")) {
        const item = ALTERNATIVE_DOCS_KB.itr;
        appendBotMessage(`
            <p><strong>🤖 Alternative for ITR / Tax Returns:</strong></p>
            <p style="margin: 4px 0 8px; font-size:12px;">If you haven't filed recent ITR or don't have audited balance sheets:</p>
            <div class="doc-alt-card">
                <div class="doc-missing-tag">❌ ${item.missing}</div>
                <div class="doc-alt-tag">✅ Accepted Alternatives:</div>
                <ul class="doc-alt-list">
                    ${item.alternatives.map(a => `<li>${a}</li>`).join("")}
                </ul>
            </div>
        `);
    } else if (q.includes("marksheet") || q.includes("education") || q.includes("grade") || q.includes("degree") || q.includes("certificate")) {
        const item = ALTERNATIVE_DOCS_KB.marksheet;
        appendBotMessage(`
            <p><strong>🎓 Education Marksheet Alternatives:</strong></p>
            <p style="margin: 4px 0 8px; font-size:12px;">If your original physical marksheets are submitted in college or unavailable:</p>
            <div class="doc-alt-card">
                <div class="doc-missing-tag">❌ ${item.missing}</div>
                <div class="doc-alt-tag">✅ Accepted Alternatives:</div>
                <ul class="doc-alt-list">
                    ${item.alternatives.map(a => `<li>${a}</li>`).join("")}
                </ul>
            </div>
        `);
    } else if (q.includes("electricity") || q.includes("bill") || q.includes("address") || q.includes("rent") || q.includes("residence")) {
        const item = ALTERNATIVE_DOCS_KB.address;
        appendBotMessage(`
            <p><strong>🏠 Address & Utility Proof Alternatives:</strong></p>
            <p style="margin: 4px 0 8px; font-size:12px;">If you do not have an electricity bill registered in your name:</p>
            <div class="doc-alt-card">
                <div class="doc-missing-tag">❌ ${item.missing}</div>
                <div class="doc-alt-tag">✅ Accepted Alternatives:</div>
                <ul class="doc-alt-list">
                    ${item.alternatives.map(a => `<li>${a}</li>`).join("")}
                </ul>
            </div>
        `);
    } else if (q.includes("pan") || q.includes("aadhaar") || q.includes("adhar") || q.includes("kyc") || q.includes("identity")) {
        const item = ALTERNATIVE_DOCS_KB.kyc;
        appendBotMessage(`
            <p><strong>🪪 Identity / KYC Proof Alternatives:</strong></p>
            <div class="doc-alt-card">
                <div class="doc-missing-tag">❌ ${item.missing}</div>
                <div class="doc-alt-tag">✅ Accepted Alternatives:</div>
                <ul class="doc-alt-list">
                    ${item.alternatives.map(a => `<li>${a}</li>`).join("")}
                </ul>
            </div>
        `);
    } else if (q.includes("alternative") || q.includes("document") || q.includes("doc") || q.includes("substitute") || q.includes("proof")) {
        showAllAlternativeDocs();
    } else if (q.includes("interest") || q.includes("rate") || q.includes("roi") || q.includes("percentage")) {
        appendBotMessage(`
            <p><strong>📈 LendSwift Current Interest Rates:</strong></p>
            <ul style="margin: 8px 0 8px 16px; font-size: 13px; color: var(--purple-light);">
                <li>🎓 <strong>Education Loan:</strong> 9.50% p.a. (₹1L – ₹6L)</li>
                <li>🏠 <strong>Home Loan:</strong> 8.50% p.a. (₹5L – ₹1Cr)</li>
                <li>💼 <strong>Business Loan:</strong> 12.00% p.a. (₹50L – ₹1Cr)</li>
            </ul>
            <p style="font-size: 12px; color: var(--text-secondary);">Calculated on reducing monthly balance basis.</p>
        `);
    } else if (q.includes("emi") || q.includes("calculate") || q.includes("month")) {
        appendBotMessage(`
            <p><strong>💡 Live EMI Calculator:</strong></p>
            <p style="font-size: 12px; margin-top: 4px;">In <strong>Step 1</strong> of the form, adjusting your desired loan amount and tenure automatically computes your exact monthly EMI in real-time!</p>
        `);
    } else if (q.includes("co-applicant") || q.includes("guarantor") || q.includes("co applicant")) {
        appendBotMessage(`
            <p><strong>👥 Co-Applicant Benefit:</strong></p>
            <p style="font-size: 12px; margin-top: 4px;">Adding a working parent, spouse, or sibling as a co-applicant in <strong>Step 6</strong> pools household income and boosts your loan eligibility and approval chance.</p>
        `);
    } else if (q.includes("status") || q.includes("track") || q.includes("reference") || q.includes("time") || q.includes("approval")) {
        appendBotMessage(`
            <p><strong>⚡ Processing & Approval Timeline:</strong></p>
            <ul style="margin: 8px 0 8px 16px; font-size: 12px; color: var(--purple-light);">
                <li>⚡ <strong>Digital In-Principle Approval:</strong> Within 15 minutes</li>
                <li>📞 <strong>Verification Callback:</strong> Within 24 hours</li>
                <li>💰 <strong>Disbursal:</strong> Directly to verified bank account upon document review</li>
            </ul>
        `);
    } else {
        appendBotMessage(`
            <p>🤖 I am Robo AI! You can ask me anything about loan application requirements and alternative documents:</p>
            <ul style="margin: 8px 0 8px 16px; font-size: 12px; color: var(--purple-light);">
                <li>"What can I submit instead of salary slip?"</li>
                <li>"Business loan without ITR alternative?"</li>
                <li>"Missing electricity bill for address?"</li>
                <li>"Interest rates and tenure options"</li>
            </ul>
            <button onclick="showAllAlternativeDocs()" style="margin-top:6px; background:linear-gradient(135deg, #9333ea, #c026d3); border:none; color:white; padding:6px 14px; border-radius:8px; font-size:11px; cursor:pointer; font-weight:700;">
                📋 View All Alternative Documents
            </button>
        `);
    }
}