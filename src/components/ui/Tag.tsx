import React, {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { TagInput } from "./TagInput";
import { FocusPosType } from "./TagSearchBox";
import { X } from "lucide-react";
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
        "group relative inline-flex items-center gap-1",
        "rounded-md border border-input bg-background px-2 py-1",
        "text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        active && "border-primary",
        inEditing && "border-primary ring-1 ring-primary/20",
        focused === FocusPosType.TAG && "border-primary ring-1 ring-primary/20"
      )}
      onClick={(e) => handleTagClick(e)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      ref={contentRef}
    >
      <div className="flex items-center gap-1">
        {attr && (
          <span className="text-muted-foreground/80 text-xs">{formattedAttrStr}</span>
        )}
        <span className="font-medium text-xs">{valueStr}</span>
      </div>

      {removeable && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "ml-1 rounded-sm opacity-70 ring-offset-background",
                  "transition-opacity hover:opacity-100",
                  "focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1",
                  "disabled:pointer-events-none disabled:opacity-50"
                )}
                onClick={handleDelete}
                disabled={!active}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove tag</span>
              </button>
            </TooltipTrigger>
            {active && (
              <TooltipContent side="bottom" className="text-xs">
                <p>Click to remove tag</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "absolute inset-0 cursor-text",
                "rounded-md",
                "focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1"
              )}
              role="button"
              tabIndex={-1}
            />
          </TooltipTrigger>
          {active && (
            <TooltipContent side="bottom" className="text-xs">
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
