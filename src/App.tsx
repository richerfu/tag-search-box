import {
  TagSearchBox,
  AttributeValue,
} from "@/registry/new-york/tag-search-box/TagSearchBox";
import { Button } from "@/components/ui/button";
import { TagSearchBox as TeaTagSearchBox } from "tea-component";
import "tea-component/dist/tea.css";

const attributes: AttributeValue[] = [
  {
    type: "single",
    key: "status",
    name: "状态",
    values: [
      {
        key: "running",
        name: "运行中",
      },
    ],
  },
  {
    type: "input",
    key: "type",
    name: "类型",
  },
  {
    type: "multiple",
    key: "region",
    name: "地域",
    values: [
      {
        key: "east-1",
        name: "华东1",
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

      <div className="w-full max-w-3xl">
        <TeaTagSearchBox
          attributes={attributes}
          onChange={(tags) => console.log("Tags changed:", tags)}
          onSearchButtonClick={(e, tags) =>
            console.log("Search clicked:", tags)
          }
        />
      </div>

      <Button>hello</Button>
    </main>
  );
}
