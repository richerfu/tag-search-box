import React, {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { TagInput } from "./TagInput";
import { FocusPosType } from "./TagSearchBox";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Value, AttributeValue } from "./AttributeSelect";

export interface TagValue {
  /**
   * 标签属性
   */
  attr?: AttributeValue;
  /**
   * 标签属性值
   */
  values?: Value[];
}

interface TagProps {
    /**
     * 标签属性
     */
    attr?: AttributeValue;
    /**
     * 标签属性值
     */
    values?: Value[];
    /**
     * 触发标签相关事件
     */
    dispatchTagEvent?: (type: string, payload?: any) => void;
    /**
     * 所有属性集合
     */
    attributes: AttributeValue[];
    /**
     * 当前聚焦状态
     */
    focused: FocusPosType | null;
    /**
     * 最大长度
     */
    maxWidth?: number | null;
    /**
     * 搜索框是否处于展开状态
     */
    active: boolean;
}

interface TagRef {
  focusTag: () => void;
  focusInput: () => void;
  resetInput: () => void;
  setInputValue: (value: string, callback?: () => void) => void;
  getInputValue: () => string | undefined;
  addTagByInputValue: () => boolean | undefined;
  addTagByEditInputValue: () => boolean | undefined;
  setInfo: (info: any, callback?: () => void) => void;
  moveToEnd: () => void;
  getInfo: any;
  edit: (pos: string) => void;
  editDone: () => void;
}

const keys: Record<string, string> = {
  "8": "backspace",
  "13": "enter",
  "37": "left",
  "38": "up",
  "39": "right",
  "40": "down",
};

export const Tag = forwardRef<TagRef, TagProps>((props, ref) => {
  const {
    attr,
    values,
    dispatchTagEvent,
    attributes,
    focused,
    maxWidth,
    active,
  } = props;

  const [inEditing, setInEditing] = useState(false);
  const inputInsideRef = useRef<any>(null);

  const inputRef = useRef<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTagClick = (e: React.MouseEvent, pos?: string) => {
    dispatchTagEvent?.("click", pos);
    e.stopPropagation();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatchTagEvent?.("del");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!keys[e.keyCode.toString()]) return;

    e.preventDefault();
    switch (keys[e.keyCode.toString()]) {
      case "tab":
      case "enter":
        dispatchTagEvent?.("click", "value");
        break;
      case "backspace":
        dispatchTagEvent?.("del", "keyboard");
        break;
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    focusTag: () => {
      inputInsideRef.current?.focusInput();
    },
    focusInput: () => {
      inputRef.current?.focusInput();
    },
    resetInput: () => {
      inputInsideRef.current?.resetInput();
    },
    setInputValue: (value: string, callback?: () => void) => {
      inputRef.current?.setInputValue(value, callback);
    },
    getInputValue: () => {
      return inputRef.current?.getInputValue();
    },
    addTagByInputValue: () => {
      return inputRef.current?.addTagByInputValue();
    },
    addTagByEditInputValue: () => {
      if (!inputInsideRef.current) return;
      return inputInsideRef.current?.addTagByInputValue();
    },
    setInfo: (info: any, callback?: () => void) => {
      return inputRef.current?.setInfo(info, callback);
    },
    moveToEnd: () => {
      return inputRef.current?.moveToEnd();
    },
    getInfo: () => {
      return { attr, values };
    },
    edit: (pos: string) => {
      setInEditing(true);
      const input = inputInsideRef.current;
      input?.setInfo({ attr, values }, () => {
        if (pos === "attr") {
          return input.selectAttr();
        }
        return input.selectValue();
      });
    },
    editDone: () => {
      setInEditing(false);
    },
  }));

  // 渲染标签内容
  const attrStr = attr ? attr.name : "";
  const formattedAttrStr = attr && attr.name ? `${attr.name}: ` : "";
  const valueStr = (values || []).map((item) => item.name).join(" | ");
  const removeable = attr && "removeable" in attr ? attr.removeable : true;

  return (
    <div
      className={cn(
        "inline-block min-h-5 relative align-middle",
        inEditing && !active && "w-0"
      )}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div onClick={handleTagClick}>
              {!inEditing && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "group flex items-center gap-1 px-2 py-1 text-sm font-medium transition-colors",
                    "hover:bg-secondary/80",
                    active && "border-primary bg-primary/10 text-primary"
                  )}
                >
                  <span
                    className={cn(
                      "cursor-pointer",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                    onClick={(e) => handleTagClick(e, "attr")}
                  >
                    {formattedAttrStr}
                  </span>
                  <span
                    className={cn(
                      "cursor-pointer",
                      active ? "text-primary" : "text-foreground"
                    )}
                    onClick={(e) => handleTagClick(e, "value")}
                  >
                    {valueStr}
                  </span>
                  {active && removeable && (
                    <button
                      onClick={handleDelete}
                      className={cn(
                        "ml-1 h-4 w-4 rounded-full transition-colors",
                        "hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        "inline-flex items-center justify-center"
                      )}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove tag</span>
                    </button>
                  )}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          {active && (
            <TooltipContent>
              <p>Click to modify. Press Enter to finish.</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <TagInput
        type="edit"
        hidden={!inEditing}
        maxWidth={maxWidth!}
        handleKeyDown={handleKeyDown}
        active={active}
        ref={inputInsideRef}
        attributes={attributes}
        dispatchTagEvent={dispatchTagEvent!}
        isFocused={focused === FocusPosType.INPUT_EDIT}
      />
    </div>
  );
});
