import {
  Component,
  createSignal,
  JSX,
  onMount,
  onCleanup,
  createEffect,
  Setter,
  Accessor,
} from "solid-js";
import { customElement, noShadowDOM } from "solid-element";
import { Popover } from "@kobalte/core/popover";
import "./popover.css";

// 定义版本列表项的 interface
interface VersionItem {
  url: string;
  version: string;
}

const VersionList = (props: VersionListProps) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [versionList, setVersionList] = createSignal<VersionItem[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);

  createEffect(async () => {
    if (props.versionListUrl && isOpen()) {
      setIsLoading(true);
      try {
        const versionList = await fetchVersionList(props.versionListUrl);
        setVersionList(versionList);
        setError(null);
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          console.error(error);
          setError("Unknown error");
        }
      } finally {
        setIsLoading(false);
      }
    }
  });

  return (
    <>
      <Popover onOpenChange={setIsOpen}>
        <Popover.Trigger class="popover__trigger">
          v{props.version}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content class="popover__content">
            <Popover.Arrow />
            <Popover.Description class="popover__description  max-h-[200px] min-w-[160px] overflow-y-auto p-1">
              {!props.versionListUrl ? (
                <div class="text-sm text-amber-500 px-2 py-1">
                  No version source provided
                </div>
              ) : isLoading() ? (
                <div class="text-sm text-gray-500 px-2 py-1">Loading...</div>
              ) : error() ? (
                <div class="text-sm text-red-500 px-2 py-1">{error()}</div>
              ) : (
                <VersionItems
                  versionList={versionList()}
                  currentVersion={props.version}
                />
              )}
            </Popover.Description>
          </Popover.Content>
        </Popover.Portal>
      </Popover>
    </>
  );
};

async function fetchVersionList(url: string): Promise<VersionItem[]> {
  const response = await fetch(url);

  // 检查 HTTP 状态码
  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${response.statusText}`
    );
  }

  // 检查响应内容类型
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Response is not JSON format");
  }

  try {
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

interface VersionItems {
  versionList: VersionItem[];
  currentVersion: string;
}

const VersionItems = (props: VersionItems) => {
  return props.versionList.reverse().map((item) => (
    <ul class="list-none">
      {/* {new Array(1).fill(0).map((_, index) => ( */}
      <li>
        <a
          href={item.url}
          class="text-sm text-gray-500 py-1 px-2 hover:bg-gray-100 rounded block"
        >
          {item.version}
          {props.currentVersion === item.version && (
            <span class="text-sm opacity-60 ml-1 italic">(current)</span>
          )}
        </a>
      </li>
      {/* ))} */}
    </ul>
  ));
};

interface VersionListProps extends JSX.DOMAttributes<HTMLElement> {
  versionListUrl?: string;
  version: string;
}

// 注册自定义元素
customElement(
  "youlog-version",
  {
    versionListUrl: "",
    version: "",
  },
  (props: VersionListProps) => {
    noShadowDOM();
    return <VersionList {...props} />;
  }
);

export type { VersionListProps, VersionItem };
