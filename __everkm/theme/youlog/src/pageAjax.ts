import ky from "ky";
import "./nprogress_custom.css";
import nProgress from "nprogress";

export const EVENT_PAGE_NAVIGATE = "page-navigate";
export const EVENT_PAGE_LOADED = "page-loaded";
export const EVENT_PAGE_LOAD_BEFORE = "page-load-before";
export const PAGE_LOADING_CLASS = "page-loading";

// 记录当前页面的完整路径（包含hash）
let lastFullUrl =
  window.location.pathname + window.location.search + window.location.hash;

// 配置 nProgress
nProgress.configure({
  showSpinner: false,
  minimum: 0.1,
  speed: 200,
  trickleSpeed: 100,
});

// 提取公共的页面加载逻辑为独立函数
async function loadPageContent(url: string): Promise<boolean> {
  try {
    // 显示加载状态
    document.body.classList.add(PAGE_LOADING_CLASS);
    // 启动进度条
    nProgress.start();

    // 使用ky获取页面内容
    const response = await ky.get(url).text();

    // 创建一个临时的DOM元素来解析响应
    const parser = new DOMParser();
    const doc = parser.parseFromString(response, "text/html");

    const syncElement = (selector: string) => {
      const currentElement = document.querySelector(selector);
      const nextElement = doc.querySelector(selector);
      if (currentElement && nextElement) {
        currentElement.innerHTML = nextElement.innerHTML;
      } else if (currentElement) {
        currentElement.innerHTML = "";
      } else {
        console.error("sync element from ajax response", selector, "not found");
        return false;
      }
      return true;
    };

    [
      "#article-main",
      "h1[data-article-title]",
      "title",
      "#page-indicator",
      "#breadcrumb",
      "#article-title",
    ].forEach((selector) => {
      // console.log("syncElement 2", selector);
      syncElement(selector);
    });

    // 滚动到页面顶部
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById("body-main")?.scrollTo(0, 0);
      }, 30);
    });

    return true; // 返回成功状态
  } catch (error) {
    console.error("加载页面失败:", error);
    return false; // 返回失败状态
  } finally {
    // 完成进度条
    nProgress.done();
    // 移除加载状态
    document.body.classList.remove(PAGE_LOADING_CLASS);
  }
}

// 检查是否只是锚点变化
function isOnlyHashChange(oldUrl: string, newUrl: string): boolean {
  // 移除 hash 部分
  const stripHash = (url: string) => url.split("#")[0];
  return stripHash(oldUrl) === stripHash(newUrl);
}

// 处理页面导航跳转的函数
async function handleNavigation(url: string): Promise<void> {
  console.log("handleNavigation", url);
  try {
    // 检查是否只是锚点变化
    if (isOnlyHashChange(lastFullUrl, url)) {
      console.log("只是锚点变化，由浏览器处理");
      // 更新 lastFullUrl
      lastFullUrl = url;
      // 更新 URL 但不加载页面
      window.history.pushState(null, document.title, url);
      return;
    }

    // 触发页面加载前事件
    document.dispatchEvent(
      new CustomEvent(EVENT_PAGE_LOAD_BEFORE, { detail: { url } })
    );

    const success = await loadPageContent(url);
    if (success) {
      // 更新 lastFullUrl
      lastFullUrl = url;
      // 更新URL（不刷新页面）
      window.history.pushState(null, document.title, url);

      // 触发自定义事件，通知页面内容已更新
      document.dispatchEvent(
        new CustomEvent(EVENT_PAGE_LOADED, {
          detail: { url },
          bubbles: true,
          composed: true,
        })
      );
      console.log("触发页面加载完成事件:", EVENT_PAGE_LOADED, { url });
    } else {
      // 加载失败时直接跳转
      window.location.href = url;
    }
  } catch (error) {
    console.error("页面导航处理错误:", error);
    window.location.href = url;
  }
}

// 处理浏览器后退/前进操作
async function handlePopState(): Promise<void> {
  try {
    // 获取当前URL（包含hash）
    const currentUrl =
      window.location.pathname + window.location.search + window.location.hash;
    console.log("handlePopState", {
      lastFullUrl,
      currentUrl,
    });

    // 检查是否只是锚点变化
    if (isOnlyHashChange(lastFullUrl, currentUrl)) {
      console.log("前进/后退：只是锚点变化，由浏览器处理");
      // 更新 lastFullUrl
      lastFullUrl = currentUrl;
      return;
    }

    // 不是锚点变化，需要加载页面内容
    const success = await loadPageContent(currentUrl);
    if (success) {
      // 更新 lastFullUrl
      lastFullUrl = currentUrl;
    } else {
      window.location.reload();
    }
  } catch (error) {
    console.error("历史记录导航错误:", error);
    window.location.reload();
  }
}

// 检查链接是否应该被处理
function shouldHandleLink(element: HTMLElement | null): boolean {
  // 不是链接元素
  if (!element || element.tagName !== "A") return false;

  let href = (element as HTMLAnchorElement).getAttribute("href");

  // 无效链接或特殊链接
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) {
    console.log("不是有效链接", href);
    return false;
  }

  if (href.startsWith("http:") || href.startsWith("https:")) {
    // 检测是否与当前页面同源
    const currentOrigin = window.location.origin;
    const hrefOrigin = new URL(href).origin;
    if (currentOrigin !== hrefOrigin) {
      console.log("不是有效链接", href);
      return false;
    }

    // 移除当前页面域名
    href = href.replace(currentOrigin, "");
  }

  // 只处理以 / 开头的相对路径
  const isBeginWithBaseUrl = href.startsWith(
    (window as any).__everkm_base_url || "/"
  );
  if (!isBeginWithBaseUrl) {
    console.log("不是有效的内部链接", href);
    return false;
  }

  return isBeginWithBaseUrl;
}

// 处理页面AJAX加载的主函数
export function setupAjaxPageLoading() {
  // 初始化 lastFullUrl
  lastFullUrl =
    window.location.pathname + window.location.search + window.location.hash;

  // 在捕获阶段使用事件代理，确保能捕获所有点击事件
  document.addEventListener(
    "click",
    (event) => {
      // 查找事件路径中的所有A元素
      const path = event.composedPath() as HTMLElement[];
      const linkElement = path.find(
        (el) => el instanceof HTMLElement && el.tagName === "A"
      ) as HTMLAnchorElement | undefined;

      if (!linkElement) {
        console.log("事件路径中没有A元素");
        return;
      }

      // 检查链接是否应该被处理
      if (shouldHandleLink(linkElement)) {
        // 首先阻止默认行为
        event.preventDefault();

        // 获取链接并处理导航
        const href = linkElement.getAttribute("href") as string;
        handleNavigation(href);
      }
    },
    {
      capture: true,
      passive: false,
    }
  );

  // 处理浏览器前进/后退按钮
  window.addEventListener("popstate", () => {
    console.log("popstate event triggered");
    handlePopState();
  });

  window.addEventListener(EVENT_PAGE_NAVIGATE, (event: Event) => {
    const customEvent = event as CustomEvent<{ url: string }>;
    console.log("pushstate event triggered", customEvent.detail.url);
    handleNavigation(customEvent.detail.url);
  });
}

// 在DOM加载完成后初始化
document.addEventListener("DOMContentLoaded", () => {
  setupAjaxPageLoading();
});
