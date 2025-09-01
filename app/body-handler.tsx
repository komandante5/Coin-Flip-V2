'use client';

import { useEffect } from 'react';

export function BodyHandler() {
  useEffect(() => {
    // Handle browser extension attributes that might cause hydration mismatches
    const body = document.body;
    
    // Store original attributes to restore them if needed
    const originalAttributes: { [key: string]: string } = {};
    
    // Get all attributes that might be added by extensions
    Array.from(body.attributes).forEach(attr => {
      if (attr.name.startsWith('cz-') || attr.name.startsWith('data-extension-')) {
        originalAttributes[attr.name] = attr.value;
      }
    });
    
    // Clean up extension attributes that cause hydration issues
    Object.keys(originalAttributes).forEach(attrName => {
      body.removeAttribute(attrName);
    });
    
    // Re-add them after hydration to maintain functionality
    setTimeout(() => {
      Object.entries(originalAttributes).forEach(([name, value]) => {
        body.setAttribute(name, value);
      });
    }, 0);
    
  }, []);

  return null;
}

