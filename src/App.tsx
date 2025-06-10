import {
  TagSearchBox,
  AttributeValue,
} from "@/registry/new-york/tag-search-box/TagSearchBox";
import { Button } from "./components/ui/button";

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
      <div className="w-full max-w-3xl flex flex-row">
        <h1 className="mb-8 text-2xl font-bold">TagSearchBox Demo</h1>
        <TagSearchBox
          attributes={attributes}
          onChange={(tags) => console.log("Tags changed:", tags)}
          onSearchButtonClick={(e, tags) =>
            console.log("Search clicked:", tags)
          }
        />

        <Button variant="outline" size="sm" className="h-8 px-2 lg:px-3">
          hello
        </Button>
      </div>
    </main>
  );
}
