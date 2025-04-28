import { createSignal, createEffect, onCleanup, onMount, For, Show } from 'solid-js';
import {
  computePosition,
  flip,
  shift,
  offset,
  autoUpdate
} from '@floating-ui/dom';
import type { MenuItem } from './navigation';

interface MenuItemProps {
  item: MenuItem;
  level?: number;
}

/**
 * 子菜单项组件
 */
const MenuItem = (props: MenuItemProps) => {
  const [isOpen, setIsOpen] = createSignal(false);
  let itemRef: HTMLLIElement | undefined;
  let menuRef: HTMLUListElement | undefined;
  let cleanup: (() => void) | undefined;
  
  const level = () => props.level || 0;
  const hasChildren = () => props.item.children && props.item.children.length > 0;
  const isActive = () => props.item.active || 
    (props.item.children && props.item.children.some(child => child.active || 
      (child.children && child.children.some(c => c.active))));
  
  // 菜单定位更新
  const updatePosition = () => {
    if (!isOpen() || !itemRef || !menuRef) return;
    
    const middleware = [
      offset(8),
      flip({
        fallbackPlacements: level() === 0 ? ['bottom-start', 'top-start'] : ['right-start', 'left-start', 'bottom-start']
      }),
      shift({ padding: 5 })
    ];
    
    computePosition(itemRef, menuRef, {
      placement: level() === 0 ? 'bottom-start' : 'right-start',
      middleware
    }).then(({ x, y }) => {
      if (!menuRef) return;
      
      Object.assign(menuRef.style, {
        left: `${x}px`,
        top: `${y}px`
      });
    });
  };
  
  // 设置自动更新定位
  createEffect(() => {
    if (isOpen() && itemRef && menuRef) {
      // 清理之前的自动更新
      if (cleanup) {
        cleanup();
      }
      
      // 初始更新定位
      updatePosition();
      
      // 设置自动更新
      cleanup = autoUpdate(
        itemRef,
        menuRef,
        updatePosition,
        { ancestorScroll: true, ancestorResize: true, elementResize: true }
      );
      
      // 使用 requestAnimationFrame 确保位置计算后再显示菜单
      requestAnimationFrame(() => {
        if (menuRef) {
          menuRef.style.visibility = 'visible';
          menuRef.style.opacity = '1';
        }
      });
    }
  });
  
  onCleanup(() => {
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
  });
  
  // 处理点击外部区域关闭菜单
  createEffect(() => {
    if (!isOpen()) return;
    
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef && !menuRef.contains(e.target as Node) && 
          itemRef && !itemRef.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('click', handleOutsideClick);
    
    onCleanup(() => {
      document.removeEventListener('click', handleOutsideClick);
    });
  });
  
  // 处理菜单切换
  const handleToggle = (e: MouseEvent) => {
    if (hasChildren()) {
      e.preventDefault();
      setIsOpen(!isOpen());
    }
  };
  
  // 处理鼠标悬停
  const handleMouseEnter = () => {
    if (hasChildren()) {
      setIsOpen(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (hasChildren()) {
      setTimeout(() => {
        if (menuRef && !menuRef.matches(':hover') && itemRef && !itemRef.matches(':hover')) {
          // 先设置过渡效果再关闭
          if (menuRef) {
            menuRef.style.opacity = '0';
            setTimeout(() => setIsOpen(false), 150);
          } else {
            setIsOpen(false);
          }
        }
      }, 50);
    }
  };
  
  return (
    <li 
      ref={itemRef}
      class={`relative ${level() === 0 ? 'px-1' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a 
        href={props.item.link} 
        onClick={handleToggle}
        class={`
          flex items-center whitespace-nowrap px-3 py-2 text-sm transition-colors rounded
          ${isActive() 
            ? 'text-brand-primary-dark dark:text-brand-primary-light' 
            : isOpen() 
              ? 'text-brand-primary dark:text-brand-primary-light'
              : 'text-text-primary dark:text-text-primary hover:text-brand-primary dark:hover:text-brand-primary-light'}
          ${level() > 0 ? 'px-4' : ''}
        `}
      >
        {props.item.text}
        
        <Show when={hasChildren()}>
          <svg 
            class={`ml-1.5 h-4 w-4 transition-transform ${isOpen() ? (level() === 0 ? 'rotate-180' : 'rotate-90') : ''}`}
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fill-rule="evenodd" 
              d={level() === 0 
                ? "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
                : "M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              }
              clip-rule="evenodd" 
            />
          </svg>
        </Show>
      </a>
      
      <Show when={hasChildren() && isOpen()}>
        <ul 
          ref={menuRef}
          class="absolute z-50 min-w-[12rem] bg-surface dark:bg-surface rounded-md shadow-lg py-1 border border-border dark:border-border opacity-0 transition-opacity duration-150"
          style={{
            position: 'absolute',
            left: '0',
            top: '0',
            visibility: 'hidden'
          }}
        >
          <For each={props.item.children}>
            {(child) => (
              <MenuItem item={child} level={level() + 1} />
            )}
          </For>
        </ul>
      </Show>
    </li>
  );
};

export interface FloatingMenuProps {
  items: MenuItem[];
}

/**
 * 菜单组件
 */
export const FloatingMenu = (props: FloatingMenuProps) => {
  return (
    <ul class="flex">
      <For each={props.items}>
        {(item, index) => (
          <MenuItem item={item} level={0} />
        )}
      </For>
    </ul>
  );
}; 