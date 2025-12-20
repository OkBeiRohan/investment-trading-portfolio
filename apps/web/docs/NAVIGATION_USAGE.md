# Navigation System Usage Examples

## Setting Page Title and Breadcrumbs

### Example 1: Simple Page

```tsx
"use client";

import { useEffect } from "react";
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

### Example 2: Page with Actions

```tsx
"use client";

import { useEffect } from "react";
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

### Example 3: Dynamic Breadcrumbs

```tsx
"use client";

import { useEffect } from "react";
import { useNavigation } from "@/hooks/use-navigation";
import { useParams } from "next/navigation";

export default function AssetDetailPage() {
  const { setNavigation } = useNavigation();
  const params = useParams();
  const assetId = params.assetId as string;

  useEffect(() => {
    // Fetch asset details to get name
    const assetName = "Mutual Fund XYZ"; // Replace with actual fetch

    setNavigation({
      title: assetName,
      breadcrumbs: [
        { label: "Wealth", href: "/" as Route },
        { label: "Assets", href: "/" as Route },
        { label: assetName },
      ],
    });
  }, [setNavigation, assetId]);

  return <div>Asset details for {assetId}...</div>;
}
```

## Clearing Navigation State

```tsx
"use client";

import { useEffect } from "react";
import { useNavigation } from "@/hooks/use-navigation";

export default function SomePage() {
  const { clearNavigation } = useNavigation();

  useEffect(() => {
    // Clear navigation when leaving page
    return () => {
      clearNavigation();
    };
  }, [clearNavigation]);

  return <div>Content...</div>;
}
```

## Updating Only Title

```tsx
const { setTitle } = useNavigation();

setTitle("New Page Title");
```

## Updating Only Breadcrumbs

```tsx
const { setBreadcrumbs } = useNavigation();

setBreadcrumbs([
  { label: "Home", href: "/" as Route },
  { label: "Current Page" },
]);
```

## Updating Only Header Actions

```tsx
const { setHeaderActions } = useNavigation();

setHeaderActions(
  <div>
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </div>
);
```

## Reading Navigation State

```tsx
const { title, breadcrumbs, sections, activeSection, activeItem } =
  useNavigation();

console.log("Current title:", title);
console.log("Active section:", activeSection); // e.g., "wealth"
console.log("Active item:", activeItem?.label); // e.g., "Overview"
```

## Server Component (No Navigation Updates)

Server Components cannot update navigation state. If you need to set title/breadcrumbs, convert to Client Component or use a child Client Component:

```tsx
// app/page.tsx (Server Component)
import { PageClient } from "./page-client";

export default function Page() {
  return <PageClient />;
}

// app/page-client.tsx (Client Component)
("use client");

import { useEffect } from "react";
import { useNavigation } from "@/hooks/use-navigation";

export function PageClient() {
  const { setNavigation } = useNavigation();

  useEffect(() => {
    setNavigation({
      title: "Dashboard",
      breadcrumbs: [{ label: "Home" }],
    });
  }, [setNavigation]);

  return <div>Dashboard content...</div>;
}
```

## Active Navigation Detection

The navigation context automatically detects which section and item are active based on the current pathname. You don't need to manually set `activeSection` or `activeItem` - they are computed automatically.

```tsx
const { activeSection, activeItem } = useNavigation();

// activeSection will be "wealth" when on /wealth routes
// activeItem will be the matching navigation item
```

## Sub-Navigation

Sub-navigation items automatically appear when their parent item is active. They slide in with a smooth animation and are defined in the navigation config:

```typescript
// config/navigation.config.ts
{
  id: "wealth-assets",
  label: "Assets",
  icon: Coins,
  route: "/" as Route,
  subItems: [
    { id: "wealth-stocks", label: "Stocks & Equity", route: "/" as Route },
    { id: "wealth-mutual-funds", label: "Mutual Funds", route: "/" as Route },
    // More sub-items...
  ],
}
```

When the user navigates to any route that matches a sub-item, both the parent item and the sub-navigation will be shown in the sidebar.
