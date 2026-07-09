/**
 * OfferFlow Chrome Extension - Background Service Worker
 * Handles API communication (fetch POST to backend) and CORS.
 * Runs as a Manifest V3 service worker,不受页面 CSP 限制.
 */

const DEFAULT_API_BASE_URL = "http://localhost:3000";

/**
 * Get the API base URL from storage, falling back to default.
 */
async function getApiBaseUrl() {
  try {
    const result = await chrome.storage.local.get("apiBaseUrl");
    return result.apiBaseUrl || DEFAULT_API_BASE_URL;
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}

/**
 * Send a job data payload to the OfferFlow backend API.
 * Uses fetch with mode: 'cors' from the service worker context
 * (which is not subject to page-level CSP restrictions).
 */
async function saveJobToApi(jobData) {
  const apiBaseUrl = await getApiBaseUrl();
  const url = `${apiBaseUrl.replace(/\/+$/, "")}/api/jobs`;

  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company: jobData.company || "",
        title: jobData.title || "",
        location: jobData.location || "",
        salary: jobData.salary || "",
        url: jobData.sourceUrl || "",
        jdSnapshot: jobData.jd || "",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        error: `API 返回错误 (${response.status}): ${errorText || response.statusText}`,
      };
    }

    const data = await response.json().catch(() => null);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知网络错误";
    return {
      success: false,
      error: `无法连接到 API (${apiBaseUrl}): ${message}`,
    };
  }
}

// ─── Message Listener ──────────────────────────────────────────

/**
 * Listen for messages from the popup.
 */
chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (message.type === "SAVE_JOB" && message.data) {
      saveJobToApi(message.data)
        .then((result) => {
          sendResponse(result);
        })
        .catch((err) => {
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : "保存失败",
          });
        });

      return true;
    }
  }
);

// ─── Extension Install / Update ────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({
      apiBaseUrl: DEFAULT_API_BASE_URL,
    });
  }
});
