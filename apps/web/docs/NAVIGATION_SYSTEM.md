# Navigation System Architecture

## Overview

The web dashboard uses a **unified navigation system** powered by React Context API. This eliminates duplicate sidebar/header components across different dashboard sections and provides a centralized, type-safe way to manage navigation state.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Root Layout                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Providers                            │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │       NavigationProvider                    │ │  │
│  │  │  - Manages navigation state                 │ │  │
│  │  │  - Computes active section/item             │ │  │
│  │  │  - Provides title, breadcrumbs, actions     │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │       AuthProvider                          │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │       OrganizationProvider                  │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │          DashboardLayout                          │  │
│  │  - Conditionally renders sidebar/header           │  │
│  │  - Excludes authentication routes                 │  │
│  │  ┌─────────────┐  ┌──────────────────────────┐   │  │
│  │  │  Sidebar    │  │       Header             │   │  │
│  │  │  (left)     │  │  - Breadcrumbs           │   │  │
│  │  │             │  │  - Title                 │   │  │
│  │  │  - Sections │  │  - Actions               │   │  │
│  │  │  - Items    │  │                          │   │  │
│  │  │  - SubItems │  │  ┌────────────────────┐  │   │  │
│  │  └─────────────┘  │  │     Page Content   │  │   │  │
│  │                   │  │                    │  │   │  │
│  │                   │  └────────────────────┘  │   │  │
│  │                   └──────────────────────────┘   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Key Components

### 1. NavigationContext (`src/contexts/navigation-context.tsx`)

**Purpose**: Centralized navigation state management

**State**:

- `title`: Current page title (string | null)
- `breadcrumbs`: Breadcrumb trail (Array<Breadcrumb>)
- `headerActions`: Custom actions for header (React.ReactNode | null)
- `sections`: Navigation structure (Array<NavigationSection>)
- `activeSection`: Currently active section (string | null)
- `activeItem`: Currently active navigation item (NavigationItem | null)

**Methods**:

- `setNavigation()`: Update title, breadcrumbs, headerActions in one call
- `setTitle()`: Update only title
- `setBreadcrumbs()`: Update only breadcrumbs
- `setHeaderActions()`: Update only header actions
- `clearNavigation()`: Reset navigation state

**Active Detection**:
The context automatically computes `activeSection` and `activeItem` based on the current pathname. No manual updates required!

### 2. useNavigation Hook (`src/hooks/use-navigation.ts`)

**Purpose**: Simplified access to navigation context

**Usage**:

```tsx
const { setNavigation, activeSection, activeItem } = useNavigation();
```

**Returns**:

- All navigation state (title, breadcrumbs, sections, etc.)
- All navigation methods (setNavigation, setTitle, etc.)
- Active navigation info (activeSection, activeItem)

### 3. Navigation Config (`src/config/navigation.config.ts`)

**Purpose**: Define navigation structure

**Structure**:

```typescript
export const navigationConfig: NavigationSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    items: [
      {
        id: "home",
        label: "Overview",
        icon: LayoutDashboard, // ✅ Direct component import
        route: "/" as Route, // ✅ Type-safe Route
      },
    ],
  },
  {
    id: "wealth",
    label: "Wealth Management",
    items: [
      {
        id: "wealth-assets",
        label: "Assets",
        icon: Coins,
        route: "/" as Route,
        subItems: [
          // ✅ Sub-navigation support
          {
            id: "wealth-stocks",
            label: "Stocks & Equity",
            route: "/" as Route,
          },
        ],
      },
    ],
  },
];
```

**Key Features**:

- ✅ **Type-safe routes**: Uses `Route<string>` from Next.js
- ✅ **Direct icon components**: Pass `LucideIcon` components, not strings
- ✅ **Sub-navigation**: Supports nested items that slide in when parent is active
- ✅ **Placeholder routes**: Use `"/" as Route` for routes not yet implemented

### 4. UnifiedSidebar (`src/components/layouts/unified-sidebar.tsx`)

**Purpose**: Context-driven sidebar with collapsible sections

**Features**:

- Automatic active state detection (no manual prop passing)
- Collapsible sections with smooth animations
- Sub-navigation that slides in when parent is active
- Responsive mobile toggle

**Rendering Logic**:

```tsx
const Icon = item.icon;
{
  Icon && <Icon size={20} />;
} // ✅ Direct component rendering
```

**Animations**:

- Section collapse/expand: `slideDown` animation
- Sub-navigation: `slideInFromLeft` animation
- Active item pulse: `pulse` animation on hover

### 5. Header (`src/components/layouts/header.tsx`)

**Purpose**: Dynamic page title, breadcrumbs, and actions

**Features**:

- Displays current page title from context
- Breadcrumb navigation with clickable links
- Custom header actions (buttons, dropdowns, etc.)
- User profile dropdown with organization switcher

**Breadcrumb Rendering**:

```tsx
breadcrumbs.map((crumb: Breadcrumb, index: number) =>
  crumb.href ? (
    <Link href={crumb.href}>{crumb.label}</Link>
  ) : (
    <span>{crumb.label}</span>
  )
);
```

### 6. DashboardLayout (`src/components/layouts/dashboard-layout.tsx`)

**Purpose**: Conditional layout wrapper

**Behavior**:

- **Authentication routes** (`/authentication/*`): No sidebar/header (clean auth UI)
- **Dashboard routes** (all others): Full sidebar + header + content

**Implementation**:

```tsx
const isAuthRoute = pathname.startsWith("/authentication");

if (isAuthRoute) {
  return <>{children}</>;
}

return (
  <div className={styles.layout}>
    <UnifiedSidebar />
    <div className={styles.main}>
      <Header />
      <main className={styles.content}>{children}</main>
    </div>
  </div>
);
```

## Type System

### Core Types

```typescript
// From Next.js
import type { Route } from "next";

// From Lucide React
import type { LucideIcon } from "lucide-react";

// Navigation types
interface Breadcrumb {
  label: string;
  href?: Route;
}

interface SubNavigationItem {
  id: string;
  label: string;
  route: Route;
}

interface NavigationItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  route: Route;
  subItems?: SubNavigationItem[];
}

interface NavigationSection {
  id: string;
  label: string;
  items: NavigationItem[];
}
```

### Why Type Safety Matters

- ✅ **Compile-time route checking**: TypeScript validates routes exist
- ✅ **Icon type safety**: Only valid LucideIcon components accepted
- ✅ **Autocomplete**: IDE suggests valid routes and icons
- ✅ **Refactoring safety**: Renaming routes updates all references

## CSS Architecture

### Design System Variables

All styles use CSS custom properties from the theme:

```css
/* Colors */
--color-background: #ffffff;
--color-foreground: #0a0a0a;
--color-primary: #0070f3;
--color-primary-dark: #0051cc;
--color-border: #e5e7eb;
--color-muted: #f9fafb;

/* Spacing */
--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 2rem;

/* Transitions */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
```

### Animations

#### Sidebar Animations (`unified-sidebar.module.css`)

```css
@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 500px;
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
```

#### Header Animations (`unified-header.module.css`)

```css
@keyframes ripple {
  from {
    box-shadow: 0 0 0 0 rgba(0, 112, 243, 0.4);
  }
  to {
    box-shadow: 0 0 0 8px rgba(0, 112, 243, 0);
  }
}
```

## Usage Patterns

### Pattern 1: Simple Page with Title and Breadcrumbs

```tsx
"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useNavigation } from "@/hooks/use-navigation";

export default function AccountProfilePage() {
  const { setNavigation } = useNavigation();

  useEffect(() => {
    setNavigation({
      title: "Profile Settings",
      breadcrumbs: [
        { label: "Account", href: "/account" as Route },
        { label: "Profile" },
      ],
    });
  }, [setNavigation]);

  return <div>Profile content...</div>;
}
```

### Pattern 2: Page with Header Actions

```tsx
"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useNavigation } from "@/hooks/use-navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function WealthAssetsPage() {
  const { setNavigation } = useNavigation();

  useEffect(() => {
    setNavigation({
      title: "Asset Portfolio",
      breadcrumbs: [
        { label: "Wealth", href: "/" as Route },
        { label: "Assets" },
      ],
      headerActions: (
        <Button>
          <Plus size={16} />
          Add Asset
        </Button>
      ),
    });
  }, [setNavigation]);

  return <div>Assets list...</div>;
}
```

### Pattern 3: Dynamic Breadcrumbs with Data

```tsx
"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useNavigation } from "@/hooks/use-navigation";
import { useParams } from "next/navigation";

export default function AssetDetailPage() {
  const { setNavigation } = useNavigation();
  const params = useParams();
  const assetId = params.assetId as string;

  useEffect(() => {
    // Fetch asset details
    fetchAsset(assetId).then((asset) => {
      setNavigation({
        title: asset.name,
        breadcrumbs: [
          { label: "Wealth", href: "/" as Route },
          { label: "Assets", href: "/" as Route },
          { label: asset.name },
        ],
      });
    });
  }, [setNavigation, assetId]);

  return <div>Asset details...</div>;
}
```

### Pattern 4: Cleanup on Unmount

```tsx
"use client";

import { useEffect } from "react";
import { useNavigation } from "@/hooks/use-navigation";

export default function SomePage() {
  const { setNavigation, clearNavigation } = useNavigation();

  useEffect(() => {
    setNavigation({
      title: "Page Title",
      breadcrumbs: [{ label: "Page" }],
    });

    // Clear on unmount
    return () => {
      clearNavigation();
    };
  }, [setNavigation, clearNavigation]);

  return <div>Content...</div>;
}
```

## Active Navigation Detection

### How It Works

The navigation context watches the current pathname and automatically determines:

1. **Active Section**: Which top-level section contains the current route
2. **Active Item**: Which navigation item matches the current route
3. **Active Sub-Item**: If route matches a sub-item, both parent and sub-item are highlighted

### Algorithm

```typescript
function getActiveNavigation(pathname: string, sections: NavigationSection[]) {
  for (const section of sections) {
    for (const item of section.items) {
      // Check exact match
      if (item.route === pathname) {
        return { section: section.id, item };
      }

      // Check sub-items
      if (item.subItems) {
        for (const subItem of item.subItems) {
          if (subItem.route === pathname) {
            return { section: section.id, item };
          }
        }
      }
    }
  }
  return { section: null, item: null };
}
```

### Visual Feedback

- **Active Section**: Section header uses primary color
- **Active Item**: Background highlight + primary color text
- **Active Sub-Item**: Indented with highlight + border accent

## Sub-Navigation

### Configuration

Define sub-items in the navigation config:

```typescript
{
  id: "wealth-assets",
  label: "Assets",
  icon: Coins,
  route: "/" as Route,
  subItems: [
    { id: "wealth-stocks", label: "Stocks & Equity", route: "/" as Route },
    { id: "wealth-mutual-funds", label: "Mutual Funds", route: "/" as Route },
    { id: "wealth-crypto", label: "Cryptocurrency", route: "/" as Route },
  ],
}
```

### Behavior

1. Sub-navigation appears when **parent item is active**
2. Slides in from left with smooth animation
3. Clicking sub-item navigates to that route
4. Both parent and sub-item show active state

### Styling

```css
.subNav {
  margin-left: var(--spacing-lg);
  padding-left: var(--spacing-md);
  border-left: 2px solid var(--color-border);
  animation: slideInFromLeft 300ms ease;
}

.subNavItem {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: 6px;
  transition: all var(--transition-base);
}

.subNavItem.active {
  background-color: var(--color-primary-light);
  border-left: 3px solid var(--color-primary);
}
```

## Mobile Responsiveness

### Sidebar Behavior

- **Desktop** (>768px): Always visible, 280px width
- **Tablet** (768px - 1024px): Collapsible, 240px width
- **Mobile** (<768px): Overlay drawer, full-width when open

### Toggle Button

The mobile menu toggle appears in the header on small screens:

```tsx
{
  isMobile && (
    <Button variant="ghost" onClick={toggleSidebar}>
      <Menu size={24} />
    </Button>
  );
}
```

### Overlay

When sidebar is open on mobile, a backdrop overlay prevents interaction with main content:

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 40;
}
```

## Permission-Based Navigation (Future)

### Concept

Filter navigation items based on user permissions:

```typescript
function filterNavigationByPermissions(
  sections: NavigationSection[],
  permissions: string[]
): NavigationSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.permission ? permissions.includes(item.permission) : true
      ),
    }))
    .filter((section) => section.items.length > 0);
}
```

### Configuration

Add permission requirements to nav items:

```typescript
{
  id: "admin-users",
  label: "User Management",
  icon: Users,
  route: "/admin/users" as Route,
  permission: "admin.manageUsers",  // ✅ Permission gate
}
```

## Performance Optimizations

### React.memo for Navigation Items

```typescript
const NavigationItem = React.memo(({ item, isActive }: Props) => {
  // Render logic...
});
```

### useMemo for Section Rendering

```typescript
const renderedSections = useMemo(() => {
  return sections.map((section) => (
    <NavigationSection key={section.id} section={section} />
  ));
}, [sections]);
```

### Lazy Loading Icons

Icons are tree-shakeable thanks to direct imports:

```typescript
// ✅ Only imports LayoutDashboard icon
import { LayoutDashboard } from "lucide-react";
```

## Migration from Old System

### Before (Separate Sidebars)

```tsx
// apps/web/src/app/wealth/layout.tsx
export default function WealthLayout({ children }) {
  return (
    <>
      <WealthSidebar /> {/* ❌ Duplicate sidebar */}
      {children}
    </>
  );
}

// apps/web/src/app/account/layout.tsx
export default function AccountLayout({ children }) {
  return (
    <>
      <AccountSidebar /> {/* ❌ Another duplicate */}
      {children}
    </>
  );
}
```

### After (Unified System)

```tsx
// apps/web/src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          <DashboardLayout>
            {" "}
            {/* ✅ Single layout point */}
            {children}
          </DashboardLayout>
        </Providers>
      </body>
    </html>
  );
}

// apps/web/src/app/wealth/layout.tsx
export default function WealthLayout({ children }) {
  return <>{children}</>;
  {
    /* ✅ Just a fragment */
  }
}
```

## Build Output

Successful build with all routes:

```
✓ Compiled successfully in 10.9s
✓ Finished TypeScript in 6.7s
✓ Generating static pages (20/20)

Route (app)
├ ƒ /                              (home page with navigation)
├ ƒ /account                       (account dashboard)
├ ƒ /account/linked
├ ƒ /account/preferences
├ ƒ /account/security
├ ƒ /authentication/login          (no sidebar/header)
├ ƒ /authentication/register       (no sidebar/header)
... (20 total routes)
```

## Debugging

### Check Active Navigation

```tsx
const { activeSection, activeItem } = useNavigation();

console.log("Active section:", activeSection);
console.log("Active item:", activeItem?.label);
```

### Verify Navigation Config

```tsx
const { sections } = useNavigation();

console.log("Total sections:", sections.length);
console.log("Total items:", sections.flatMap((s) => s.items).length);
```

### Test Breadcrumb Updates

```tsx
useEffect(() => {
  console.log("Setting navigation for:", pathname);
  setNavigation({
    title: "Test Page",
    breadcrumbs: [{ label: "Test" }],
  });
}, [pathname, setNavigation]);
```

## Future Enhancements

1. **Search**: Global command palette (Cmd+K) for navigation
2. **Recent Pages**: Track recently visited pages in sidebar
3. **Favorites**: Pin frequently used pages to top of sidebar
4. **Keyboard Navigation**: Arrow keys to navigate sidebar
5. **Customization**: User-configurable sidebar order/visibility
6. **Analytics**: Track navigation patterns for UX insights

## Related Documentation

- [Navigation Usage Examples](./NAVIGATION_USAGE.md)
- [Web Dashboard Instructions](./.github/instructions/web.instructions.md)
- [Data Access Layer](./DATA_ACCESS_LAYER.md)

---

**Status**: ✅ Fully Implemented and Production-Ready  
**Last Updated**: December 2024  
**Build Status**: Passing (20 routes, 10.9s compilation)
