import { createSignal, createEffect, onCleanup, For, Show } from 'solid-js';
import type { MenuItem } from './navigation';

interface AccordionItemProps {
  item: MenuItem;
  level?: number;
}

/**
 * 手风琴菜单项组件
 */
const AccordionItem = (props: AccordionItemProps) => {
  const [isOpen, setIsOpen] = createSignal(props.item.active || false);
  const level = () => props.level || 0;
  const hasChildren = () => props.item.children && props.item.children.length > 0;

  // 处理点击整个菜单项
  const handleItemClick = (e: MouseEvent) => {
    e.stopPropagation();
    
    if (hasChildren()) {
      // 对于有子菜单的项目，点击总是展开/折叠子菜单
      e.preventDefault();
      setIsOpen(!isOpen());
    }
    // 没有子菜单的项目保持默认链接行为
  };

  return (
    <div class={`${level() === 0 ? 'border-b border-border dark:border-border' : level() === 1 ? 'mb-2' : ''}`}>
      <div 
        class={`flex items-center justify-between cursor-pointer ${level() === 0 ? 'py-3 px-2' : level() === 1 ? 'py-2 px-2 my-1' : 'py-1.5 px-2'}`}
        onClick={handleItemClick}
      >
        <Show 
          when={!hasChildren()} 
          fallback={
            <span 
              class={`${level() === 0 ? 'text-lg' : 'text-base'} font-medium ${props.item.active ? 'text-brand-primary dark:text-brand-primary-light' : ''}`}
              style={{ flex: 1 }}
            >
              {props.item.text}
            </span>
          }
        >
          <a 
            href={props.item.link} 
            class={`${level() === 0 ? 'text-lg' : 'text-base'} font-medium ${props.item.active ? 'text-brand-primary dark:text-brand-primary-light' : ''}`}
            style={{ flex: 1 }}
          >
            {props.item.text}
          </a>
        </Show>
        
        <Show when={hasChildren()}>
          <svg 
            viewBox="0 0 24 24" 
            width={level() === 0 ? "24" : "20"} 
            height={level() === 0 ? "24" : "20"}
            fill="none" 
            stroke="currentColor" 
            stroke-width="1.6"
            stroke-linecap="round" 
            stroke-linejoin="round"
            class={`transform transition-transform duration-200 ml-2 flex-shrink-0 ${isOpen() ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </Show>
      </div>
      
      <Show when={hasChildren()}>
        <div 
          class={`overflow-hidden transition-all duration-300 ${isOpen() ? 'max-h-dvh opacity-100 py-1' : 'max-h-0 opacity-0 py-0'} ${level() === 0 ? 'pl-6' : 'pl-4'}`}
        >
          <div class={`border-l border-border dark:border-border ${level() === 0 ? 'pl-3' : 'pl-2'} ${level() >= 1 ? 'mt-1' : ''}`}>
            <For each={props.item.children}>
              {(child) => (
                <AccordionItem item={child} level={level() + 1} />
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

export interface MobileMenuProps {
  items: MenuItem[];
  isOpen: boolean;
  onClose?: () => void;
}

/**
 * 移动端菜单组件
 */
export const MobileMenu = (props: MobileMenuProps) => {
  // 防止body滚动
  createEffect(() => {
    if (props.isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    
    onCleanup(() => {
      document.body.classList.remove('overflow-hidden');
    });
  });

  // 处理点击菜单外部关闭菜单
  const handleClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget && props.onClose) {
      props.onClose();
    }
  };

  return (
    <div 
      class={`fixed top-14 bottom-0 left-0 right-0 z-40 bg-surface dark:bg-surface overflow-y-auto transform transition-transform duration-300 ${props.isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      onClick={handleClick}
    >
      <div class="container mx-auto px-4 py-4">
        <nav>
          <For each={props.items}>
            {(item) => (
              <AccordionItem item={item} />
            )}
          </For>
        </nav>
      </div>
    </div>
  );
}; 