import React, { useState, useEffect, useContext, useCallback } from "react";
import { DropdownMenu } from "@/components/ui/dropdown";
import { CommandItem, Command } from "@/components/ui/command";
import { TagSearchBoxContext } from "./TagSearchboxContext";

export interface Value {
  /**
   * 项标识
   */
  key?: string;
  /**
   * 属性展示值
   */
  name: string;
  /**
   * 项渲染样式
   */
  style?: React.CSSProperties;
}
export interface AttributeRenderProps {
  /**
   * 当前输入值
   */
  inputValue: string;
  /**
   * 监听某些操作键位被按下
   */
  onOperationalKeyDown?: (
    listener: (key: "ArrowDown" | "ArrowUp" | "Enter" | "Tab") => void
  ) => void;
  /**
   * 确认选择
   */
  onSelect: (value: Value[]) => void;
  /**
   * 取消
   */
  onCancel: () => void;
}
export type AttributeType = "input" | "single" | "multiple" | "render";
export type AttributeTypeOptions =
  | ["input", {}]
  | ["render", {}]
  | [
      "single",
      {
        /**
         * 是否启用搜索
         * @default false
         * @since 2.5.0
         */
        searchable?: boolean;
        /**
         * 无可选项时提示内容
         */
        emptyText?: React.ReactNode;
        /**
         * 列表最大宽度
         * @since 2.7.9
         */
        maxWidth?: number | string;
        /**
         * 自定义渲染项
         * @since 2.7.9
         */
        itemRender?: (text: string, value: Value) => React.ReactNode;
      }
    ]
  | [
      "multiple",
      {
        /**
         * 是否开启全选
         * @default true
         */
        all?: boolean;
        /**
         * 是否启用搜索
         * @default false
         * @since 2.5.0
         */
        searchable?: boolean;
        /**
         * 无可选项时提示内容
         */
        emptyText?: React.ReactNode;
        /**
         * 列表最大宽度
         * @since 2.7.9
         */
        maxWidth?: number | string;
        /**
         * 自定义渲染项
         * @since 2.7.9
         */
        itemRender?: (text: string, value: Value) => React.ReactNode;
      }
    ];
export interface AttributeValue {
  /**
   * 为资源属性需求值的类型
   *
   * 可使用数组形式进行详细配置，如：
   *
   * ```js
   * ["multiple", { all: true }]
   * ```
   *
   * 其中：
   *
   *`"single"`：
   *  - `searchable` 是否启用搜索
   *  - `emptyText` 无可选项时提示内容
   *  - `maxWidth` 列表最大宽度
   *  - `itemRender` 自定义渲染列表项
   *
   *`"multiple"`：
   *  - `all` 是否启用全选
   *  - `searchable` 是否启用搜索
   *  - `emptyText` 无可选项时提示内容
   *  - `maxWidth` 列表最大宽度
   *  - `itemRender` 自定义渲染列表项
   *
   * @docType "input" | "single" | "multiple" | "render" | [AttributeType, AttributeOptions]
   */
  type: AttributeType | AttributeTypeOptions;
  /**
   * 属性的唯一标识，会在结果中返回
   */
  key: string;
  /**
   * 资源属性值名称
   */
  name: string;
  /**
   * 资源属性可用值
   * @docType Value[] | (() => Value[]) | (() => Promise<Value[]>)
   */
  values?: Value[] | (() => Value[]) | (() => Promise<Value[]>);
  /**
   * 该属性是否可重复选择
   * @default false
   */
  reusable?: boolean;
  /**
   * 该属性是否可移除
   * @default true
   */
  removeable?: boolean;
  /**
   * 自定义渲染
   */
  render?: (props: AttributeRenderProps) => React.ReactNode;
}
export interface AttributeSelectProps {
  attributes: AttributeValue[];
  inputValue: string;
  onSelect?: (attribute: AttributeValue) => void;
  maxHeight: number;
}
export interface AttributeSelectState {
  select: number;
  lastInputValue: string;
}

const keys: Record<
  string,
  "backspace" | "tab" | "enter" | "left" | "up" | "right" | "down"
> = {
  "8": "backspace",
  "9": "tab",
  "13": "enter",
  "37": "left",
  "38": "up",
  "39": "right",
  "40": "down",
};

export const AttributeSelect: React.FC<AttributeSelectProps> = ({
  attributes,
  inputValue,
  onSelect,
  maxHeight,
}) => {
  const [select, setSelect] = useState(-1);
  const context = useContext(TagSearchBoxContext);
  const { disableAttributesFilter, attributesSelectTips } = context;

  // 重置选择状态当输入值改变时
  useEffect(() => {
    setSelect(-1);
  }, [inputValue]);

  const getUseableList = useCallback(() => {
    if (disableAttributesFilter) {
      return attributes;
    }
    // 获取冒号前字符串模糊查询
    const fuzzyValue = /(.*?)(:|：).*/.test(inputValue)
      ? RegExp.$1
      : inputValue;
    return attributes.filter(
      (item) => item.name.includes(inputValue) || item.name.includes(fuzzyValue)
    );
  }, [attributes, inputValue, disableAttributesFilter]);

  const getAttribute = useCallback(
    (selectIndex: number) => {
      const list = getUseableList();
      if (selectIndex < list.length) {
        return list[selectIndex];
      }
    },
    [getUseableList]
  );

  const move = useCallback(
    (step: number) => {
      const list = getUseableList();
      if (list.length <= 0) return;
      setSelect((prev) => (prev + step + list.length) % list.length);
    },
    [getUseableList]
  );

  const handleKeyDown = useCallback(
    (keyCode: string) => {
      if (!keys[keyCode]) return;

      switch (keys[keyCode]) {
        case "enter":
        case "tab":
          if (select < 0) break;
          if (onSelect) {
            onSelect(getAttribute(select)!);
          }
          return false;
        case "up":
          move(-1);
          break;
        case "down":
          move(1);
          break;
      }
    },
    [select, onSelect, getAttribute, move]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      e.nativeEvent.stopPropagation();
      if (onSelect) {
        onSelect(getAttribute(index)!);
      }
    },
    [onSelect, getAttribute]
  );

  const list = getUseableList().map((item, index) => (
    <CommandItem
      key={index}
      //   selected={select === index}
      onClick={(e) => handleClick(e, index)}
    >
      {item.name}
    </CommandItem>
  ));

  if (list.length === 0) return null;

  return (
    <DropdownMenu>
      <Command>
        {attributesSelectTips && (
          <CommandItem disabled>{attributesSelectTips}</CommandItem>
        )}
        {list}
      </Command>
    </DropdownMenu>
  );
};

// 暴露 handleKeyDown 方法给父组件
export const useAttributeSelectRef = (ref: React.RefObject<any>) => {
  const handleKeyDown = useCallback(
    (keyCode: string) => {
      if (ref.current) {
        ref.current.handleKeyDown(keyCode);
      }
    },
    [ref]
  );

  return { handleKeyDown };
};
