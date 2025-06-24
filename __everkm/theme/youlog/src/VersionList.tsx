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

const VersionList = (props: VersionListProps) => {
  const [versionList, setVersionList] = createSignal<any[]>([]);

  return (
    <>
      <Popover>
        <Popover.Trigger class="popover__trigger">
          v{props.version}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content class="popover__content">
            <Popover.Arrow />
            <Popover.Description class="popover__description">
              A UI toolkit for building accessible web apps and design systems
              with SolidJS.
            </Popover.Description>
          </Popover.Content>
        </Popover.Portal>
      </Popover>
    </>
  );
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

export type { VersionListProps };
