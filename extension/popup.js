/**
 * OfferFlow Chrome Extension - Popup Script
 * Handles popup UI interactions: fetching job info, saving, settings.
 */

// ─── DOM Elements ────────────────────────────────────────────────

const companyInput = document.getElementById("company");
const titleInput = document.getElementById("title");
const locationInput = document.getElementById("location");
const sourceUrlInput = document.getElementById("sourceUrl");
const jdTextarea = document.getElementById("jd");
const saveBtn = document.getElementById("saveBtn");
const noDataHint = document.getElementById("noDataHint");
const toastEl = document.getElementById("toast");
const settingsToggle = document.getElementById("settingsToggle");
const settingsBody = document.getElementById("settingsBody");
const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

const DEFAULT_API_BASE_URL = "http://localhost:3000";

// ─── Toast ─────────────────────────────────────────────────────

let toastTimer = null;

function showToast(message, type) {
  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastEl.textContent = message;
  toastEl.className = `toast toast-${type} show`;

  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2500);
}

// ─── Settings ──────────────────────────────────────────────────

/**
 * Load API base URL from chrome.storage.local.
 */
async function loadSettings() {
  const result = await chrome.storage.local.get("apiBaseUrl");
  apiBaseUrlInput.value = result.apiBaseUrl || DEFAULT_API_BASE_URL;
}

/**
 * Persist API base URL to chrome.storage.local.
 */
async function saveSettings() {
  const url = apiBaseUrlInput.value.trim();
  if (!url) {
    showToast("API 地址不能为空", "error");
    return;
  }
  await chrome.storage.local.set({ apiBaseUrl: url });
  showToast("设置已保存", "success");
}

// Toggle settings panel
settingsToggle.addEventListener("click", () => {
  const isOpen = settingsBody.classList.toggle("visible");
  settingsToggle.classList.toggle("open", isOpen);
});

saveSettingsBtn.addEventListener("click", saveSettings);

// ─── Fetch Job Info from Content Script ────────────────────────

/**
 * Send a message to the content script in the active tab
 * to extract job information from the current page.
 */
async function fetchJobInfoFromPage() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.id) {
      return null;
    }

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "EXTRACT_JOB_INFO",
    });

    if (response && response.data) {
      return response.data;
    }

    return null;
  } catch (err) {
    // Content script may not be injected (e.g., chrome:// pages)
    console.warn("Failed to get job info from content script:", err);
    return null;
  }
}

/**
 * Fill the form with extracted job information.
 */
function fillForm(jobInfo) {
  companyInput.value = jobInfo.company || "";
  titleInput.value = jobInfo.title || "";
  locationInput.value = jobInfo.location || "";
  sourceUrlInput.value = jobInfo.sourceUrl || "";
  jdTextarea.value = jobInfo.jd || "";

  // Show hint only when we truly got nothing useful
  const hasSomeData =
    jobInfo.company || jobInfo.title || jobInfo.location || jobInfo.jd;
  noDataHint.classList.toggle("visible", !hasSomeData);
}

/**
 * Clear the form.
 */
function clearForm() {
  companyInput.value = "";
  titleInput.value = "";
  locationInput.value = "";
  sourceUrlInput.value = "";
  jdTextarea.value = "";
  noDataHint.classList.remove("visible");
}

// ─── Save Job ───────────────────────────────────────────────────

let isSaving = false;

/**
 * Collect form data and send to background for API submission.
 */
async function saveJob() {
  if (isSaving) return;

  const company = companyInput.value.trim();
  const title = titleInput.value.trim();

  // Basic validation
  if (!company && !title) {
    showToast("请至少填写公司名称或岗位名称", "error");
    return;
  }

  isSaving = true;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span> 保存中...';

  const jobData = {
    company,
    title,
    location: locationInput.value.trim(),
    salary: "",
    sourceUrl: sourceUrlInput.value.trim(),
    jd: jdTextarea.value.trim(),
  };

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_JOB",
      data: jobData,
    });

    if (response && response.success) {
      showToast("岗位保存成功!", "success");
      clearForm();
    } else {
      const errorMsg =
        response?.error || "保存失败，请检查 API 地址和网络连接";
      showToast(errorMsg, "error");
    }
  } catch (err) {
    console.error("Save job error:", err);
    showToast("保存失败，请重试", "error");
  } finally {
    isSaving = false;
    saveBtn.disabled = false;
    saveBtn.textContent = "保存岗位";
  }
}

saveBtn.addEventListener("click", saveJob);

// ─── Init ───────────────────────────────────────────────────────

async function init() {
  await loadSettings();

  const jobInfo = await fetchJobInfoFromPage();

  if (jobInfo) {
    fillForm(jobInfo);
  } else {
    // Try to set source URL from active tab
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab && tab.url && !tab.url.startsWith("chrome://")) {
        sourceUrlInput.value = tab.url;
      }
    } catch {
      // Ignore
    }
    noDataHint.classList.add("visible");
  }
}

// Bootstrap on popup open
document.addEventListener("DOMContentLoaded", init);
