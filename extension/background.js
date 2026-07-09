/**
 * OfferFlow Chrome Extension - Background Service Worker
 * Handles API communication and CORS.
 * Supports authentication via NextAuth session cookie.
 */

const DEFAULT_API_BASE_URL = "https://offerflow-six.vercel.app";

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
 * Get stored auth token from storage.
 */
async function getAuthToken() {
  try {
    const result = await chrome.storage.local.get("authToken");
    return result.authToken || null;
  } catch {
    return null;
  }
}

/**
 * Send a job data payload to the OfferFlow backend API.
 * Uses fetch with mode: 'cors' from the service worker context.
 */
async function saveJobToApi(jobData) {
  const apiBaseUrl = await getApiBaseUrl();
  const authToken = await getAuthToken();
  const url = `${apiBaseUrl.replace(/\/+$/, "")}/api/jobs`;

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    // Add auth cookie if available
    if (authToken) {
      headers["Cookie"] = `next-auth.session-token=${authToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      credentials: "include",
      headers,
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
      let errorMsg = `API 返回错误 (${response.status})`;
      if (response.status === 401) {
        errorMsg = "未登录，请先在网页端登录后再使用插件";
      } else if (response.status === 403) {
        errorMsg = "无权限，请检查账号是否正确";
      } else if (errorText) {
        try {
          const errJson = JSON.parse(errorText);
          errorMsg = errJson.error || errorMsg;
        } catch {
          errorMsg += `: ${errorText.substring(0, 100)}`;
        }
      }
      return { success: false, error: errorMsg };
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

/**
 * Validate connection to API by fetching session info.
 */
async function validateConnection(apiBaseUrl) {
  const url = `${apiBaseUrl.replace(/\/+$/, "")}/api/auth/session`;
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json().catch(() => null);
      return { success: true, user: data?.user || null };
    }
    return { success: false, error: `HTTP ${response.status}` };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "连接失败",
    };
  }
}

// ─── Message Listener ──────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (message.type === "SAVE_JOB" && message.data) {
      saveJobToApi(message.data)
        .then((result) => sendResponse(result))
        .catch((err) =>
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : "保存失败",
          })
        );
      return true;
    }

    if (message.type === "VALIDATE_CONNECTION") {
      validateConnection(message.data?.apiBaseUrl)
        .then((result) => sendResponse(result))
        .catch((err) =>
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : "验证失败",
          })
        );
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
