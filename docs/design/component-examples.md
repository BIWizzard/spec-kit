# KGiQ Component Examples
## Family Finance Web Application

This document provides React component examples implementing the KGiQ branding and glassmorphic design system.

## Logo Component

```tsx
// components/branding/KGiQLog.tsx
interface KGiQLogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const KGiQLogo: React.FC<KGiQLogoProps> = ({
  size = 'medium',
  className = ''
}) => {
  const sizeClasses = {
    small: 'logo-small',
    medium: 'logo-svg',
    large: 'logo-large'
  };

  return (
    <div className={`logo-container ${className}`}>
      <img
        src="/assets/branding/KGiQ_logo_transparent.svg"
        alt="KGiQ"
        className={sizeClasses[size]}
      />
      <span className="text-accent font-semibold">Family Finance</span>
    </div>
  );
};
```

## Glass Card Component

```tsx
// components/ui/GlassCard.tsx
interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'interactive' | 'small' | 'large';
  className?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  className = '',
  onClick
}) => {
  const baseClass = 'glass-card';
  const variantClasses = {
    default: '',
    interactive: 'glass-card-interactive',
    small: 'glass-card-sm',
    large: 'glass-card-lg'
  };

  const cardClass = `${baseClass} ${variantClasses[variant]} ${className}`;

  return (
    <div className={cardClass} onClick={onClick}>
      {children}
    </div>
  );
};
```

## Glass Header Component

```tsx
// components/layout/Header.tsx
import { KGiQLogo } from '../branding/KGiQLogo';

interface HeaderProps {
  isScrolled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isScrolled = false }) => {
  return (
    <header className={`glass-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container-xl mx-auto px-4 h-full flex items-center justify-between">
        <KGiQLogo size="medium" />

        <nav className="hidden md:flex items-center gap-6">
          <a href="/dashboard" className="glass-nav-item">
            Dashboard
          </a>
          <a href="/transactions" className="glass-nav-item">
            Transactions
          </a>
          <a href="/budgets" className="glass-nav-item">
            Budgets
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button className="glass-button glass-button-ghost">
            Settings
          </button>
          <button className="glass-button glass-button-primary">
            Account
          </button>
        </div>
      </div>
    </header>
  );
};
```

## Dashboard Stats Card

```tsx
// components/dashboard/StatsCard.tsx
interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  trend,
  icon
}) => {
  const trendColors = {
    up: 'kgiq-secondary',
    down: 'text-error',
    neutral: 'text-muted'
  };

  return (
    <GlassCard variant="interactive">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted text-sm font-medium">{title}</p>
          <p className="text-primary text-2xl font-bold mt-1">{value}</p>
          <p className={`text-xs font-medium mt-2 ${trendColors[trend]}`}>
            {change}
          </p>
        </div>
        <div className="text-accent text-xl">
          {icon}
        </div>
      </div>
    </GlassCard>
  );
};
```

## Glass Button Examples

```tsx
// components/ui/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = ''
}) => {
  const baseClass = 'glass-button';
  const variantClasses = {
    primary: 'glass-button-primary',
    secondary: '',
    success: 'glass-button-success',
    ghost: 'glass-button-ghost'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg'
  };

  const buttonClass = `
    ${baseClass}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `.trim();

  return (
    <button
      className={buttonClass}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
};
```

## Form Input Example

```tsx
// components/ui/Input.tsx
interface InputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-secondary">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`glass-input ${error ? 'border-error' : ''}`}
        required={required}
      />

      {error && (
        <p className="text-error text-xs mt-1">{error}</p>
      )}
    </div>
  );
};
```

## Navigation Sidebar

```tsx
// components/layout/Sidebar.tsx
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const menuItems = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '💰', label: 'Income', href: '/income' },
    { icon: '💳', label: 'Payments', href: '/payments' },
    { icon: '🏦', label: 'Bank Accounts', href: '/accounts' },
    { icon: '📈', label: 'Budgets', href: '/budgets' },
    { icon: '📋', label: 'Reports', href: '/reports' },
  ];

  return (
    <>
      <div className={`glass-sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />

      <aside className={`glass-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="p-6">
          <KGiQLogo size="small" />
        </div>

        <nav className="glass-nav">
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="glass-nav-item"
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="mt-auto p-6">
          <Button variant="ghost" className="w-full">
            Settings
          </Button>
        </div>
      </aside>
    </>
  );
};
```

## Modal Example

```tsx
// components/ui/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`glass-modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="glass-button glass-button-ghost p-2"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
```

## Usage in Next.js Layout

```tsx
// app/layout.tsx
import './globals.css';
import '../styles/design-tokens.css';
import '../styles/components/glassmorphism.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-primary text-primary font-sans antialiased">
        <div className="min-h-screen">
          <Header />
          <main className="container-xl mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

## Global CSS Setup

```css
/* globals.css */
@import './design-tokens.css';
@import './components/glassmorphism.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-family: var(--font-sans);
  scroll-behavior: smooth;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--glass-border);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--glass-border-hover);
}
```

These components provide a complete foundation for implementing the KGiQ branding with glassmorphic design throughout the Family Finance application.