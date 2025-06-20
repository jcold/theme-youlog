import { Emitter } from "mitt";
import {
  createSignal,
  createEffect,
  onCleanup,
  For,
  Show,
  onMount,
} from "solid-js";
import { render } from "solid-js/web";

// 垂直高度的间距
export const VERTICAL_PADDING = 20;

const HEADING_SELECTOR = "h1, h2, h3, h4, h5";

// 定义TOC事件类型
export type TocEvents = {
  stop?: string; // 停止更新
  update?: string; // 重新解析TOC
};

/**
 * 目录项接口
 */
export interface TocItem {
  id: string;
  text: string;
  level: number;
  parentId?: string;
}

/**
 * TableOfContents组件属性
 */
interface TocProps {
  tocContainer?: HTMLElement;
  articleSelector?: string;
  headingSelector?: string;
  headerHeight?: number;
  offset?: number; // 滚动偏移量
  highlightParents?: boolean;
  title?: string; // 目录标题
  callbackHeadersHeight?: () => number[]; // 回调获取所有header高度
  onAfterGoto?: (id: string) => void; // 回调在滚动到指定标题后执行
  emitter?: Emitter<TocEvents>; // mitt事件发射器
  scrollContainer?: HTMLElement; // 滚动容器
}

/**
 * MobileTocProps接口
 */
interface MobileTocProps extends TocProps {
  isMobile?: boolean;
}

/**
 * 解析文章内容，提取标题信息
 */
function parseTocItems(
  articleElement: HTMLElement | null,
  headingSelector: string
): TocItem[] {
  if (!articleElement) return [];

  const headings =
    articleElement.querySelectorAll<HTMLHeadingElement>(headingSelector);
  const tocItems: TocItem[] = [];

  // 记录标题层级关系
  let previousLevel = 0;
  const levelStack: { id: string; level: number }[] = [];

  headings.forEach((heading) => {
    // 确保每个标题都有id
    if (!heading.id) {
      heading.id =
        heading.textContent?.trim().toLowerCase().replace(/\s+/g, "-") || "";
    }

    // 获取标题级别（h1=1, h2=2 等）
    const level = parseInt(heading.tagName.substring(1));

    // 处理层级栈
    if (level > previousLevel) {
      if (levelStack.length > 0) {
        levelStack.push({ id: heading.id, level });
      } else {
        levelStack.push({ id: heading.id, level });
      }
    } else if (level < previousLevel) {
      while (
        levelStack.length > 0 &&
        levelStack[levelStack.length - 1].level >= level
      ) {
        levelStack.pop();
      }
      levelStack.push({ id: heading.id, level });
    } else {
      // 同级别替换
      levelStack.pop();
      levelStack.push({ id: heading.id, level });
    }
    previousLevel = level;

    // 创建TOC项
    const item: TocItem = {
      id: heading.id,
      text: heading.textContent || "",
      level,
    };

    // 添加父级引用
    if (levelStack.length > 1) {
      item.parentId = levelStack[levelStack.length - 2].id;
    }

    tocItems.push(item);
  });

  return itemLevelJustify(tocItems);
}

function itemLevelJustify(items: TocItem[]) {
  if (items.length === 0) return items;
  
  // 找到最小级别
  const minLevel = Math.min(...items.map(item => item.level));
  
  // 如果最小级别已经是1，则不需要调整
  if (minLevel === 1) return items;
  
  // 计算需要向上提升的级别数
  const levelOffset = minLevel - 1;
  
  // 将所有项目的级别向上提升
  return items.map(item => ({
    ...item,
    level: item.level - levelOffset
  }));
}

/**
 * 移动端TOC组件 - 显示当前标题，点击后弹出完整目录
 */
export function MobileToc(props: MobileTocProps) {
  const [tocItems, setTocItems] = createSignal<TocItem[]>([]);
  const [activeId, setActiveId] = createSignal<string>("");
  const [showToc, setShowToc] = createSignal<boolean>(false);
  const [stopSync, setStopSync] = createSignal<boolean>(false);

  let cleanUpCallback: () => void;

  // refs
  let mobileTocRef: HTMLDivElement | undefined;
  let tocContentRef: HTMLDivElement | undefined;
  let isScrollingToHeading = false;

  // computed values
  const activeTocItem = () => tocItems().find((item) => item.id === activeId());

  // console.log("MobileToc", props.articleSelector, props.headingSelector);

  // 初始化TOC数据
  onMount(() => {
    const articleElement = document.querySelector<HTMLElement>(
      props.articleSelector || "#article-main"
    );
    if (!articleElement) return;

    const items = parseTocItems(
      articleElement,
      props.headingSelector || HEADING_SELECTOR
    );
    setTocItems(items);

    // 初始化时设置当前活跃项
    updateActiveItem();
  });

  // 监听emitter事件
  createEffect(() => {
    const emitter = props.emitter;
    if (!emitter) return;

    // 监听停止更新事件 - 仅停止滚动状态同步，通常在页面加载前触发
    const onStop = () => {
      // console.log("TOC: 停止滚动同步 mobile");
      setStopSync(true);
    };

    // 监听更新事件 - 页面加载后触发，重新解析内容并恢复滚动同步
    const onUpdate = () => {
      // console.log("TOC: 更新内容并恢复滚动同步 mobile");
      // 重新解析文章内容
      const articleElement = document.querySelector<HTMLElement>(
        props.articleSelector || "#article-main"
      );
      if (articleElement) {
        const items = parseTocItems(
          articleElement,
          props.headingSelector || HEADING_SELECTOR
        );
        setTocItems(items);
      } else {
        setTocItems([]);
      }
      // 启用滚动同步
      setStopSync(false);
    };

    emitter.on("stop", onStop);
    emitter.on("update", onUpdate);

    cleanUpCallback = () => {
      emitter.off("stop", onStop);
      emitter.off("update", onUpdate);
    };
  });

  onCleanup(() => {
    // console.log("MobileToc onCleanup");
    cleanUpCallback?.();
  });

  const getHeaderHeight = () => {
    return parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--header-height")
        .trim() || "0"
    );
  };

  // 检查是否在sticky状态
  const isSticky = () => {
    const headerOffset = getHeaderHeight();
    let isStickyState = false;
    if (mobileTocRef) {
      const rect = mobileTocRef.getBoundingClientRect();
      isStickyState = rect.top <= headerOffset;
    }
    return isStickyState;
  };

  // 计算总偏移量
  const getTotalOffset = () => {
    const headerOffset = getHeaderHeight();
    if (!mobileTocRef && !isSticky()) return headerOffset;

    const indicatorHeight = mobileTocRef?.offsetHeight || 0;

    // 只有sticky状态才考虑TOC指示器的高度
    const finalOffset = headerOffset + indicatorHeight;
    return finalOffset;
  };

  // 更新当前活跃项
  const updateActiveItem = () => {
    // 如果是由点击TOC引起的滚动，则跳过更新
    if (isScrollingToHeading) return;

    // 如果设置了停止同步，则跳过更新
    if (stopSync()) return;

    // 计算总偏移量
    const totalOffset = getTotalOffset();

    // 找到当前可见的标题
    for (let i = tocItems().length - 1; i >= 0; i--) {
      const heading = document.getElementById(tocItems()[i].id);
      if (!heading) continue;

      const rect = heading.getBoundingClientRect();
      if (rect.top - 20 <= totalOffset) {
        setActiveId(tocItems()[i].id);
        return;
      }
    }
  };

  // 监听页面滚动
  createEffect(() => {
    let ticking = false;
    const scrollEl = props.scrollContainer || window;

    const handleScroll = () => {
      // 如果设置了停止同步，则不处理滚动事件
      if (stopSync()) return;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveItem();
          ticking = false;
        });
        ticking = true;
      }
    };

    // 使用指定的滚动容器或窗口
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });

    onCleanup(() => scrollEl.removeEventListener("scroll", handleScroll));
  });

  // 当TOC展开时滚动到当前活跃项
  createEffect(() => {
    if (showToc() && tocContentRef && activeId()) {
      setTimeout(() => {
        const activeItem = tocContentRef.querySelector(
          `[data-target="${activeId()}"]`
        );
        if (activeItem) {
          // 滚动到活跃项
          activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300); // 等待动画完成
    }
  });

  // 切换目录显示
  const toggleToc = (e: any) => {
    if (e) {
      e.stopPropagation(); // 阻止事件冒泡
    }

    setShowToc(!showToc());
  };

  const onAfterGoto = (id: string) => {
    setActiveId(id);
    setShowToc(false);
  };

  // 如果没有目录项，不显示
  return (
    <Show when={tocItems().length > 0}>
      <div
        ref={mobileTocRef}
        class={`mobile-toc-indicator relative overflow-y-auto rounded border border-gray-200 lg:hidden dark:border-gray-700 ${
          showToc() ? "toc-expanded" : ""
        }`}
      >
        {/* 指示器/标题部分 */}
        <div
          class="mobile-toc-header sticky top-0 flex cursor-pointer items-center justify-between bg-gray-50 p-2 dark:bg-gray-800"
          onClick={toggleToc}
        >
          <div class="flex items-center">
            <svg
              class="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
            <span class="font-medium text-text-primary dark:text-text-primary">
              当前位置:
            </span>
          </div>
          <div class="text-brand-primary dark:text-brand-primary-light mx-2 flex-1 truncate font-medium">
            {activeTocItem()?.text || props.title || "目录"}
          </div>
          <svg
            class={`h-5 w-5 transform text-text-tertiary transition-transform dark:text-text-tertiary ${
              showToc() ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {/* 目录内容区 */}
        <Show when={showToc()}>
          <div class="mobile-toc-content" ref={tocContentRef}>
            <TableOfContents
              tocContainer={mobileTocRef}
              articleSelector={props.articleSelector}
              headingSelector={props.headingSelector}
              headerHeight={props.headerHeight}
              offset={props.offset}
              highlightParents={props.highlightParents}
              title={props.title}
              callbackHeadersHeight={() => [getTotalOffset()]}
              onAfterGoto={onAfterGoto}
              scrollContainer={props.scrollContainer}
            />
          </div>
        </Show>
      </div>
    </Show>
  );
}

/**
 * TableOfContents组件
 */
export function TableOfContents(props: TocProps) {
  const [tocItems, setTocItems] = createSignal<TocItem[]>([]);
  const [activeId, setActiveId] = createSignal<string>("");
  const [containerHeight, setContainerHeight] = createSignal<string>("auto");
  const [stopSync, setStopSync] = createSignal<boolean>(false);

  // 是否由TOC内部操作引起的滚动
  let isScrollingToHeading = false;
  let tocContainerRef: HTMLElement | undefined;

  onMount(() => {
    tocContainerRef =
      props.tocContainer ||
      document.querySelector<HTMLElement>("#toc") ||
      undefined;
    if (!tocContainerRef) {
      console.warn("tocContainer is not found");
      return;
    }

    // 初始化TOC数据
    const articleElement = document.querySelector<HTMLElement>(
      props.articleSelector || "#article-main"
    );
    if (!articleElement) return;

    const items = parseTocItems(
      articleElement,
      props.headingSelector || HEADING_SELECTOR
    );
    setTocItems(items);

    // 计算TOC容器高度
    const updateContainerHeight = () => {
      const currentHeaderHeight = calculateHeaderHeight();
      const windowHeight = window.innerHeight;
      // 使用常量垂直偏移
      const calculatedHeight =
        windowHeight - currentHeaderHeight - VERTICAL_PADDING * 2;
      setContainerHeight(`${calculatedHeight}px`);

      // 直接设置容器高度
      if (tocContainerRef) {
        tocContainerRef.style.maxHeight = `${calculatedHeight}px`;
      }
    };

    // 初始计算
    updateContainerHeight();

    // 窗口大小变化时重新计算
    window.addEventListener("resize", updateContainerHeight);

    onCleanup(() =>
      window.removeEventListener("resize", updateContainerHeight)
    );
  });

  // 计算所有header的高度
  const calculateHeaderHeight = () => {
    if (props.callbackHeadersHeight) {
      const heights = props.callbackHeadersHeight();
      return heights.reduce((sum, height) => sum + height, 0);
    } else {
      return props.headerHeight || 0;
    }
  };

  // 监听emitter事件
  createEffect(() => {
    const emitter = props.emitter;
    if (!emitter) return;

    // 监听停止更新事件 - 仅停止滚动状态同步，通常在页面加载前触发
    const onStop = () => {
      // console.log("TOC: 停止滚动同步");
      setStopSync(true);
    };

    // 监听更新事件 - 页面加载后触发，重新解析内容并恢复滚动同步
    const onUpdate = () => {
      // console.log("TOC: 更新内容并恢复滚动同步");
      // 重新解析文章内容
      const articleElement = document.querySelector<HTMLElement>(
        props.articleSelector || "#article-main"
      );
      if (articleElement) {
        const items = parseTocItems(
          articleElement,
          props.headingSelector || HEADING_SELECTOR
        );
        setTocItems(items);
      }
      // 启用滚动同步
      setStopSync(false);
    };

    emitter.on("stop", onStop);
    emitter.on("update", onUpdate);

    onCleanup(() => {
      emitter.off("stop", onStop);
      emitter.off("update", onUpdate);
    });
  });

  createEffect(() => {
    // 确保tocItems更新后，更新活跃项
    if (tocItems().length > 0) {
      updateActiveItem();
    }
  });

  // 更新当前活跃项
  const updateActiveItem = () => {
    // 如果是由点击TOC引起的滚动，则跳过更新
    if (isScrollingToHeading) return;

    // 如果设置了停止同步，则跳过更新
    if (stopSync()) return;

    const headerOffset = calculateHeaderHeight();
    // 计算总偏移量
    const totalOffset = headerOffset + 20; // 增加top 判断的阈值

    // 找到当前可见的标题
    const items = tocItems();
    for (let i = items.length - 1; i >= 0; i--) {
      const heading = document.getElementById(items[i].id);
      if (!heading) {
        console.error("heading not found", items[i].id);
        continue;
      }

      const rect = heading.getBoundingClientRect();
      if (rect.top <= totalOffset) {
        setActiveId(items[i].id);
        return;
      }
    }
  };

  // 滚动到指定标题
  const scrollToHeading = (id: string) => {
    const targetHeading = document.getElementById(id);
    if (!targetHeading) return;

    // 标记为TOC内部引起的滚动
    isScrollingToHeading = true;

    const headerHeight = calculateHeaderHeight();

    // 计算最终的偏移位置
    const elementPosition = targetHeading.getBoundingClientRect().top;
    const offsetPosition = props.scrollContainer
      ? props.scrollContainer.scrollTop
      : window.scrollY;
    const totalOffset =
      elementPosition + offsetPosition - headerHeight - (props.offset || 10);

    // 平滑滚动到目标位置
    const scrollElement = props.scrollContainer || window;
    scrollElement.scrollTo({
      top: totalOffset,
      behavior: "smooth",
    });

    // 更新活跃ID
    setActiveId(id);

    // 滚动结束后取消标记
    setTimeout(() => {
      isScrollingToHeading = false;
    }, 1000);

    // 回调
    if (props.onAfterGoto) {
      props.onAfterGoto(id);
    }
  };

  // 回到顶部
  const scrollToTop = () => {
    const scrollElement = props.scrollContainer || window;
    scrollElement.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    setActiveId("");

    // 回调
    if (props.onAfterGoto) {
      props.onAfterGoto("");
    }
  };

  // 确保当前活跃链接在视图内
  createEffect(() => {
    const activeIdValue = activeId();
    if (!activeIdValue) return;

    const tocContainer =
      tocContainerRef || props.tocContainer || document.querySelector("#toc");
    if (!tocContainer) return;

    // 获取容器和活跃链接
    const activeLink = tocContainer.querySelector(
      `[data-target="${activeIdValue}"]`
    ) as HTMLElement;
    if (!activeLink) return;

    const linkRect = activeLink.getBoundingClientRect();
    const containerRect = tocContainer.getBoundingClientRect();

    if (linkRect.top < containerRect.top) {
      tocContainer.scrollTop += linkRect.top - containerRect.top - 10;
    } else if (linkRect.bottom > containerRect.bottom) {
      tocContainer.scrollTop += linkRect.bottom - containerRect.bottom + 10;
    }
  });

  // 监听页面滚动
  createEffect(() => {
    let ticking = false;
    const scrollEl = props.scrollContainer || window;

    const handleScroll = () => {
      // 如果设置了停止同步，则不处理滚动事件
      if (stopSync()) return;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveItem();
          ticking = false;
        });
        ticking = true;
      }
    };

    // 监听滚动事件
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });

    onCleanup(() => scrollEl.removeEventListener("scroll", handleScroll));
  });

  return (
    <Show
      when={tocItems().length > 0}
      fallback={
        <>
          <div class="toc-item toc-title-item">
            <div class="toc-title font-medium">{props.title || "目录"}</div>
          </div>
          <div class="toc-empty text-sm text-gray-500 dark:text-gray-400">
            无目录内容
          </div>
        </>
      }
    >
      <>
        {/* 目录标题作为第一个项目，使用div而非链接 */}
        <div class="toc-item toc-title-item">
          <div
            class="toc-title cursor-pointer font-medium"
            onClick={scrollToTop}
          >
            {props.title || "目录"}
          </div>
        </div>

        {/* 目录项目列表 */}
        <For each={tocItems()}>
          {(item) => {
            // 创建一个响应式的计算属性来检查当前项是否活跃
            const isActive = () => item.id === activeId();
            const isParentOfActive = () =>
              props.highlightParents &&
              tocItems().some(
                (i) => i.id === activeId() && i.parentId === item.id
              );

            // 动态计算class名称
            const getClassName = () => {
              let className = "toc-link";

              // 根据级别添加样式
              if (item.level === 1) className += " toc-link-h1";
              else if (item.level === 2) className += " toc-link-h2";
              else if (item.level === 3) className += " toc-link-h3";
              else if (item.level === 4) className += " toc-link-h4";
              else if (item.level === 5) className += " toc-link-h5";

              // 添加活跃状态
              if (isActive()) className += " toc-link-active";
              if (isParentOfActive()) className += " toc-link-parent-active";

              return className;
            };

            return (
              <div class="toc-item">
                <a
                  href={`#${item.id}`}
                  class={getClassName()}
                  data-target={item.id}
                  data-level={item.level}
                  data-parent={item.parentId}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToHeading(item.id);
                  }}
                >
                  {item.text}
                </a>
              </div>
            );
          }}
        </For>
      </>
    </Show>
  );
}

/**
 * 初始化TOC，将其渲染到指定容器
 */
export function initTableOfContents(
  container: HTMLElement,
  options: TocProps = {}
) {
  if (!container) return;

  // 使用Solid.js渲染TOC组件
  render(() => <TableOfContents {...options} />, container);
}
