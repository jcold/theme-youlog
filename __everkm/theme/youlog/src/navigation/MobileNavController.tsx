import { createSignal } from 'solid-js';
import { MobileMenu } from './MobileMenu';
import type { MenuItem } from './navigation';

export interface MobileNavControllerProps {
  menuData: MenuItem[];
}

/**
 * 移动导航控制器组件
 */
export const MobileNavController = (props: MobileNavControllerProps) => {
  const [isMenuOpen, setIsMenuOpen] = createSignal(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen());
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  return (
    <>
      <button 
        onClick={toggleMenu}
        class="p-1.5 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 focus:outline-none"
      >
        {isMenuOpen() ? (
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        ) : (
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16m-7 6h7"></path>
          </svg>
        )}
      </button>
      
      <MobileMenu
        items={props.menuData}
        isOpen={isMenuOpen()}
        onClose={closeMenu}
      />
    </>
  );
}; 