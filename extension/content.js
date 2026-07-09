/**
 * OfferFlow Chrome Extension - Content Script
 * Injected into all http/https pages to extract job posting information.
 * Uses multi-strategy extraction with dedicated support for Chinese platforms:
 * - BOSS直聘 (zhipin.com)
 * - 拉勾招聘 (lagou.com)
 * - 牛客网 (nowcoder.com)
 * - Plus generic fallback for other platforms
 */

// ─── Helper Utilities ──────────────────────────────────────────

/**
 * Try to find the first non-empty text content from a list of CSS selectors.
 */
function getTextFromSelectors(selectors) {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = (el.textContent || "").trim();
        if (text && text.length > 0 && text.length < 200) {
          return text;
        }
      }
    } catch {
      // Invalid selector, skip
    }
  }
  return "";
}

/**
 * Try to find the first non-empty text content matching any selector
 * across all matching elements (returns the first with meaningful content).
 */
function getFirstMatchingText(selectors) {
  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = (el.textContent || "").trim();
        if (text && text.length > 1 && text.length < 200) {
          return text;
        }
      }
    } catch {
      // Invalid selector, skip
    }
  }
  return "";
}

/**
 * Get the inner text of an element, collapsing whitespace.
 */
function getCleanText(el) {
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

/**
 * Check if text looks like a job-related term (heuristic to filter noise).
 */
function looksLikeJobText(text) {
  if (text.length < 2 || text.length > 200) return false;
  const noisePatterns = /^(登录|注册|首页|搜索|导航|招聘|求职|职位|发现|消息|我的|简历|menu|home|search|login|sign|nav|footer|header|cookie|privacy|terms|立即|下载|沟通|牛客|精选|推荐|热榜|社区|商城)/i;
  if (noisePatterns.test(text)) return false;
  return true;
}

/**
 * Detect which recruitment platform the current page belongs to.
 */
function detectPlatform() {
  const hostname = window.location.hostname;
  // Chinese platforms
  if (hostname.includes("zhipin.com")) return "zhipin";
  if (hostname.includes("lagou.com")) return "lagou";
  if (hostname.includes("nowcoder.com")) return "nowcoder";
  if (hostname.includes("liepin.com")) return "liepin";
  if (hostname.includes("51job.com")) return "51job";
  if (hostname.includes("zhaopin.com")) return "zhaopin";
  if (hostname.includes("linkedin.com")) return "linkedin";
  // Chinese enterprise career pages
  if (hostname.includes("bytedance.com") || hostname.includes("jobs.bytedance")) return "bytedance";
  if (hostname.includes("talent.alibaba") || hostname.includes("job.alibaba") || hostname.includes("careers.alibaba")) return "alibaba";
  if (hostname.includes("careers.tencent") || hostname.includes("tencentcareer") || hostname.includes("join.qq")) return "tencent";
  if (hostname.includes("zhaopin.meituan") || hostname.includes("meituan.wd")) return "meituan";
  if (hostname.includes("zhaopin.jd") || hostname.includes("hr.jd") || hostname.includes("campus.jd")) return "jd";
  if (hostname.includes("campus-talent.alibaba")) return "alibaba";
  // International ATS/Job Board SaaS
  if (hostname.includes("greenhouse.io") || hostname.includes("boards.greenhouse")) return "greenhouse";
  if (hostname.includes("lever.co") || hostname.includes("jobs.lever")) return "lever";
  if (hostname.includes("myworkdayjobs.com") || hostname.includes("workday.com")) return "workday";
  if (hostname.includes("smartrecruiters.com")) return "smartrecruiters";
  if (hostname.includes("icims.com")) return "icims";
  if (hostname.includes("ashbyhq.com")) return "ashby";
  return "generic";
}

// ─── Platform-Specific Extraction ──────────────────────────────

/**
 * Extract job info from BOSS直聘 (zhipin.com)
 * DOM structure may change quarterly; uses multiple fallback selectors.
 */
function extractFromZhipin() {
  let company = "";
  let title = "";
  let location = "";
  let salary = "";
  let jd = "";

  // Job title: .job-name is the primary selector across list and detail pages
  // Detail page also has it in h1 within .job-header
  title = getTextFromSelectors([
    ".job-info .job-name",
    ".job-header h1",
    ".job-name",
    "h1.job-name",
  ]);

  // Salary: .salary span
  salary = getTextFromSelectors([
    ".job-info .salary",
    ".job-header .salary",
    ".salary",
  ]);

  // Location: .job-area
  location = getTextFromSelectors([
    ".job-info .job-area",
    ".job-area",
  ]);

  // Company: .company-name a (text content)
  // On detail page, it's inside .company-info or .level-list
  company = getTextFromSelectors([
    ".company-info .company-name",
    ".info-public .company-name",
    ".company-name a",
    ".company-name",
  ]);

  // JD: primary container changed from .job-sec-text to .detail-text-content in newer versions
  jd = "";
  const jdSelectors = [
    ".job-sec-text",
    ".detail-text-content",
    ".job-detail-section .job-sec-text",
    "[class*='job-sec']",
    "[class*='detail-text']",
    "[class*='job-detail'] [class*='text']",
  ];
  for (const sel of jdSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = getCleanText(el);
        if (text && text.length > 30) {
          jd = text;
          break;
        }
      }
    } catch {
      // skip
    }
  }

  return { company, title, location, salary, jd };
}

/**
 * Extract job info from 拉勾招聘 (lagou.com)
 * Note: New version uses Ajax rendering; some fields may not be in DOM initially.
 */
function extractFromLagou() {
  let company = "";
  let title = "";
  let location = "";
  let salary = "";
  let jd = "";

  // Job title
  title = getTextFromSelectors([
    ".job-name .job-name-title",
    ".job-name span",
    ".job-name",
    "div.job-name",
    "[data-lg-tj-id='0101'] .position-name",
  ]);

  // Company: sometimes in img alt, sometimes in text
  const companyImg = document.querySelector("img.company-logo, img.b2");
  if (companyImg && companyImg.alt) {
    company = companyImg.alt.trim();
  }
  if (!company) {
    company = getTextFromSelectors([
      ".company-name",
      ".company_info .company-name a",
      "[data-lg-tj-id='0202'] .company-name",
    ]);
  }

  // Salary
  salary = getTextFromSelectors([
    ".job-request .salary",
    ".job_request span:first-child",
    ".salary",
    "[class*='money']",
  ]);

  // Location
  location = getTextFromSelectors([
    ".job-request .add em",
    ".job_request span:nth-child(2)",
    "[class*='add'] [class*='em']",
  ]);

  // JD
  jd = "";
  const jdSelectors = [
    ".job-detail .job_bt div",
    ".job_bt div",
    ".job-detail .content",
    "[class*='job-detail'] [class*='bt']",
    "[class*='job-detail'] [class*='content']",
  ];
  for (const sel of jdSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = getCleanText(el);
        if (text && text.length > 30) {
          jd = text;
          break;
        }
      }
    } catch {
      // skip
    }
  }

  return { company, title, location, salary, jd };
}

/**
 * Extract job info from 牛客网 (nowcoder.com)
 */
function extractFromNowcoder() {
  let company = "";
  let title = "";
  let location = "";
  let salary = "";
  let jd = "";

  // Job title
  title = getTextFromSelectors([
    "span.job-name",
    ".job-card-item .job-name",
    "h1.job-name",
    ".job-title",
  ]);

  // Company
  company = getTextFromSelectors([
    "div.company-name",
    ".job-card-item .company-name",
    ".company-name a",
    "a.company-name",
  ]);

  // Salary
  salary = getTextFromSelectors([
    "span.job-salary",
    "[class*='job-salary']",
    "[class*='salary']",
  ]);

  // Location
  location = getTextFromSelectors([
    ".job-info-item",
    "[class*='job-info'] [class*='item']",
    "[class*='job-city']",
    "[class*='city-name']",
  ]);

  // JD
  jd = "";
  const jdSelectors = [
    "[class*='job-detail']",
    "[class*='job-desc']",
    "[class*='detail-content']",
    "[class*='position-desc']",
  ];
  for (const sel of jdSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = getCleanText(el);
        if (text && text.length > 30) {
          jd = text;
          break;
        }
      }
    } catch {
      // skip
    }
  }

  return { company, title, location, salary, jd };
}

// ─── Chinese Enterprise Career Pages ────────────────────────────

/**
 * Extract job info from 字节跳动 (jobs.bytedance.com)
 * React SPA with hashed class names; uses prefix matching for stability.
 */
/**
 * Extract job info from 字节跳动 (jobs.bytedance.com)
 * Supports both detail page and list page.
 * Verified on actual DOM: 2025-07-08
 */
function extractFromBytedance() {
  let title = "";
  let location = "";
  let jd = "";

  // Detect if we're on detail page or list page
  const isDetailPage = window.location.pathname.includes("/detail");

  if (isDetailPage) {
    // ─── Detail Page ─────────────────────────────────────────
    // Job title: span.job-title (verified on actual page)
    const titleEl = document.querySelector("span.job-title, .job-title");
    if (titleEl) title = getCleanText(titleEl);

    // Location: inside .job-info span (verified)
    const jobInfoEl = document.querySelector(".job-info");
    if (jobInfoEl) {
      const locSpan = jobInfoEl.querySelector("span");
      if (locSpan) location = getCleanText(locSpan);
    }
    // Fallback: try standalone spans in header area
    if (!location) {
      location = getTextFromSelectors([
        ".job-info span",
        "[class*='job-info'] span",
      ]);
    }

    // JD: paired .block-title + .block-content structure (verified)
    // Look for "职位描述" and "职位要求" headings, grab their next sibling .block-content
    const blockTitles = document.querySelectorAll(".block-title");
    let jdParts = [];
    for (const bt of blockTitles) {
      const headingText = getCleanText(bt);
      if (headingText.includes("职位描述") || headingText.includes("职位要求") || headingText.includes("岗位职责")) {
        const contentEl = bt.nextElementSibling;
        if (contentEl && contentEl.classList.contains("block-content")) {
          const contentText = getCleanText(contentEl);
          if (contentText.length > 10) {
            jdParts.push(headingText + "\n" + contentText);
          }
        }
      }
    }
    if (jdParts.length > 0) {
      jd = jdParts.join("\n\n");
    }
    // Fallback: any .block-content with substantial text
    if (!jd) {
      jd = extractTextFromSelectors([
        ".block-content",
        "[class*='block-content']",
      ]);
    }
  } else {
    // ─── List Page ───────────────────────────────────────────
    // Job title: span.positionItem-title-text (verified on actual list page)
    title = getTextFromSelectors([
      "span.positionItem-title-text",
      "[class*='positionItem-title-text']",
      "[class*='positionItem-title']",
      "[class*='position-title']",
    ]);

    // On list page, location is embedded in the card text or not separately shown
    // Try to extract from visible location labels in the card
    location = getTextFromSelectors([
      "[class*='positionItem-subTitle']",
      "[class*='position-subtitle']",
      "[class*='job-area']",
      "[class*='location']",
    ]);
  }

  // Company: always 字节跳动, or extract from page title as fallback
  let company = "字节跳动";
  const pageTitle = document.title;
  if (pageTitle && pageTitle.includes(" - 字节跳动")) {
    company = "字节跳动"; // confirmed
  }

  return { company, title, location, salary: "", jd };
}

/**
 * Extract job info from 阿里巴巴 (talent.alibaba.com / campus-talent.alibaba.com)
 * VERIFIED:
 * - 社招: Uses CSS Modules (random hashed class names). Relies on page title,
 *   heading structure, and smart fallback.
 * - 校招: campus-talent.alibaba.com uses CSS Modules with CampusPositionDetail prefix.
 */
function extractFromAlibaba() {
  let title = "";
  let location = "";
  let jd = "";

  const hostname = window.location.hostname;
  const isCampus = hostname.includes("campus-talent.alibaba");

  if (isCampus) {
    // ─── 校招页面 (campus-talent.alibaba.com) ────────────────
    // 岗位名称: CSS Modules with CampusPositionDetail--name prefix
    const titleEl = document.querySelector("[class*='CampusPositionDetail--name']");
    if (titleEl) title = getCleanText(titleEl);

    // 工作地点: CampusPositionDetail--text--* contains city info
    const basicItems = document.querySelectorAll("[class*='CampusPositionDetail--basicItem']");
    for (const item of basicItems) {
      const text = getCleanText(item);
      if (text.includes(" / ") || /\b(北京|上海|广州|深圳|杭州|成都|武汉|南京|西安|苏州)\b/.test(text)) {
        location = text;
        break;
      }
    }
    if (!location) {
      const textEls = document.querySelectorAll("[class*='CampusPositionDetail--text']");
      for (const el of textEls) {
        const text = getCleanText(el);
        if (text.includes(" / ") || /\b(北京|上海|广州|深圳|杭州|成都|武汉|南京|西安|苏州)\b/.test(text)) {
          location = text;
          break;
        }
      }
    }

    // JD: CampusPositionDetail--bodyContent--* contains sections
    const bodyContent = document.querySelector("[class*='CampusPositionDetail--bodyContent']");
    if (bodyContent) {
      const sections = bodyContent.querySelectorAll("[class*='CampusPositionDetail--title']");
      const jdParts = [];
      for (const sec of sections) {
        const heading = getCleanText(sec);
        if (heading.includes("职位描述") || heading.includes("职位要求") || heading.includes("岗位要求") || heading.includes("岗位职责")) {
          // Get the next sibling content area
          const parent = sec.parentElement;
          if (parent) {
            const contentEl = parent.querySelector("[class*='CampusPositionDetail--content']");
            if (contentEl) {
              const text = getCleanText(contentEl);
              if (text.length > 10) jdParts.push(heading + "\n" + text);
            }
          }
        }
      }
      if (jdParts.length > 0) jd = jdParts.join("\n\n");
    }

    // Fallback: parse from page title
    if (!title) {
      const pageTitle = document.title;
      if (pageTitle && pageTitle.includes("阿里巴巴")) {
        const sep = pageTitle.indexOf(" - ");
        if (sep > 0) title = pageTitle.substring(0, sep).trim();
      }
    }
  } else {
    // ─── 社招页面 (talent.alibaba.com) ───────────────────────
    // 1. Parse page title: "XX岗位 - 阿里巴巴集团招聘官网"
    const pageTitle = document.title;
    if (pageTitle && pageTitle.includes("阿里巴巴")) {
      const sep = pageTitle.indexOf(" - ");
      if (sep > 0) {
        title = pageTitle.substring(0, sep).trim();
      }
    }

    // 2. Try h1/h2 headings (Alibaba uses semantic headings)
    if (!title) {
      const h1 = document.querySelector("h1");
      if (h1) title = getCleanText(h1);
    }
    if (!title) {
      const h2 = document.querySelector("h2");
      if (h2) title = getCleanText(h2);
    }

    // 3. Try to find location from visible text (city names in spans)
    const bodyText = getCleanText(document.body);
    const cityPatterns = [
      /\b(杭州|北京|上海|深圳|广州|成都|武汉|南京|西安|苏州)\b/,
    ];
    for (const pattern of cityPatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        location = match[1];
        break;
      }
    }

    // 4. JD: since class names are hashed, use keyword-based heuristic
    const allElements = document.querySelectorAll("h3, h4, p, div, section");
    for (const el of allElements) {
      const text = getCleanText(el);
      if (text.length < 5 || text.length > 100) continue;
      if (text === "职位描述" || text === "职位要求" || text === "岗位要求" || text === "岗位职责") {
        let sibling = el.nextElementSibling;
        let blockCount = 0;
        let jdText = "";
        while (sibling && blockCount < 10) {
          const st = getCleanText(sibling);
          if (st && st.length > 10) {
            jdText += st + "\n";
          }
          if (/^h[1-4]$/i.test(sibling.tagName) && st.length < 80) break;
          sibling = sibling.nextElementSibling;
          blockCount++;
        }
        if (jdText.length > 30) {
          jd = (jd ? jd + "\n\n" : "") + text + "\n" + jdText.trim();
        }
      }
    }
  }

  // Fallback: largest text block
  if (!jd) {
    const fallback = extractSmartFallback();
    if (!jd && fallback.jd) jd = fallback.jd;
    if (!location && fallback.location) location = fallback.location;
  }

  return { company: "阿里巴巴", title, location, salary: "", jd };
}

/**
 * Extract job info from 腾讯 (careers.tencent.com / join.qq.com)
 * VERIFIED on actual page:
 * - 社招: span.job-recruit-title, span.job-recruit-location
 * - 校招: .bannerItemText, ul.post_detail li.detail_box
 */
function extractFromTencent() {
  let title = "";
  let location = "";
  let jd = "";

  const hostname = window.location.hostname;
  const isCampus = hostname.includes("join.qq");

  if (isCampus) {
    // ─── 校招页面 (join.qq.com) ──────────────────────────────
    const isDetailPage = window.location.pathname.includes("/post_detail");

    if (isDetailPage) {
      // 校招详情页
      const titleEl = document.querySelector(".bannerItemText, [class*='bannerItemText']");
      if (titleEl) title = getCleanText(titleEl);

      // 地点在 "参加面试的城市" 部分
      const cityItems = document.querySelectorAll("li.detail_box");
      for (const item of cityItems) {
        const subtitle = item.querySelector(".subtitle");
        if (subtitle && getCleanText(subtitle).includes("城市")) {
          const textEl = item.querySelector(".detail_text, .text_box");
          if (textEl) location = getCleanText(textEl);
        }
      }

      // JD: ul.post_detail 下的 li.detail_box
      const jdParts = [];
      for (const item of cityItems) {
        const subtitle = item.querySelector(".subtitle");
        if (!subtitle) continue;
        const heading = getCleanText(subtitle);
        if (heading.includes("岗位描述") || heading.includes("岗位要求") || heading.includes("岗位职责")) {
          const textEl = item.querySelector(".detail_text, .text_box");
          if (textEl) {
            const text = getCleanText(textEl);
            if (text.length > 5) jdParts.push(heading + "\n" + text);
          }
        }
      }
      if (jdParts.length > 0) jd = jdParts.join("\n\n");
    } else {
      // 校招列表页
      title = getTextFromSelectors([
        ".bannerItemText",
        "[class*='bannerItemText']",
        "[class*='position-title']",
        "h1",
      ]);
    }
  } else {
    // ─── 社招页面 (careers.tencent.com) ──────────────────────
    const isDetailPage = document.querySelector(".job-detail, [class*='job-detail']") !== null
      || window.location.href.includes("/job/");

    if (isDetailPage) {
      // 社招详情页
      title = getTextFromSelectors([
        "span.job-recruit-title",
        ".job-recruit-title",
        "[class*='job-title']",
        "[class*='position-title']",
        "h1",
      ]);
      location = getTextFromSelectors([
        "span.job-recruit-location",
        ".job-recruit-location",
        "[class*='job-location']",
        "[class*='location']",
      ]);
      // JD: .work-module 结构
      const modules = document.querySelectorAll(".work-module, [class*='work-module']");
      const jdParts = [];
      for (const m of modules) {
        const titleEl = m.querySelector(".duty-title, [class*='duty-title'], [class*='title']");
        const contentEl = m.querySelector("p, [class*='content'], [class*='text']");
        if (titleEl && contentEl) {
          const heading = getCleanText(titleEl);
          const text = getCleanText(contentEl);
          if (text.length > 10) jdParts.push(heading + "\n" + text);
        }
      }
      if (jdParts.length > 0) jd = jdParts.join("\n\n");
      if (!jd) {
        jd = extractTextFromSelectors([
          ".job-detail",
          "[class*='job-detail']",
          "[class*='job-desc']",
          "[class*='detail-content']",
        ]);
      }
    } else {
      // 社招列表页
      title = getTextFromSelectors([
        "span.job-recruit-title",
        ".job-recruit-title",
        "[class*='recruit-title']",
        "h1",
      ]);
      location = getTextFromSelectors([
        "span.job-recruit-location",
        ".job-recruit-location",
        "[class*='location']",
      ]);
    }
  }

  return { company: "腾讯", title, location, salary: "", jd };
}

/**
 * Extract job info from 美团 (zhaopin.meituan.com)
 * VERIFIED on actual page:
 * - 社招 List: .postion_name (note the typo in class name), .position_list_item
 * - 校招/实习 Detail: .postion_name, .positin_detail_info_item with .title + .desc
 */
function extractFromMeituan() {
  let title = "";
  let location = "";
  let jd = "";

  const isDetailPage = window.location.href.includes("/job/")
    || window.location.href.includes("/position/detail")
    || document.querySelector("[class*='job-detail'], [class*='position-detail'], [class*='positin_detail']") !== null;

  if (isDetailPage) {
    // Detail page - verified on both 社招 and 校招/实习
    title = getTextFromSelectors([
      ".postion_name",
      "[class*='postion_name']",
      ".title.hidden-ellipsis",
      "[class*='job-title']",
      "[class*='position-title']",
      "h1",
    ]);
    location = getTextFromSelectors([
      ".split_line_box_item.city",
      "[class*='city']",
      "[class*='location']",
    ]);

    // JD: try 校招/实习 structure first (.positin_detail_info_item)
    const infoItems = document.querySelectorAll(".positin_detail_info_item, [class*='positin_detail_info_item']");
    if (infoItems.length > 0) {
      const jdParts = [];
      for (const item of infoItems) {
        const titleEl = item.querySelector(".title, [class*='title']");
        const descEls = item.querySelectorAll(".desc, [class*='desc']");
        if (titleEl && descEls.length > 0) {
          const heading = getCleanText(titleEl);
          if (heading.includes("岗位") || heading.includes("职责") || heading.includes("要求") || heading.includes("描述")) {
            const texts = Array.from(descEls).map(el => getCleanText(el)).filter(t => t.length > 5);
            if (texts.length > 0) {
              jdParts.push(heading + "\n" + texts.join("\n"));
            }
          }
        }
      }
      if (jdParts.length > 0) jd = jdParts.join("\n\n");
    }

    // Fallback: generic selectors
    if (!jd) {
      jd = extractTextFromSelectors([
        "[class*='job-desc']",
        "[class*='position-desc']",
        "[class*='job-detail']",
        "[class*='detail-content']",
        "[class*='desc-section']",
      ]);
    }
  } else {
    // List page (verified on zhaopin.meituan.com/web/position)
    // Job title: .postion_name (typo in actual DOM!) or .title.hidden-ellipsis
    const firstItem = document.querySelector(".position_list_item");
    if (firstItem) {
      const nameEl = firstItem.querySelector(".postion_name, [class*='postion_name'], .title.hidden-ellipsis");
      if (nameEl) title = getCleanText(nameEl);

      const cityEl = firstItem.querySelector(".split_line_box_item.city, .zp_clamp_string");
      if (cityEl) location = getCleanText(cityEl);
    }

    // Fallback: get from any matching element on page
    if (!title) {
      title = getTextFromSelectors([
        ".postion_name",
        "[class*='postion_name']",
        ".title.hidden-ellipsis",
        "[class*='job-title']",
        "[class*='position-title']",
        "h1",
      ]);
    }
    if (!location) {
      location = getTextFromSelectors([
        ".split_line_box_item.city",
        ".zp_clamp_string",
        "[class*='city']",
        "[class*='location']",
      ]);
    }
  }

  return { company: "美团", title, location, salary: "", jd };
}

/**
 * Extract job info from 京东 (zhaopin.jd.com / hr.jd.com / campus.jd.com)
 * VERIFIED on actual page:
 * - 社招: table-based layout with td.first-cell for job names
 * - 校招/实习: campus.jd.com requires login; limited extraction possible
 */
function extractFromJD() {
  let title = "";
  let location = "";
  let jd = "";

  const hostname = window.location.hostname;
  const isCampus = hostname.includes("campus.jd");

  if (isCampus) {
    // ─── 校招/实习页面 (campus.jd.com) ───────────────────────
    // NOTE: campus.jd.com requires login for most content.
    // We attempt to extract whatever is visible on the current page.
    title = getTextFromSelectors([
      "h1",
      "h2",
      "[class*='job-title']",
      "[class*='position-title']",
      "[class*='job-name']",
    ]);
    location = getTextFromSelectors([
      "[class*='location']",
      "[class*='job-area']",
      "[class*='city']",
    ]);
    jd = extractTextFromSelectors([
      "[class*='job-desc']",
      "[class*='job-detail']",
      "[class*='detail-content']",
      "[class*='desc-section']",
    ]);

    // If still no title, try page title
    if (!title) {
      const pageTitle = document.title;
      if (pageTitle && pageTitle.includes("京东")) {
        const sep = pageTitle.indexOf(" - ");
        if (sep > 0) title = pageTitle.substring(0, sep).trim();
      }
    }
  } else {
    // ─── 社招页面 (zhaopin.jd.com / hr.jd.com) ───────────────
    const isDetailPage = window.location.href.includes("/job/")
      || document.querySelector("[class*='job-detail'], [class*='position-detail']") !== null;

    if (isDetailPage) {
      // Detail page
      title = getTextFromSelectors([
        "[class*='job-name']",
        "[class*='position-name']",
        "[class*='job-title']",
        "h1",
      ]);
      location = getTextFromSelectors([
        "[class*='location']",
        "[class*='job-area']",
        "[class*='city']",
      ]);
      jd = extractTextFromSelectors([
        "[class*='job-desc']",
        "[class*='job-detail']",
        "[class*='detail-content']",
        "[class*='desc-section']",
      ]);
    } else {
      // List page / home page (verified on zhaopin.jd.com/home)
      // Table layout: td.first-cell contains job name link
      const table = document.querySelector(".table-box, table");
      if (table) {
        const firstRow = table.querySelector("tr");
        if (firstRow) {
          const cells = firstRow.querySelectorAll("td");
          if (cells.length >= 1) {
            const nameCell = cells[0];
            const link = nameCell.querySelector("a");
            title = link ? getCleanText(link) : getCleanText(nameCell);
          }
          if (cells.length >= 3) {
            location = getCleanText(cells[2]);
          }
        }
      }

      // Fallback if no table found
      if (!title) {
        title = getTextFromSelectors([
          "td.first-cell a",
          "td.first-cell",
          "[class*='job-name']",
          "[class*='position-name']",
          "h1",
        ]);
      }
      if (!location) {
        location = getTextFromSelectors([
          "[class*='location']",
          "[class*='job-area']",
          "[class*='city']",
        ]);
      }
    }
  }

  return { company: "京东", title, location, salary: "", jd };
}

// ─── International ATS / Job Board SaaS ─────────────────────────

/**
 * Extract job info from Greenhouse (boards.greenhouse.io)
 * Standard template; also works for companies using custom Greenhouse boards.
 */
function extractFromGreenhouse() {
  return {
    company: getTextFromSelectors([
      "h1",
      "[class*='company-name']",
      ".job-board .company-name",
    ]),
    title: getTextFromSelectors([
      "h2.app-title",
      ".job-title",
      "[class*='job-title']",
      ".opening h3 a",
      "h1",
    ]),
    location: getTextFromSelectors([
      ".location",
      "[class*='location']",
      ".opening .location",
    ]),
    salary: getTextFromSelectors([
      "[class*='salary']",
      "[class*='compensation']",
    ]),
    jd: extractTextFromSelectors([
      "#content",
      ".job-description",
      "[class*='job-description']",
      "div.section-page",
      "[class*='section-page']",
    ]),
  };
}

/**
 * Extract job info from Lever (jobs.lever.co)
 * Standard Lever job board template.
 */
function extractFromLever() {
  return {
    company: getTextFromSelectors([
      "h1",
      "[class*='company-name']",
      "header h1",
    ]),
    title: getTextFromSelectors([
      "h2.posting-headline",
      ".posting-title",
      "[class*='posting-title']",
      ".posting h5",
      "h1",
    ]),
    location: getTextFromSelectors([
      ".posting-location",
      ".location",
      "[class*='posting-location']",
      ".posting-categories .location",
      "[class*='location']",
    ]),
    salary: getTextFromSelectors([
      "[class*='salary']",
      "[class*='compensation']",
      "[class*='pay']",
    ]),
    jd: extractTextFromSelectors([
      ".posting-body .section-description",
      ".section-description",
      "[class*='section-description']",
      ".posting-description",
      "[class*='posting-description']",
      "[class*='description']",
    ]),
  };
}

/**
 * Extract job info from Workday (myworkdayjobs.com)
 * React SPA with auto-generated hashed class names.
 * Relies on data-testid and data-automation-id attributes.
 */
function extractFromWorkday() {
  return {
    company: getTextFromSelectors([
      "h1",
      "[data-testid='header-company-name']",
      "[class*='company-name']",
    ]),
    title: getTextFromSelectors([
      "[data-testid='job-title']",
      "[data-automation-id='job-title']",
      "[aria-label*='title']",
      "h2",
      "h1",
    ]),
    location: getTextFromSelectors([
      "[data-testid='job-location']",
      "[data-automation-id='job-location']",
      "[class*='location']",
      "[class*='job-location']",
    ]),
    salary: getTextFromSelectors([
      "[class*='salary']",
      "[class*='compensation']",
      "[data-testid='job-salary']",
    ]),
    jd: extractTextFromSelectors([
      "[data-testid='job-description']",
      "[data-automation-id='job-description']",
      "[class*='job-description']",
      "[class*='job-desc']",
      "[class*='detail-content']",
      "[class*='section-description']",
    ]),
  };
}

/**
 * Extract job info from SmartRecruiters (smartrecruiters.com)
 */
function extractFromSmartRecruiters() {
  return {
    company: getTextFromSelectors([
      "[class*='company-name']",
      "h1",
      "[class*='company']",
    ]),
    title: getTextFromSelectors([
      "[class*='job-title']",
      "[class*='posting-title']",
      "[class*='position-title']",
      "h1",
    ]),
    location: getTextFromSelectors([
      "[class*='location']",
      "[class*='job-location']",
    ]),
    salary: getTextFromSelectors([
      "[class*='salary']",
      "[class*='compensation']",
    ]),
    jd: extractTextFromSelectors([
      "[class*='job-description']",
      "[class*='job-desc']",
      "[class*='section-description']",
      "[class*='detail-content']",
    ]),
  };
}

/**
 * Extract job info from iCIMS (icims.com)
 */
function extractFromICIMS() {
  return {
    company: getTextFromSelectors([
      "[class*='company-name']",
      "h1",
      "[class*='company']",
    ]),
    title: getTextFromSelectors([
      "[class*='job-title']",
      "[class*='posting-title']",
      "[class*='iCIMS_Header'] h2",
      "h1",
    ]),
    location: getTextFromSelectors([
      "[class*='location']",
      "[class*='job-location']",
      "[class*='iCIMS_Location']",
    ]),
    salary: getTextFromSelectors([
      "[class*='salary']",
      "[class*='compensation']",
    ]),
    jd: extractTextFromSelectors([
      "[class*='job-description']",
      "[class*='iCIMS_Info']",
      "[class*='section-description']",
      "[class*='detail-content']",
    ]),
  };
}

/**
 * Extract job info from Ashby (ashbyhq.com)
 */
function extractFromAshby() {
  return {
    company: getTextFromSelectors([
      "h1",
      "[class*='company-name']",
      "[class*='company']",
    ]),
    title: getTextFromSelectors([
      "[class*='job-title']",
      "[class*='posting-title']",
      "[class*='position-title']",
      "h1",
    ]),
    location: getTextFromSelectors([
      "[class*='location']",
      "[class*='job-location']",
    ]),
    salary: getTextFromSelectors([
      "[class*='salary']",
      "[class*='compensation']",
    ]),
    jd: extractTextFromSelectors([
      "[class*='job-description']",
      "[class*='section-description']",
      "[class*='posting-body']",
      "[class*='detail-content']",
    ]),
  };
}

// ─── Smart Heuristic Fallback ───────────────────────────────────

/**
 * Helper: try multiple selectors for JD text (returns first match > threshold length).
 */
function extractTextFromSelectors(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = getCleanText(el);
        if (text && text.length > 30) return text;
      }
    } catch {
      // skip
    }
  }
  return "";
}

/**
 * Smart heuristic fallback: when all platform-specific and generic selectors fail,
 * try to find useful information by analyzing page structure.
 *
 * Strategy:
 * 1. Find the largest/most prominent heading as job title
 * 2. Search for Chinese keywords near headings (岗位职责, 职位描述, 任职要求, etc.)
 * 3. Extract text blocks near those keywords as JD content
 * 4. Try to find location patterns in text (XX市, XX区, etc.)
 */
function extractSmartFallback() {
  let title = "";
  let jd = "";
  let location = "";
  let company = "";

  // 1. Find the most prominent heading (h1 > h2 > h3) that looks like a job title
  const headings = document.querySelectorAll("h1, h2, h3");
  for (const h of headings) {
    const text = getCleanText(h);
    if (text && text.length > 2 && text.length < 80 && looksLikeJobText(text)) {
      title = text;
      break;
    }
  }

  // 2. Search for JD-related Chinese keywords in the page, extract nearby text
  const jdKeywords = [
    "岗位职责", "职位描述", "任职要求", "岗位要求", "工作职责",
    "职位要求", "岗位描述", "工作内容", "Job Description",
    "job description", "responsibilities", "requirements", "qualifications",
    "what you'll do", "what you will do", "about the role", "about the position",
  ];

  // Walk all text nodes looking for keyword matches, then grab parent block content
  const allElements = document.querySelectorAll("h2, h3, h4, p, div, section, li");
  for (const el of allElements) {
    const text = getCleanText(el);
    if (text.length < 5 || text.length > 200) continue;
    const lowerText = text.toLowerCase();
    for (const keyword of jdKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        // Found a keyword heading — grab the next sibling section(s) as JD content
        let jdText = "";
        let sibling = el.nextElementSibling;
        let blockCount = 0;
        while (sibling && blockCount < 10) {
          const siblingText = getCleanText(sibling);
          if (siblingText && siblingText.length > 10) {
            jdText += siblingText + "\n";
          }
          // Stop at next heading or major section break
          if (siblingText.length < 80 && /^h[1-4]$/i.test(sibling.tagName)) break;
          sibling = sibling.nextElementSibling;
          blockCount++;
        }
        if (jdText.length > 30) {
          jd = jdText.trim();
          break;
        }
      }
    }
    if (jd) break;
  }

  // 3. If no keyword found, try the largest text block on the page (likely JD area)
  if (!jd) {
    let longestBlock = "";
    const blocks = document.querySelectorAll("div, section, article, main");
    for (const block of blocks) {
      // Only consider direct text content (not nested in child blocks)
      const directText = getCleanText(block);
      if (directText.length > longestBlock.length && directText.length > 100 && directText.length < 10000) {
        longestBlock = directText;
      }
    }
    if (longestBlock.length > 100) {
      jd = longestBlock.substring(0, 5000);
    }
  }

  // 4. Try to find Chinese city/location patterns in page text
  const bodyText = getCleanText(document.body);
  const cityPatterns = [
    /\b([\u4e00-\u9fa5]+(?:市|省|区|县|自治州))\b/,
    /\b(北京|上海|广州|深圳|杭州|成都|武汉|南京|重庆|西安|苏州|天津|长沙|郑州|东莞|青岛|沈阳|宁波|昆明|大连|厦门|合肥|福州|哈尔滨|济南、温州、南宁、长春、泉州、石家庄、贵阳、南昌、金华、常州、惠州、珠海、嘉兴、太原、台州、中山、乌鲁木齐|洛阳|保定|廊坊|呼和浩特|兰州|海口|银川|西宁|海口)\b/,
  ];
  for (const pattern of cityPatterns) {
    const match = bodyText.match(pattern);
    if (match) {
      location = match[1];
      break;
    }
  }

  // 5. Try to extract company from logo alt text or structured org data
  const logoImg = document.querySelector("img[alt]");
  if (logoImg && logoImg.alt && logoImg.alt.length < 50) {
    company = logoImg.alt.trim();
  }
  if (!company) {
    const orgEl = document.querySelector('[itemtype*="Organization"] [itemprop="name"], [itemtype*="organization"] [itemprop="name"]');
    if (orgEl) company = getCleanText(orgEl);
  }

  return { company, title, location, salary: "", jd };
}

// ─── Generic Extraction Strategies ─────────────────────────────

/**
 * Strategy: CSS class/id based selectors for general platforms.
 */
const COMPANY_SELECTORS = [
  ".company-name", ".companyName", ".company_name",
  ".employer-name", ".corp-name", ".org-name",
  "[class*='company']", "[class*='Company']",
  "[class*='corp']", "[class*='employer']",
  "[data-company]", "[data-employer]",
  '[itemtype="http://schema.org/Organization"] [itemprop="name"]',
  '[itemtype="https://schema.org/Organization"] [itemprop="name"]',
  ".job-company", ".detail-company", ".position-company",
  ".top-card__flavor--black-light",
];

const TITLE_SELECTORS = [
  ".job-title", ".jobTitle", ".job_name",
  ".position-title", ".positionTitle", ".position_name",
  "[class*='job-title']", "[class*='jobTitle']",
  "[class*='position-title']", "[class*='positionTitle']",
  "[class*='job-name']", "[class*='jobName']",
  "[data-job-title]", "[data-position]",
  "h1",
  '[itemtype="http://schema.org/JobPosting"] [itemprop="title"]',
  '[itemtype="https://schema.org/JobPosting"] [itemprop="title"]',
  ".detail-title", ".vacancy-title", ".posting-title",
  ".top-card__title",
];

const LOCATION_SELECTORS = [
  ".job-location", ".jobLocation", ".job_location",
  ".location-name", "[class*='location']", "[class*='Location']",
  "[data-location]",
  '[itemprop="addressLocality"]', '[itemprop="jobLocation"]',
  ".detail-location", ".position-location", ".work-location",
  "[class*='work-place']", "[class*='workplace']", "[class*='city']",
  "[class*='job-area']", "[class*='area']",
];

const SALARY_SELECTORS = [
  ".job-salary", ".salary", ".job_salary",
  "[class*='salary']", "[class*='Salary']",
  "[class*='compensation']", "[class*='remuneration']",
  "[data-salary]",
  '[itemprop="baseSalary"]',
  ".detail-salary", ".position-salary", ".vacancy-salary",
  "[class*='pay']", "[class*='wage']", "[class*='income']",
];

/**
 * Strategy: JSON-LD structured data extraction.
 */
function extractFromJsonLd() {
  const result = {};
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');

  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || "");
      const items = Array.isArray(data)
        ? data
        : data["@graph"]
          ? Array.isArray(data["@graph"]) ? data["@graph"] : [data["@graph"]]
          : [data];

      for (const item of items) {
        if (item["@type"] === "JobPosting" || item["@type"] === "jobPosting") {
          if (item["title"] && typeof item["title"] === "string") result.title = item["title"];
          if (item["hiringOrganization"]) {
            const org = typeof item["hiringOrganization"] === "string"
              ? item["hiringOrganization"]
              : (item["hiringOrganization"])["name"];
            if (typeof org === "string") result.company = org;
          }
          if (item["jobLocation"]) {
            const loc = item["jobLocation"];
            if (typeof loc === "string") result.location = loc;
            else if (typeof loc === "object" && loc !== null) {
              const addr = (loc)["address"];
              if (typeof addr === "string") result.location = addr;
              else if (typeof addr === "object" && addr !== null) {
                const addrObj = addr;
                result.location = (addrObj["addressLocality"]) || (addrObj["addressRegion"]) || "";
              }
            }
          }
          if (item["baseSalary"]) {
            const salary = item["baseSalary"];
            if (typeof salary === "string") result.salary = salary;
            else if (typeof salary === "object" && salary !== null) {
              const val = (salary)["value"];
              if (typeof val === "object" && val !== null) {
                const v = val;
                result.salary = `${v["min"] || ""}-${v["max"] || ""} ${v["currency"] || ""}`.trim();
              }
            }
          }
          if (item["description"] && typeof item["description"] === "string") {
            result.jd = item["description"];
          }
        }
      }
    } catch {
      // Skip malformed JSON-LD
    }
  }
  return result;
}

/**
 * Strategy: Meta tag fallback.
 */
function extractFromMeta() {
  const result = {};
  const pageTitle = document.title;

  if (pageTitle) {
    // Try "JobTitle - Company" or "JobTitle | Company" patterns
    for (const sep of [" - ", " | ", "_", "--"]) {
      if (pageTitle.includes(sep)) {
        const parts = pageTitle.split(sep);
        if (parts.length >= 2) {
          result.title = parts[0].trim();
          result.company = parts[1].trim();
          break;
        }
      }
    }
    if (!result.title) result.title = pageTitle.trim();
  }

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    const content = metaDesc.getAttribute("content");
    if (content) result.jd = content;
  }

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && !result.title) {
    const content = ogTitle.getAttribute("content");
    if (content) result.title = content;
  }

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && !result.jd) {
    const content = ogDesc.getAttribute("content");
    if (content) result.jd = content;
  }

  return result;
}

/**
 * Strategy: Main content area heuristic for JD text.
 */
function extractJobDescriptionFromDOM() {
  const jdSelectors = [
    ".job-description", ".jobDescription", ".job_detail", ".job-detail",
    ".position-description", ".positionDescription",
    ".detail-desc", ".detail-content",
    ".vacancy-description", ".posting-description",
    "[class*='job-detail']", "[class*='job_detail']",
    "[class*='job_description']",
    "[class*='position-desc']", "[class*='jd-content']",
    "[class*='job-content']", "[class*='detail-body']",
    "[class*='desc-section']",
    '[itemprop="description"]',
    // BOSS直聘 specific
    ".job-sec-text", ".detail-text-content",
    // 拉勾 specific
    ".job_bt", "[class*='job_bt']",
    "main", "article", '[role="main"]',
  ];

  for (const selector of jdSelectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = getCleanText(el);
        if (text && text.length > 50) {
          return text;
        }
      }
    } catch {
      // Invalid selector
    }
  }
  return "";
}

// ─── Main Extraction Function ──────────────────────────────────

/**
 * Extract job information from the current page.
 * First tries platform-specific extraction, then falls back to generic strategies.
 */
function extractJobInfo() {
  let company = "";
  let title = "";
  let location = "";
  let salary = "";
  let jd = "";

  const platform = detectPlatform();

  // Step 1: Platform-specific extraction (highest priority)
  // Chinese recruitment platforms
  if (platform === "zhipin") {
    const data = extractFromZhipin();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  } else if (platform === "lagou") {
    const data = extractFromLagou();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  } else if (platform === "nowcoder") {
    const data = extractFromNowcoder();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  }
  // Chinese enterprise career pages
  else if (platform === "bytedance") {
    const data = extractFromBytedance();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  } else if (platform === "alibaba") {
    const data = extractFromAlibaba();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  } else if (platform === "tencent") {
    const data = extractFromTencent();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  } else if (platform === "meituan") {
    const data = extractFromMeituan();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  } else if (platform === "jd") {
    const data = extractFromJD();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  }
  // International ATS / Job Board SaaS
  else if (platform === "greenhouse") {
    const data = extractFromGreenhouse();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  } else if (platform === "lever") {
    const data = extractFromLever();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  } else if (platform === "workday") {
    const data = extractFromWorkday();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  } else if (platform === "smartrecruiters") {
    const data = extractFromSmartRecruiters();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  } else if (platform === "icims") {
    const data = extractFromICIMS();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  } else if (platform === "ashby") {
    const data = extractFromAshby();
    company = data.company; title = data.title; location = data.location;
    salary = data.salary; jd = data.jd;
  }

  // Step 2: Generic CSS selectors (fill gaps)
  if (!company) company = getFirstMatchingText(COMPANY_SELECTORS);
  if (!title) title = getFirstMatchingText(TITLE_SELECTORS);
  if (!location) location = getFirstMatchingText(LOCATION_SELECTORS);
  if (!salary) salary = getFirstMatchingText(SALARY_SELECTORS);

  // Filter noise from title
  if (title && !looksLikeJobText(title)) {
    title = "";
  }

  // Step 3: JSON-LD structured data (fill remaining gaps)
  const jsonLdData = extractFromJsonLd();
  if (!company && jsonLdData.company) company = jsonLdData.company;
  if (!title && jsonLdData.title) title = jsonLdData.title;
  if (!location && jsonLdData.location) location = jsonLdData.location;
  if (!salary && jsonLdData.salary) salary = jsonLdData.salary;
  if (!jd && jsonLdData.jd) jd = jsonLdData.jd;

  // Step 4: Meta tag fallback
  const metaData = extractFromMeta();
  if (!company && metaData.company) company = metaData.company;
  if (!title && metaData.title) title = metaData.title;
  if (!jd && metaData.jd) jd = metaData.jd;

  // Step 5: DOM content heuristic for JD
  if (!jd) {
    jd = extractJobDescriptionFromDOM();
  }

  // Step 6: Smart heuristic fallback (when everything else fails)
  if (!title && !company && !jd) {
    const fallback = extractSmartFallback();
    if (!company && fallback.company) company = fallback.company;
    if (!title && fallback.title) title = fallback.title;
    if (!location && fallback.location) location = fallback.location;
    if (!jd && fallback.jd) jd = fallback.jd;
  }

  // Truncate JD if too long
  if (jd.length > 5000) {
    jd = jd.substring(0, 5000) + "\n...(内容过长，已截断)";
  }

  return {
    company: company || "",
    title: title || "",
    location: location || "",
    salary: salary || "",
    jd: jd || "",
    sourceUrl: window.location.href,
    platform: platform,
  };
}

// ─── Message Listener ──────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (message.type === "EXTRACT_JOB_INFO") {
      const jobInfo = extractJobInfo();
      sendResponse({ data: jobInfo });
    }
    return true;
  }
);
