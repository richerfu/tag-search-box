import React, {
  useState,
  useRef,
  useContext,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import { AttributeSelect, AttributeValue } from "./AttributeSelect";
import { ValueSelect } from "./valueselect/ValueSelect.tsx";
import { TagSearchBoxContext } from "./TagSearchboxContext";
import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

const keys: Record<string, string> = {
  "8": "backspace",
  "9": "tab",
  "13": "enter",
  "27": "esc",
  "37": "left",
  "38": "up",
  "39": "right",
  "40": "down",
};

const INPUT_MIN_SIZE = 0;
const SELECT_MIN_HEIGHT = 242;

interface TagInputProps {
  /**
   * 触发标签相关事件
   */
  dispatchTagEvent: (type: string, payload?: any) => void;
  /**
   * 所有属性集合
   */
  attributes: Array<AttributeValue>;
  /**
   * 是否为 Focus 态
   */
  isFocused: boolean;
  /**
   * 搜索框是否处于展开状态
   */
  active: boolean;
  /**
   * 输入框类型（用于修改标签值的 Input type 为 "edit"）
   */
  type?: "edit" | "add";
  /**
   * 是否隐藏
   */
  hidden?: boolean;
  /**
   * 最大宽度
   */
  maxWidth: number | null;
  /**
   * 处理按键事件
   */
  handleKeyDown?: (e: any) => void;
  /**
   * 位置偏移
   */
  inputOffset?: number;
}

interface TagInputRef {
  focusInput: () => void;
  moveToEnd: () => void;
  selectValue: () => void;
  selectAttr: () => void;
  setInputValue: (value: string, callback?: () => void) => void;
  resetInput: (callback?: () => void) => void;
  getInputValue: () => string;
  addTagByInputValue: () => boolean;
  setInfo: (info: any, callback?: () => void) => void;
}

interface TagInputState {
  inputWidth: number;
  inputValue: string;
  fullInputValue: string;
  attribute: AttributeValue | null;
  values: any[];
  showAttrSelect: boolean;
  showValueSelect: boolean;
  valueSelectOffset: number;
  popoverOpen: boolean;
  valueStr: string;
}

const TagInput = forwardRef<TagInputRef, TagInputProps>((props, ref) => {
  const { active, attributes, hidden, maxWidth, type, dispatchTagEvent } =
    props;

  const context = useContext(TagSearchBoxContext);

  const [state, setState] = useState<TagInputState>({
    inputWidth: INPUT_MIN_SIZE,
    inputValue: "",
    fullInputValue: "",
    attribute: null,
    values: [],
    showAttrSelect: false,
    showValueSelect: false,
    valueSelectOffset: 0,
    popoverOpen: false,
    valueStr: "",
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const inputMirrorRef = useRef<HTMLSpanElement>(null);
  const attrSelectRef = useRef<any>(null);
  const valueSelectRef = useRef<any>(null);

  // 辅助函数：获取属性字符串和值字符串
  const getAttrStrAndValueStr = (str: string) => {
    let attrStr = str,
      valueStr = "",
      pos = -1;

    for (let i = 0; i < attributes.length; ++i) {
      if (str.indexOf(attributes[i].name + ":") === 0) {
        // 获取属性/值
        attrStr = attributes[i].name;
        valueStr = str.substr(attrStr.length + 1);
        pos = attributes[i].name.length;
      }
    }

    return { attrStr, valueStr, pos };
  };

  // 刷新选择组件显示
  const refreshShow = () => {
    const { inputValue, attribute } = state;
    const input = inputRef.current;
    // @ts-ignore - 处理 HTMLInputElement 与 HTMLTextAreaElement 共有的属性
    const start = input?.selectionStart;
    // @ts-ignore
    const end = input?.selectionEnd;
    const pos = getAttrStrAndValueStr(inputValue).pos;

    if (pos < 0 || (start ?? 0) <= pos) {
      setState((prev) => ({
        ...prev,
        showAttrSelect: true,
        showValueSelect: false,
      }));
      return;
    }

    if (attribute && (end ?? 0) > pos) {
      setState((prev) => ({
        ...prev,
        showAttrSelect: false,
        showValueSelect: true,
      }));
    }
  };

  // 聚焦输入框
  const focusInput = () => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    input?.focus();
  };

  // 将光标移动到末尾
  const moveToEnd = () => {
    const input = inputRef.current;
    input?.focus();
    const value = state.inputValue;

    // @ts-ignore - 处理 HTMLInputElement 与 HTMLTextAreaElement 共有的属性
    setTimeout(() => input?.setSelectionRange(value.length, value.length), 0);
  };

  // 选择值部分
  const selectValue = () => {
    const input = inputRef.current;
    input?.focus();
    const value = state.inputValue;
    let pos = getAttrStrAndValueStr(value).pos;
    if (pos < 0) pos = -2;

    // @ts-ignore
    setTimeout(() => {
      input?.setSelectionRange(pos + 2, value.length);
      refreshShow();
    }, 0);
  };

  // 选择属性部分
  const selectAttr = () => {
    const input = inputRef.current;
    input?.focus();
    const value = state.inputValue;
    let pos = getAttrStrAndValueStr(value).pos;
    if (pos < 0) pos = 0;

    // @ts-ignore
    setTimeout(() => {
      input?.setSelectionRange(0, pos);
      refreshShow();
    }, 0);
  };

  // 设置输入值
  const setInputValue = (value: string, callback?: () => void) => {
    if (props.type === "edit" && value.trim().length <= 0) {
      return props.dispatchTagEvent("del", "edit");
    }

    let attribute = null,
      valueStr = value;
    const mirror = inputMirrorRef.current;

    // 属性是否存在
    for (let i = 0; i < attributes.length; ++i) {
      if (
        value.indexOf(attributes[i].name + ":") === 0 ||
        value.indexOf(attributes[i].name + "：") === 0
      ) {
        // 获取属性/值
        attribute = attributes[i];
        valueStr = value.substr(attributes[i].name.length + 1);

        // 计算 offset
        if (mirror) {
          mirror.innerText = attribute.name + ": ";
          let width = mirror.clientWidth;
          if (props.inputOffset) width += props.inputOffset;
          setState((prev) => ({
            ...prev,
            valueSelectOffset: width,
          }));
        }
        break;
      }
    }

    // 处理前导空格
    if (attribute && valueStr.replace(/^\s+/, "").length > 0) {
      value = attribute.name + ": " + valueStr.replace(/^\s+/, "");
    } else if (attribute) {
      value = attribute.name + ":" + valueStr;
    }

    // 更新值列表
    let newValues = state.values;
    if (attribute !== state.attribute && attribute) {
      newValues = valueStr.split("|").map((item) => ({ name: item.trim() }));
    }

    if (props.type === "edit") {
      props.dispatchTagEvent("editing", { attr: attribute ?? undefined });
    }

    if (mirror) {
      mirror.innerText = value;
      const width = Math.max(mirror.clientWidth, INPUT_MIN_SIZE);
      setState((prev) => ({
        ...prev,
        inputValue: value,
        fullInputValue: value,
        inputWidth: width,
        attribute,
        values: newValues,
      }));
    }

    if (callback) setTimeout(callback, 0);
  };

  // 设置完整输入值（包含输入法过程）
  const setFullInputValue = (value: string) => {
    let attribute = null,
      valueStr = value;
    const mirror = inputMirrorRef.current;

    // 检查是否是属性
    for (let i = 0; i < attributes.length; ++i) {
      if (
        value.indexOf(attributes[i].name + ":") === 0 ||
        value.indexOf(attributes[i].name + "：") === 0
      ) {
        // 获取属性/值
        attribute = attributes[i];
        valueStr = value.substr(attributes[i].name.length + 1);

        // 计算 offset
        if (mirror) {
          mirror.innerText = attribute.name + ": ";
          let width = mirror.clientWidth;
          if (props.inputOffset) width += props.inputOffset;
          setState((prev) => ({ ...prev, valueSelectOffset: width }));
        }
        break;
      }
    }

    // 处理前导空格
    if (attribute && valueStr.replace(/^\s+/, "").length > 0) {
      value = attribute.name + ": " + valueStr.replace(/^\s+/, "");
    } else if (attribute) {
      value = attribute.name + ":" + valueStr;
    }

    if (mirror) {
      mirror.innerText = value;
      const width = Math.max(mirror.clientWidth, INPUT_MIN_SIZE);
      setState((prev) => ({
        ...prev,
        fullInputValue: value,
        inputWidth: width,
      }));
    }
  };

  // 重置输入
  const resetInput = (callback?: () => void) => {
    setInputValue("", callback);
    setState((prev) => ({ ...prev, inputWidth: INPUT_MIN_SIZE }));
  };

  // 获取输入值
  const getInputValue = () => {
    return state.inputValue;
  };

  // 根据输入值添加标签
  const addTagByInputValue = () => {
    const { attribute, values, inputValue } = state;
    const type = props.type || "add";

    // 属性值搜索
    if (
      attribute &&
      props.attributes.filter((item) => item.key === attribute.key).length > 0
    ) {
      if (values.length <= 0) {
        return false;
      }
      props.dispatchTagEvent(type, { attr: attribute, values });
    } else {
      // 关键字搜索
      if (inputValue.trim().length <= 0) {
        return false;
      }
      const list = inputValue
        .split("|")
        .filter((item) => item.trim().length > 0)
        .map((item) => ({ name: item.trim() }));
      props.dispatchTagEvent(type, { attr: null, values: list });
    }

    setState((prev) => ({
      ...prev,
      showAttrSelect: false,
      showValueSelect: false,
    }));

    if (props.type !== "edit") {
      resetInput();
    }
    return true;
  };

  // 输入框变化
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setInputValue(e.target.value);
  };

  // 输入框点击
  const handleInputClick = (e: React.MouseEvent) => {
    props.dispatchTagEvent("click-input", props.type);
    e.stopPropagation();
    focusInput();
  };

  // 属性选择
  const handleAttrSelect = (attr: any) => {
    if (attr && attr.key) {
      const str = attr.name + ": ";
      const { inputValue } = state;

      if (inputValue.indexOf(str) >= 0) {
        selectValue();
      } else {
        setInputValue(str);
      }
      setState((prev) => ({ ...prev, values: [] }));
    }
    focusInput();
  };

  // 值变化
  const handleValueChange = (values: any[]) => {
    setState((prev) => ({ ...prev, values }));
    setInputValue(
      (state.attribute?.name ?? "") +
        ": " +
        values.map((item) => item.name).join(" | ")
    );
    focusInput();
  };

  // 值选择完成
  const handleValueSelect = (values: any[]) => {
    setState((prev) => ({ ...prev, values }));

    if (values.length <= 0) {
      setInputValue((state.attribute?.name ?? "") + ": ");
      return;
    }

    if (values.length > 0 && state.attribute) {
      const key = state.attribute.key;
      if (attributes.filter((item) => item.key === key).length > 0) {
        const type = props.type || "add";
        dispatchTagEvent(type, {
          attr: state.attribute,
          values,
        });
      }
      focusInput();
    }

    if (props.type !== "edit") {
      resetInput();
    }
  };

  // 值选择取消
  const handleValueCancel = () => {
    if (props.type === "edit") {
      const { attribute, values } = state;
      props.dispatchTagEvent("edit-cancel", {
        attr: attribute,
        values,
      });
    } else {
      resetInput(() => {
        focusInput();
      });
    }
  };

  // 处理粘贴事件
  const handlePaste = (e: React.ClipboardEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const { attribute } = state;

    if (!attribute || attribute.type === "input") {
      let value = "";

      try {
        const clipboardData = e.clipboardData;
        value = clipboardData.getData("Text") || "";
      } catch (_) {}

      if (/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/.test(value)) {
        value = value.replace(/[\r\n\t,，\s]+/g, "|");
      } else {
        value = value.replace(/[\r\n\t,，]+/g, "|");
      }

      value = value
        .split("|")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .join(" | ");

      const input = inputRef.current;
      // @ts-ignore
      const start = input?.selectionStart;
      // @ts-ignore
      const end = input?.selectionEnd;
      const { inputValue } = state;

      // 覆盖选择区域
      const curValue =
        inputValue.substring(0, start!) +
        value +
        inputValue.substring(end!, inputValue.length);

      // input 属性情况
      if (attribute && attribute.type === "input") {
        setInputValue(curValue, focusInput);
        return;
      }

      if (inputValue.length > 0) {
        setInputValue(curValue, focusInput);
      } else {
        setInputValue(curValue, addTagByInputValue);
      }
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!keys[e.keyCode.toString()]) return;

    if (props.hidden) {
      return props.handleKeyDown?.(e);
    }

    const { inputValue } = state;

    if (keys[e.keyCode.toString()] === "backspace" && inputValue.length > 0)
      return;

    if (
      (keys[e.keyCode.toString()] === "left" ||
        keys[e.keyCode.toString()] === "right") &&
      inputValue.length > 0
    ) {
      setTimeout(refreshShow, 0);
      return;
    }

    if (keys[e.keyCode.toString()] === "esc") {
      if (!inputValue) {
        context.close?.();
      }
      return handleValueCancel();
    }

    e.preventDefault();

    // 事件下传
    if (attrSelectRef.current) {
      if (attrSelectRef.current.handleKeyDown(e.keyCode) === false) return;
    }

    if (valueSelectRef.current) {
      valueSelectRef.current.handleKeyDownForRenderMode(e.key);
      if (valueSelectRef.current.handleKeyDown(e.keyCode) === false) return;
    }

    switch (keys[e.keyCode.toString()]) {
      case "enter":
      case "tab":
        if (!props.isFocused) {
          props.dispatchTagEvent("click-input");
        }
        addTagByInputValue();
        break;
      case "backspace":
        props.dispatchTagEvent("del", "keyboard");
        break;
      case "up":
        break;
      case "down":
        break;
    }
  };

  // 设置信息
  const setInfo = (info: any, callback?: () => void) => {
    const attribute = info.attr;
    const values = info.values;

    setState((prev) => ({ ...prev, attribute, values }));

    if (attribute) {
      setInputValue(
        attribute.name +
          ": " +
          values.map((item: any) => item.name).join(" | "),
        callback
      );
    } else {
      setInputValue(
        "" + values.map((item: any) => item.name).join(" | "),
        callback
      );
    }
  };

  // 处理 Popover 状态改变
  const handleOpenChange = (open: boolean) => {
    setState((prev) => ({ ...prev, popoverOpen: open }));
    if (!open) {
      context.close?.();
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    focusInput,
    moveToEnd,
    selectValue,
    selectAttr,
    setInputValue,
    resetInput,
    getInputValue,
    addTagByInputValue,
    setInfo,
  }));

  const {
    inputWidth,
    inputValue,
    fullInputValue,
    showAttrSelect,
    showValueSelect,
    attribute,
    valueSelectOffset,
    popoverOpen,
  } = state;

  // Only use valueStr from getAttrStrAndValueStr
  const valueStr = getAttrStrAndValueStr(inputValue).valueStr;

  let maxHeight = SELECT_MIN_HEIGHT;
  try {
    if (wrapperRef.current) {
      maxHeight = Math.max(
        window.innerHeight -
          wrapperRef.current.getBoundingClientRect().bottom -
          60,
        SELECT_MIN_HEIGHT
      );
    }
  } catch (_) {}

  // Update valueStr when inputValue changes
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      valueStr: getAttrStrAndValueStr(state.inputValue).valueStr,
    }));
  }, [state.inputValue]);

  const renderValueSelect = () => {
    if (!state.showValueSelect || !state.attribute) {
      return null;
    }

    const { type, values, render } = state.attribute!;
    return (
      <ValueSelect
        ref={valueSelectRef}
        type={type ?? ""}
        values={values ?? []}
        render={render}
        inputValue={state.valueStr}
        offset={state.valueSelectOffset}
        onChange={handleValueChange}
        onSelect={handleValueSelect}
        onCancel={handleValueCancel}
        maxHeight={SELECT_MIN_HEIGHT}
      />
    );
  };

  return (
    <div
      ref={wrapperRef}
      className={cn("relative inline-block", hidden && "hidden")}
      style={{
        width: hidden ? 0 : active ? inputWidth + 6 : 6,
        padding: type === "edit" && !hidden ? "0 8px" : "",
      }}
      onClick={handleInputClick}
    >
      <Popover
        open={state.popoverOpen}
        onOpenChange={(open) =>
          setState((prev) => ({ ...prev, popoverOpen: open }))
        }
      >
        <PopoverTrigger asChild>
          <div
            style={{
              width: hidden ? 0 : state.inputWidth + 6,
              maxWidth: maxWidth ? maxWidth - 36 : 435,
              display: active ? "" : "none",
            }}
          >
            {type !== "edit" ? (
              <Input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                value={state.inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onClick={refreshShow}
                onPaste={handlePaste}
                className={cn(
                  "h-full w-full border-none p-0 text-sm",
                  "bg-transparent",
                  "focus:outline-none focus:ring-0 focus-visible:ring-0",
                  "placeholder:text-muted-foreground/70",
                  "caret-foreground",
                  "shadow-none"
                )}
                style={{
                  width: hidden ? 0 : state.inputWidth + 6,
                  display: active ? "" : "none",
                  maxWidth: maxWidth ? maxWidth - 36 : 435,
                }}
                data-type="tag-input"
              />
            ) : (
              <Input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                value={state.inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onClick={refreshShow}
                onPaste={handlePaste}
                className={cn(
                  "h-full w-full border-none p-0 text-sm",
                  "bg-transparent",
                  "focus:outline-none focus:ring-0 focus-visible:ring-0",
                  "placeholder:text-muted-foreground/70",
                  "caret-foreground",
                  "shadow-none"
                )}
                style={{
                  position: "absolute",
                  width: hidden ? 0 : state.inputWidth + 30,
                  display: active ? "" : "none",
                  maxWidth: maxWidth ? maxWidth - 36 : 435,
                  top: 0,
                  left: 0,
                  height: "100%",
                  resize: "none",
                  minHeight: 20,
                }}
              />
            )}
            <span
              ref={inputMirrorRef}
              className="invisible absolute left-0 top-0 whitespace-pre text-sm"
              style={{ padding: "inherit" }}
            >
              {state.fullInputValue}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "w-[var(--radix-popover-trigger-width)] p-0",
            "min-h-[var(--radix-popover-trigger-height)]"
          )}
          align="start"
          sideOffset={4}
        >
          {state.showAttrSelect && (
            <Command className="rounded-lg border shadow-md">
              <CommandInput placeholder="Search attributes..." />
              <CommandEmpty>No attributes found.</CommandEmpty>
              <CommandGroup>
                {attributes.map((attr) => (
                  <CommandItem
                    key={attr.key}
                    onSelect={() => handleAttrSelect(attr)}
                    className="cursor-pointer"
                  >
                    {attr.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          )}
          {renderValueSelect()}
        </PopoverContent>
      </Popover>
    </div>
  );
});

export { TagInput };
