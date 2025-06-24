import { Component, createSignal, JSX, onMount } from "solid-js";
import { customElement, noShadowDOM } from "solid-element";

const VersionList = (props: VersionListProps) => {
  const [versionList, setVersionList] = createSignal<any[]>([]);

//   onMount(() => {
//     fetch(props.versionListUrl || "")
//       .then((res) => res.json())
//       .then((data) => setVersionList(data));
//   });

  return <div>{props.children}</div>;
};

interface VersionListProps extends JSX.DOMAttributes<HTMLElement> {
  versionListUrl?: string;
}

// 注册自定义元素
customElement(
  "youlog-version",
  {
    versionListUrl: "",
  },
  (props: VersionListProps) => {
    noShadowDOM();
    return <VersionList {...props} />;
  }
);

export type { VersionListProps };
