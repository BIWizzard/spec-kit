'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

// Select Context
interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const SelectContext = createContext<SelectContextValue | null>(null);

const useSelectContext = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within Select');
  }
  return context;
};

// Select Root Component
interface SelectProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  children,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open]);

  const contextValue: SelectContextValue = {
    value: currentValue,
    onValueChange: handleValueChange,
    open,
    setOpen: disabled ? () => {} : setOpen,
    triggerRef,
  };

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

// Select Trigger Component
const selectTriggerVariants = cva(
  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/15 focus:bg-white/15 focus:border-[#FFD166]/50 focus:ring-[#FFD166]/30',
        outline: 'border-gray-300 bg-transparent hover:bg-gray-50',
        ghost: 'border-transparent bg-transparent hover:bg-gray-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface SelectTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof selectTriggerVariants> {
  children: React.ReactNode;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  className,
  variant,
  children,
  disabled,
  ...props
}) => {
  const { open, setOpen, triggerRef } = useSelectContext();

  return (
    <button
      ref={triggerRef}
      className={selectTriggerVariants({ variant, className })}
      onClick={() => setOpen(!open)}
      disabled={disabled}
      aria-expanded={open}
      aria-haspopup="listbox"
      type="button"
      {...props}
    >
      <span className="block truncate">{children}</span>
      <ChevronDown
        className={`h-4 w-4 opacity-50 transition-transform duration-200 ${
          open ? 'rotate-180' : ''
        }`}
      />
    </button>
  );
};

// Select Value Component
interface SelectValueProps {
  placeholder?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder = 'Select...' }) => {
  const { value } = useSelectContext();

  return (
    <span className={`block truncate ${!value ? 'text-white/60' : 'text-white'}`}>
      {value || placeholder}
    </span>
  );
};

// Select Content Component
interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectContent: React.FC<SelectContentProps> = ({ children, className = '' }) => {
  const { open, triggerRef } = useSelectContext();
  const contentRef = useRef<HTMLDivElement>(null);

  // Position the dropdown
  useEffect(() => {
    if (open && triggerRef.current && contentRef.current) {
      const trigger = triggerRef.current;
      const content = contentRef.current;
      const triggerRect = trigger.getBoundingClientRect();

      content.style.top = `${triggerRect.bottom + window.scrollY + 4}px`;
      content.style.left = `${triggerRect.left + window.scrollX}px`;
      content.style.width = `${triggerRect.width}px`;
    }
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={`
        absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md
        bg-white/95 backdrop-blur-md border-white/20 text-gray-900
        animate-in fade-in-0 zoom-in-95 duration-100
        ${className}
      `}
      role="listbox"
    >
      <div className="max-h-60 overflow-auto">
        {children}
      </div>
    </div>
  );
};

// Select Item Component
interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({
  children,
  value,
  disabled = false,
  className = '',
}) => {
  const { value: selectedValue, onValueChange } = useSelectContext();
  const isSelected = selectedValue === value;

  const handleClick = () => {
    if (!disabled && onValueChange) {
      onValueChange(value);
    }
  };

  return (
    <div
      className={`
        relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none
        hover:bg-[#FFD166]/10 focus:bg-[#FFD166]/10
        ${isSelected ? 'bg-[#FFD166]/20 text-[#FFD166]' : 'text-gray-900'}
        ${disabled ? 'pointer-events-none opacity-50' : ''}
        ${className}
      `}
      onClick={handleClick}
      role="option"
      aria-selected={isSelected}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && (
          <Check className="h-4 w-4 text-[#FFD166]" />
        )}
      </span>
      <span className="block truncate">{children}</span>
    </div>
  );
};

// Components are already exported above