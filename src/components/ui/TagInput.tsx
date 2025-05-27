import React, { Component, createRef } from "react";
import { AttributeValue } from "./AttributeSelect";
import { ValueSelect } from "./valueselect/ValueSelect.tsx";
import { TagSearchBoxContext } from "./TagSearchboxContext";
import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

const keys: Record<string | number, string> = {
  8: "backspace",
  9: "tab",
  13: "enter",
  27: "esc",
  37: "left",
  38: "up",
  39: "right",
  40: "down",
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

interface TagInputState {
  inputWidth: number;
  inputValue: string;
  fullInputValue: string;
  attribute: AttributeValue | null;
  values: any[];
  showAttrSelect: boolean;
  showValueSelect: boolean;
  valueSelectOffset: number;
  valueStr: string;
}

class TagInput extends Component<TagInputProps, TagInputState> {
  static contextType = TagSearchBoxContext;
  declare context: React.ContextType<typeof TagSearchBoxContext>;

  private wrapperRef = createRef<HTMLDivElement>();
  private inputRef = createRef<HTMLInputElement>();
  private inputMirrorRef = createRef<HTMLSpanElement>();
  private attrSelectRef = createRef<any>();
  private valueSelectRef = createRef<any>();

  constructor(props: TagInputProps) {
    super(props);
    this.state = {
      inputWidth: INPUT_MIN_SIZE,
      inputValue: "",
      fullInputValue: "",
      attribute: null,
      values: [],
      showAttrSelect: false,
      showValueSelect: false,
      valueSelectOffset: 0,
      valueStr: "",
    };
  }

  // Helper function to get attribute string and value string
  private getAttrStrAndValueStr = (str: string) => {
    let attrStr = str,
      valueStr = "",
      pos = -1;

    for (let i = 0; i < this.props.attributes.length; ++i) {
      if (str.indexOf(this.props.attributes[i].name + ":") === 0) {
        attrStr = this.props.attributes[i].name;
        valueStr = str.substr(attrStr.length + 1);
        pos = this.props.attributes[i].name.length;
      }
    }

    return { attrStr, valueStr, pos };
  };

  // Refresh selection component display
  private refreshShow = () => {
    const { inputValue, attribute } = this.state;
    const input = this.inputRef.current;
    const start = input?.selectionStart;
    const end = input?.selectionEnd;
    const pos = this.getAttrStrAndValueStr(inputValue).pos;

    if (pos < 0 || (start ?? 0) <= pos) {
      this.setState({
        showAttrSelect: true,
        showValueSelect: false,
      });
      return;
    }

    if (attribute && (end ?? 0) > pos) {
      this.setState({
        showAttrSelect: false,
        showValueSelect: true,
      });
    }
  };

  // Focus input
  public focusInput = () => {
    if (!this.inputRef.current) return;
    this.inputRef.current.focus();
  };

  // Move cursor to end
  public moveToEnd = () => {
    const input = this.inputRef.current;
    input?.focus();
    const value = this.state.inputValue;

    setTimeout(() => input?.setSelectionRange(value.length, value.length), 0);
  };

  // Select value part
  public selectValue = () => {
    const input = this.inputRef.current;
    input?.focus();
    const value = this.state.inputValue;

    let pos = this.getAttrStrAndValueStr(value).pos;
    if (pos < 0) pos = -2;

    setTimeout(() => {
      input?.setSelectionRange(pos + 2, value.length);
      this.refreshShow();
    }, 0);
  };

  // Select attribute part
  public selectAttr = () => {
    const input = this.inputRef.current;
    input?.focus();
    const value = this.state.inputValue;
    let pos = this.getAttrStrAndValueStr(value).pos;
    if (pos < 0) pos = 0;

    setTimeout(() => {
      input?.setSelectionRange(0, pos);
      this.refreshShow();
    }, 0);
  };

  // Set input value
  public setInputValue = (value: string, callback?: () => void) => {
    if (this.props.type === "edit" && value.trim().length <= 0) {
      return this.props.dispatchTagEvent("del", "edit");
    }

    let attribute = null,
      valueStr = value;
    const mirror = this.inputMirrorRef.current;

    // Check if attribute exists
    for (let i = 0; i < this.props.attributes.length; ++i) {
      if (
        value.indexOf(this.props.attributes[i].name + ":") === 0 ||
        value.indexOf(this.props.attributes[i].name + "：") === 0
      ) {
        attribute = this.props.attributes[i];
        valueStr = value.substr(this.props.attributes[i].name.length + 1);

        if (mirror) {
          mirror.innerText = attribute.name + ": ";
          let width = mirror.clientWidth;
          if (this.props.inputOffset) width += this.props.inputOffset;
          this.setState({ valueSelectOffset: width });
        }
        break;
      }
    }

    // Handle leading spaces
    if (attribute && valueStr.replace(/^\s+/, "").length > 0) {
      value = attribute.name + ": " + valueStr.replace(/^\s+/, "");
    } else if (attribute) {
      value = attribute.name + ":" + valueStr;
    }

    if (attribute !== this.state.attribute && attribute) {
      this.setState({
        values: valueStr.split("|").map((item) => ({ name: item.trim() })),
      });
    }

    if (this.props.type === "edit") {
      this.props.dispatchTagEvent("editing", { attr: attribute ?? undefined });
    }

    this.setState(
      {
        attribute,
      },
      this.refreshShow
    );

    if (mirror) {
      mirror.innerText = value;
      const width = Math.max(mirror.clientWidth, INPUT_MIN_SIZE);
      this.setState(
        {
          inputValue: value,
          fullInputValue: value,
          inputWidth: width,
        },
        () => callback && callback()
      );
    } else if (callback) {
      setTimeout(callback, 0);
    }
  };

  // Set full input value (including IME process)
  private setFullInputValue = (value: string) => {
    let attribute = null,
      valueStr = value;
    const mirror = this.inputMirrorRef.current;

    for (let i = 0; i < this.props.attributes.length; ++i) {
      if (
        value.indexOf(this.props.attributes[i].name + ":") === 0 ||
        value.indexOf(this.props.attributes[i].name + "：") === 0
      ) {
        attribute = this.props.attributes[i];
        valueStr = value.substr(this.props.attributes[i].name.length + 1);

        if (mirror) {
          mirror.innerText = attribute.name + ": ";
          let width = mirror.clientWidth;
          if (this.props.inputOffset) width += this.props.inputOffset;
          this.setState({ valueSelectOffset: width });
        }
        break;
      }
    }

    if (attribute && valueStr.replace(/^\s+/, "").length > 0) {
      value = attribute.name + ": " + valueStr.replace(/^\s+/, "");
    } else if (attribute) {
      value = attribute.name + ":" + valueStr;
    }

    if (mirror) {
      mirror.innerText = value;
      const width = Math.max(mirror.clientWidth, INPUT_MIN_SIZE);
      this.setState({
        fullInputValue: value,
        inputWidth: width,
      });
    }
  };

  // Reset input
  public resetInput = (callback?: () => void) => {
    this.setInputValue("", callback);
    this.setState({ inputWidth: INPUT_MIN_SIZE });
  };

  // Get input value
  public getInputValue = () => {
    return this.state.inputValue;
  };

  // Add tag by input value
  public addTagByInputValue = () => {
    const { attribute, values, inputValue } = this.state;
    const type = this.props.type || "add";

    if (
      attribute &&
      this.props.attributes.filter((item) => item.key === attribute.key)
        .length > 0
    ) {
      if (values.length <= 0) {
        return false;
      }
      this.props.dispatchTagEvent(type, { attr: attribute, values });
    } else {
      if (inputValue.trim().length <= 0) {
        return false;
      }
      const list = inputValue
        .split("|")
        .filter((item) => item.trim().length > 0)
        .map((item) => ({ name: item.trim() }));
      this.props.dispatchTagEvent(type, { attr: null, values: list });
    }

    this.setState({
      showAttrSelect: false,
      showValueSelect: false,
    });

    if (this.props.type !== "edit") {
      this.resetInput();
    }
    return true;
  };

  // Event handlers
  private handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setInputValue(e.target.value);
  };

  private handleInputClick = (e: React.MouseEvent) => {
    this.props.dispatchTagEvent("click-input", this.props.type);
    e.stopPropagation();
    this.focusInput();
  };

  private handleAttrSelect = (attr: any) => {
    if (attr && attr.key) {
      const str = attr.name + ": ";
      const { inputValue } = this.state;

      if (inputValue.indexOf(str) >= 0) {
        this.selectValue();
      } else {
        this.setInputValue(str);
      }
      this.setState({ values: [] });
    }
    this.focusInput();
  };

  private handleValueChange = (values: any[]) => {
    this.setState({ values });
    this.setInputValue(
      (this.state.attribute?.name ?? "") +
        ": " +
        values.map((item) => item.name).join(" | ")
    );
    this.focusInput();
  };

  private handleValueSelect = (values: any[]) => {
    this.setState({ values });

    if (values.length <= 0) {
      this.setInputValue((this.state.attribute?.name ?? "") + ": ");
      return;
    }

    if (values.length > 0 && this.state.attribute) {
      const key = this.state.attribute.key;
      if (this.props.attributes.filter((item) => item.key === key).length > 0) {
        const type = this.props.type || "add";
        this.props.dispatchTagEvent(type, {
          attr: this.state.attribute,
          values,
        });
      }
      this.focusInput();
    }

    if (this.props.type !== "edit") {
      this.resetInput();
    }
  };

  private handleValueCancel = () => {
    if (this.props.type === "edit") {
      const { attribute, values } = this.state;
      this.props.dispatchTagEvent("edit-cancel", {
        attr: attribute,
        values,
      });
    } else {
      this.resetInput(() => {
        this.focusInput();
      });
    }
  };

  private handlePaste = (e: React.ClipboardEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const { attribute } = this.state;

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

      const input = this.inputRef.current;
      const start = input?.selectionStart;
      const end = input?.selectionEnd;
      const { inputValue } = this.state;

      const curValue =
        inputValue.substring(0, start!) +
        value +
        inputValue.substring(end!, inputValue.length);

      if (attribute && attribute.type === "input") {
        this.setInputValue(curValue, this.focusInput);
        return;
      }

      if (inputValue.length > 0) {
        this.setInputValue(curValue, this.focusInput);
      } else {
        this.setInputValue(curValue, this.addTagByInputValue);
      }
    }
  };

  private handleKeyDown = (e: React.KeyboardEvent) => {
    if (!keys[e.keyCode]) return;

    if (this.props.hidden) {
      return this.props.handleKeyDown?.(e);
    }

    const { inputValue } = this.state;

    if (keys[e.keyCode] === "backspace" && inputValue.length > 0) return;

    if (
      (keys[e.keyCode] === "left" || keys[e.keyCode] === "right") &&
      inputValue.length > 0
    ) {
      setTimeout(this.refreshShow, 0);
      return;
    }

    if (keys[e.keyCode] === "esc") {
      if (!inputValue) {
        this.context.close?.();
      }
      return this.handleValueCancel();
    }

    e.preventDefault();

    if (this.attrSelectRef.current) {
      if (this.attrSelectRef.current.handleKeyDown(e.keyCode) === false) return;
    }

    if (this.valueSelectRef.current) {
      this.valueSelectRef.current.handleKeyDownForRenderMode(e.key);
      if (this.valueSelectRef.current.handleKeyDown(e.keyCode) === false)
        return;
    }

    switch (keys[e.keyCode.toString()]) {
      case "enter":
      case "tab":
        if (!this.props.isFocused) {
          this.props.dispatchTagEvent("click-input");
        }
        this.addTagByInputValue();
        break;
      case "backspace":
        this.props.dispatchTagEvent("del", "keyboard");
        break;
      case "up":
        break;
      case "down":
        break;
    }
  };

  public setInfo = (info: any, callback?: () => void) => {
    const attribute = info.attr;
    const values = info.values;

    this.setState({ attribute, values });

    if (attribute) {
      this.setInputValue(
        attribute.name +
          ": " +
          values.map((item: any) => item.name).join(" | "),
        callback
      );
    } else {
      this.setInputValue(
        "" + values.map((item: any) => item.name).join(" | "),
        callback
      );
    }
  };

  private handleOpenChange = (open: boolean) => {
    if (!open) {
      this.context.close?.();
    }
  };

  componentDidUpdate(prevProps: TagInputProps, prevState: TagInputState) {
    if (prevState.inputValue !== this.state.inputValue) {
      this.setState({
        valueStr: this.getAttrStrAndValueStr(this.state.inputValue).valueStr,
      });
    }
  }

  render() {
    const { active, hidden, maxWidth, type, isFocused } = this.props;

    const {
      inputWidth,
      inputValue,
      fullInputValue,
      showAttrSelect,
      showValueSelect,
      attribute,
      valueSelectOffset,
    } = this.state;

    let maxHeight = SELECT_MIN_HEIGHT;
    try {
      if (this.wrapperRef.current) {
        maxHeight = Math.max(
          window.innerHeight -
            this.wrapperRef.current.getBoundingClientRect().bottom -
            60,
          SELECT_MIN_HEIGHT
        );
      }
    } catch (_) {}

    return (
      <div
        ref={this.wrapperRef}
        className={cn("relative inline-block", hidden && "hidden")}
        style={{
          width: hidden ? 0 : active ? inputWidth + 6 : 6,
          padding: type === "edit" && !hidden ? "0 8px" : "",
        }}
        onClick={this.handleInputClick}
      >
        <Popover
          open={
            active &&
            isFocused &&
            (showAttrSelect ||
              (showValueSelect && !!attribute && !!attribute.type))
          }
          onOpenChange={this.handleOpenChange}
        >
          <PopoverTrigger asChild>
            <div
              style={{
                width: hidden ? 0 : inputWidth + 6,
                maxWidth: maxWidth ? maxWidth - 36 : 435,
                display: active ? "" : "none",
              }}
            >
              {type !== "edit" ? (
                <Input
                  ref={this.inputRef}
                  value={inputValue}
                  onChange={this.handleInputChange}
                  onKeyDown={this.handleKeyDown}
                  onClick={this.refreshShow}
                  onPaste={this.handlePaste}
                  onFocus={this.refreshShow}
                  onInput={(e) => this.setFullInputValue(e.currentTarget.value)}
                  className={cn(
                    "h-full w-full border-none p-0 text-sm",
                    "bg-transparent",
                    "focus:outline-none focus:ring-0 focus-visible:ring-0",
                    "placeholder:text-muted-foreground/70",
                    "caret-foreground",
                    "shadow-none"
                  )}
                  style={{
                    width: hidden ? 0 : inputWidth + 6,
                    display: active ? "" : "none",
                    maxWidth: maxWidth ? maxWidth - 36 : 435,
                  }}
                  data-type="tag-input"
                />
              ) : (
                <Input
                  ref={this.inputRef}
                  value={inputValue}
                  onChange={this.handleInputChange}
                  onKeyDown={this.handleKeyDown}
                  onClick={this.refreshShow}
                  onPaste={this.handlePaste}
                  onFocus={this.refreshShow}
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
                    width: hidden ? 0 : inputWidth + 30,
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
                ref={this.inputMirrorRef}
                className="invisible absolute left-0 top-0 whitespace-pre text-sm"
                style={{ padding: "inherit" }}
              >
                {fullInputValue}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className={cn("bg-white p-0 border-gray-200 ignore-outside-click")}
            align="start"
            sideOffset={20}
          >
            {showAttrSelect && (
              <Command className="rounded-none border-none shadow-none">
                <CommandInput placeholder="Search attributes..." />
                <CommandEmpty>No attributes found.</CommandEmpty>
                <CommandGroup>
                  {this.props.attributes.map((attr) => (
                    <CommandItem
                      key={attr.key}
                      onSelect={() => this.handleAttrSelect(attr)}
                      className="cursor-pointer hover:bg-gray-50 data-[selected=true]:bg-gray-100"
                    >
                      {attr.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            )}
            {showValueSelect && !!attribute && !!attribute.type && (
              <ValueSelect
                ref={this.valueSelectRef}
                type={attribute.type}
                values={attribute.values ?? []}
                render={attribute.render}
                inputValue={this.state.valueStr}
                offset={this.state.valueSelectOffset}
                onChange={this.handleValueChange}
                onSelect={this.handleValueSelect}
                onCancel={this.handleValueCancel}
                maxHeight={maxHeight}
              />
            )}
          </PopoverContent>
        </Popover>
      </div>
    );
  }
}

export { TagInput };
