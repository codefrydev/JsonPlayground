import React from 'react';

interface DesktopOnlyProps {
  children: React.ReactNode;
}

/**
 * On viewports smaller than md (768px), shows "Please open in a desktop device".
 * On md and up, renders children.
 */
const DesktopOnly: React.FC<DesktopOnlyProps> = ({ children }) => {
  return (
    <>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 md:hidden">
        <p className="text-center text-lg font-medium text-foreground">
          Please open in a desktop device
        </p>
        <p className="text-center text-sm text-muted-foreground mt-2 max-w-xs">
          JSON Explorer is designed for desktop. Open this page on a computer for the best experience.
        </p>
      </div>
      <div className="hidden md:block min-h-screen">
        {children}
      </div>
    </>
  );
};

export default DesktopOnly;
