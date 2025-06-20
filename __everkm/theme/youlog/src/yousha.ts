function youshaCommentPostUrl() {
  const u = new URL(window.location.href);

  // 获取 origin + pathname
  let pathname = u.pathname;

  // 如果以 / 结尾，补全为 index.html
  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  // 如果最后以 .p[\d+].html 结尾，则替换为 .html
  pathname = pathname.replace(/\.p\d+\.html$/, ".html");

  return u.origin + pathname;
}

(window as any).youshaCommentPostUrl = youshaCommentPostUrl;
