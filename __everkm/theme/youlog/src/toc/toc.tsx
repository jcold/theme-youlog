// 导入CSS
import "./toc.css";
import {
  TableOfContents,
  MobileToc,
  VERTICAL_PADDING,
  TocItem,
  TocEvents,
} from "./TableOfContents";
import { render } from "solid-js/web";
import { EVENT_PAGE_LOADED, EVENT_PAGE_LOAD_BEFORE } from "pageAjax";
import mitt, { Emitter } from "mitt";

// 目录选项接口
interface TocOptions {
  tocSelector?: string;
  articleSelector?: string;
  headingSelector?: string;
  headerSelector?: string;
  offset?: number; // 滚动偏移量
  highlightParents?: boolean;
  title?: string; // 目录标题
  enableMobileToc?: boolean; // 是否启用移动端TOC
  onAfterGoto?: (id: string) => void; // 回调在滚动到指定标题后执行
  scrollContainer?: HTMLElement; // 滚动容器
}

// 定义常量
const DEFAULT_HEADER_HEIGHT = 10;

/**
 * 初始化移动端TOC组件
 */
function setupMobileToc(
  options: TocOptions,
  tocEmitter: Emitter<TocEvents>
): void | (() => void) {
  const {
    articleSelector = "#article-main",
    headingSelector = "h1, h2, h3, h4",
    headerSelector = "header",
    offset = 10,
    highlightParents = true,
    title = "目录",
    scrollContainer,
  } = options;

  const article = document.querySelector<HTMLElement>(articleSelector);
  if (!article) {
    console.warn(`${articleSelector} is not found`);
    return;
  }

  // 获取header高度
  const header = document.querySelector<HTMLElement>(headerSelector);
  const headerHeight = header ? header.offsetHeight : DEFAULT_HEADER_HEIGHT;

  // 创建一个移动端TOC指示器容器，插入到文章内容之前
  let mobileTocContainer = document.getElementById("mobile-toc-indicator");

  if (!mobileTocContainer) {
    mobileTocContainer = document.createElement("div");
    mobileTocContainer.id = "mobile-toc-indicator";

    // 设置top值 - 紧挨着header底部
    mobileTocContainer.style.top = `${headerHeight}px`;
    mobileTocContainer.style.position = "sticky";
    mobileTocContainer.style.zIndex = "5";

    // 将移动端TOC指示器插入到文章开头
    if (article.firstChild) {
      article.insertBefore(mobileTocContainer, article.firstChild);
    } else {
      article.appendChild(mobileTocContainer);
    }
  }

  // 渲染移动端TOC组件
  if (mobileTocContainer) {
    return render(
      () => (
        <MobileToc
          articleSelector={articleSelector}
          headingSelector={headingSelector}
          headerHeight={headerHeight}
          offset={offset}
          highlightParents={highlightParents}
          title={title}
          emitter={tocEmitter}
          scrollContainer={scrollContainer}
        />
      ),
      mobileTocContainer
    );
  }
}

/**
 * 生成目录
 */
function generateToc(
  options: TocOptions = {},
  tocEmitter: Emitter<TocEvents>
): void {
  const {
    tocSelector = "#toc",
    articleSelector = "#article-main",
    headingSelector = "h1, h2, h3, h4",
    headerSelector = "header",
    offset = 10, // 滚动偏移量
    highlightParents = true,
    title = "目录",
    onAfterGoto,
    scrollContainer,
  } = options;

  const tocContainer = document.querySelector<HTMLElement>(tocSelector);
  const article = document.querySelector<HTMLElement>(articleSelector);

  if (!(tocContainer && article)) {
    console.warn(`${tocSelector} or ${articleSelector} is not found`);
    return;
  }

  // 清空容器
  tocContainer.innerHTML = "";

  // 添加必要的类
  tocContainer.classList.add(
    "p-4",
    "bg-gray-50",
    "dark:bg-gray-800",
    "rounded-lg",
    "space-y-1",
    "overflow-y-auto"
  );

  // 计算 top 值：获取 header 高度 + 偏移量
  const header = document.querySelector<HTMLElement>(headerSelector);
  const headerHeight = header ? header.offsetHeight : DEFAULT_HEADER_HEIGHT;
  const stickyTop = headerHeight + VERTICAL_PADDING;

  // 在桌面显示为sticky，在移动端隐藏
  tocContainer.classList.remove("hidden", "mobile-active", "mobile-child");
  tocContainer.classList.add("lg:sticky", "hidden", "lg:block");

  // 添加基本样式属性
  tocContainer.style.top = `${stickyTop}px`;
  tocContainer.style.scrollBehavior = "smooth";

  // 创建一个函数用于获取header高度
  const callbackHeadersHeight = () => {
    const header = document.querySelector<HTMLElement>(headerSelector);
    return [header ? header.offsetHeight : DEFAULT_HEADER_HEIGHT];
  };

  // 设置header高度
  document.documentElement.style.setProperty(
    "--header-height",
    `${callbackHeadersHeight()}px`
  );

  // 渲染桌面TOC
  render(
    () => (
      <TableOfContents
        tocContainer={tocContainer}
        articleSelector={articleSelector}
        headingSelector={headingSelector}
        headerHeight={headerHeight}
        offset={offset}
        highlightParents={highlightParents}
        title={title}
        callbackHeadersHeight={callbackHeadersHeight}
        onAfterGoto={onAfterGoto}
        emitter={tocEmitter}
        scrollContainer={scrollContainer}
      />
    ),
    tocContainer
  );
}

/**
 * 初始化TOC
 */
function initTocInner(): void {
  // 默认配置
  const options: TocOptions = {
    tocSelector: "#toc",
    articleSelector: "#article-main",
    headingSelector: "h1, h2, h3, h4",
    headerSelector: "header",
    offset: 10, // 滚动偏移量
    highlightParents: true,
    title: "目录",
    enableMobileToc: true, // 默认启用移动端TOC
    scrollContainer: document.getElementById("body-main") || undefined,
  };

  let mobileTocCleanup: (() => void) | void;

  // 创建事件发射器
  const tocEmitter = mitt<TocEvents>();

  // 在文档加载完成后初始化TOC和移动端TOC
  generateToc(options, tocEmitter);

  // 初始化移动端TOC
  if (options.enableMobileToc) {
    mobileTocCleanup = setupMobileToc(options, tocEmitter);
  }

  // 监听页面加载前事件，发送停止事件
  document.addEventListener(EVENT_PAGE_LOAD_BEFORE, () => {
    tocEmitter.emit("stop");
  });

  // 监听页面加载后事件，更新TOC并重新初始化移动端TOC
  document.addEventListener(EVENT_PAGE_LOADED, () => {
    tocEmitter.emit("update");

    // 重新初始化移动端TOC
    if (options.enableMobileToc) {
      setTimeout(() => {
        if (mobileTocCleanup) {
          mobileTocCleanup();
          mobileTocCleanup = undefined;
        }
        mobileTocCleanup = setupMobileToc(options, tocEmitter);
      }, 100); // 短暂延迟确保DOM已经更新
    }
  });
}

function initToc(): void {
  document.addEventListener("DOMContentLoaded", () => {
    initTocInner();
  });
}

// 导出函数和类型
export {
  generateToc,
  initToc,
  setupMobileToc,
  TableOfContents,
  MobileToc,
  DEFAULT_HEADER_HEIGHT,
};
export type { TocOptions, TocItem };
