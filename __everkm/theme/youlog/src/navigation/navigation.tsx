import { createSignal, onMount } from 'solid-js';
import { render } from 'solid-js/web';
import { FloatingMenu } from './FloatingMenu';
import { MobileNavController } from './MobileNavController';

/**
 * 菜单项接口
 */
export interface MenuItem {
  text: string;
  link: string;
  active: boolean;
  children?: MenuItem[];
}

/**
 * 从UL列表解析菜单数据
 * @param {HTMLElement} navElement - 包含菜单的元素
 * @returns {MenuItem[]} 菜单数据
 */
export function parseMenuData(navElement: HTMLElement | null): MenuItem[] {
  // 如果没有找到导航元素，返回空数组
  if (!navElement) return [];
  
  const rootUl = navElement.querySelector('ul');
  if (!rootUl) return [];
  
  return parseMenuItems(rootUl as HTMLElement);
}

/**
 * 递归解析菜单项
 * @param {HTMLElement} ul - UL元素
 * @returns {MenuItem[]} 菜单项数据
 */
export function parseMenuItems(ul: HTMLElement): MenuItem[] {
  const items: MenuItem[] = [];
  const currentPath = window.location.pathname;
  
  // 获取所有直接子LI元素
  const listItems = ul.querySelectorAll(':scope > li');
  
  listItems.forEach(li => {
    // 获取链接
    const link = li.querySelector(':scope > a');
    if (!link) return;
    
    const href = link.getAttribute('href') || '#';
    const text = link.textContent?.trim() || '';
    
    // 检查是否为当前页面
    const isActive = currentPath === href || 
                     (href !== '/' && currentPath.startsWith(href));
    
    const item: MenuItem = {
      text,
      link: href,
      active: isActive
    };
    
    // 查找子菜单
    const subUl = li.querySelector(':scope > ul');
    if (subUl) {
      item.children = parseMenuItems(subUl as HTMLElement);
      
      // 如果任何子项是活动的，父项也标记为活动
      if (item.children.some(child => child.active || 
          (child.children && child.children.some(c => c.active)))) {
        item.active = true;
      }
    }
    
    items.push(item);
  });
  
  return items;
}

/**
 * 初始化桌面版菜单
 */
function initDesktopMenu(navContainer: HTMLElement, menuData: MenuItem[]): void {
  // 清空原始内容
  const container = document.createElement('div');
  container.className = 'solid-menu-container';
  navContainer.innerHTML = '';
  navContainer.appendChild(container);
  
  // 渲染Solid组件
  render(() => <FloatingMenu items={menuData} />, container);
}

/**
 * 初始化移动版菜单
 */
function initMobileMenu(menuData: MenuItem[]): void {
  // 查找移动菜单按钮容器
  const mobileMenuContainer = document.getElementById('mobile-menu-container');
  if (!mobileMenuContainer) return;
  
  // 渲染Solid移动导航控制器组件
  render(() => <MobileNavController menuData={menuData} />, mobileMenuContainer);
}

/**
 * 初始化导航
 */
export function initNavigation(): void {
  onMount(() => {
    // 获取原始菜单元素
    const navContainer = document.getElementById('header-nav');
    if (!navContainer) return;
    
    navContainer.classList.remove('invisible');
    
    // 解析菜单数据
    const menuData = parseMenuData(navContainer);
    
    // 初始化桌面版菜单
    initDesktopMenu(navContainer, menuData);
    
    // 初始化移动版菜单
    initMobileMenu(menuData);
  });
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
}); 