# TagSearchBox

This project's idea comes from `tea-component` [TagSearchBox](https://tea-design.github.io/component/tagsearchbox) and using `shadcn-ui` to reimplement it.

![Demo](./fixtures/demo.gif)

## Install

Just install it with `shadcn`.

```bash
pnpm dlx shadcn@latest add https://raw.githubusercontent.com/richerfu/tag-search-box/refs/heads/main/public/r/TagSearchBox.json
```

## Require

- React 19
- Tailwindcss 4

## Usage

```tsx
import { TagSearchBox, AttributeValue } from "@/components/ui/tag-search-box";

const attributes: AttributeValue[] = [
  {
    type: "single",
    key: "status",
    name: "Status",
    values: [
      {
        key: "running",
        name: "Running",
      },
    ],
  },
  {
    type: "input",
    key: "type",
    name: "Type",
  },
  {
    type: "multiple",
    key: "region",
    name: "Region",
    values: [
      {
        key: "east-1",
        name: "East-1",
      },
    ],
  },
];

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="w-full max-w-3xl">
        <h1 className="mb-8 text-2xl font-bold">TagSearchBox Demo</h1>
        <TagSearchBox
          attributes={attributes}
          onChange={(tags) => console.log("Tags changed:", tags)}
          onSearchButtonClick={(e, tags) =>
            console.log("Search clicked:", tags)
          }
        />
      </div>
    </main>
  );
}
```

## Note

**This component may have some style or logic issues and need to fix.**

## License

[MIT](./LICENSE)
