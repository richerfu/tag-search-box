import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { searchFilter } from "../util";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scrollarea";
import { cn } from "@/lib/utils";
import { Value } from "../AttributeSelect";

const keys: Record<string, string> = {
  "8": "backspace",
  "9": "tab",
  "13": "enter",
  "37": "left",
  "38": "up",
  "39": "right",
  "40": "down",
};

interface IMultipleValueSelectProps {
  values: Value[];
  inputValue: string;
  onChange: (value: Value[]) => void;
  onSelect: (value: Value[]) => void;
  onCancel: () => void;
  offset: number;
  maxHeight: number;
  /**
   * 是否支持全选
   * @default true
   */
  all?: boolean;
  /**
   * 是否支持搜索
   * @default false
   * @since 2.5.0
   */
  searchable?: boolean;
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

interface IMultipleValueSelectRef {
  handleKeyDown: (keyCode: string | number) => boolean | undefined;
}

const MultipleValueSelect = forwardRef<
  IMultipleValueSelectRef,
  IMultipleValueSelectProps
>((props, ref) => {
  const {
    values,
    inputValue,
    offset = 0,
    all = true,
    maxHeight = 350,
    searchable = false,
    maxWidth,
    itemRender = (x) => x,
    onSelect,
    onChange,
    onCancel,
  } = props;

  // 初始化选择项
  const initSelect = () => {
    const list = inputValue.split("|").map((i) => i.trim());
    const select: number[] = [];

    const formattedValues = values.map((item) => ({
      ...item,
      name: item.name.trim(),
    }));

    formattedValues.forEach((item, index) => {
      if (list.indexOf(item.name) >= 0) {
        select.push(index);
      }
    });

    return select;
  };

  const [curIndex, setCurIndex] = useState(0);
  const [select, setSelect] = useState<number[]>(initSelect());
  const [searchValue, setSearchValue] = useState("");
  const [lastInputValue, setLastInputValue] = useState(inputValue);

  // 处理输入值变更
  useEffect(() => {
    if (lastInputValue !== inputValue) {
      setSelect(initSelect());
      setLastInputValue(inputValue);
    }
  }, [inputValue]);

  // 初始化时若无选中项则触发 onSelect
  useEffect(() => {
    if (select.length <= 0 && onSelect) {
      onSelect(getValue(select));
    }
  }, []);

  // 获取选中的值
  const getValue = (selectedIndexes: number[]) => {
    return selectedIndexes.map((i) => values[i]);
  };

  // 键盘操作处理
  const handleKeyDown = (keyCode: string | number) => {
    if (!keys[keyCode as keyof typeof keys]) return;

    switch (keys[keyCode as keyof typeof keys]) {
      case "tab":
        if (curIndex < 0) return false;
        if (curIndex === 0) {
          handleSelectAll();
          return false;
        }

        const newSelect = [...select];
        const pos = newSelect.indexOf(curIndex - 1);

        if (pos >= 0) {
          newSelect.splice(pos, 1);
        } else {
          newSelect.push(curIndex - 1);
        }

        setSelect(newSelect);
        onChange?.(getValue(newSelect));
        return false;

      case "enter":
        onSelect?.(getValue(select));
        return false;

      case "up":
        move(-1);
        break;

      case "down":
        move(1);
        break;
    }
  };

  // 上下移动焦点
  const move = (step: number) => {
    if (values.length <= 0) return;

    setCurIndex((prevIndex) => {
      return (prevIndex + step + (values.length + 1)) % (values.length + 1);
    });
  };

  // 点击列表项
  const handleClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();

    if (
      (e.target as HTMLElement).tagName === "LABEL" ||
      (e.target as HTMLElement).tagName === "SPAN"
    ) {
      return;
    }

    const newSelect = [...select];
    const pos = newSelect.indexOf(index);

    if (pos >= 0) {
      newSelect.splice(pos, 1);
    } else {
      newSelect.push(index);
    }

    setSelect(newSelect);
    onChange?.(getValue(newSelect));
  };

  // 全选/取消全选
  const handleSelectAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (select.length === values.length) {
      setSelect([]);
      onChange?.([]);
    } else {
      setSelect(values.map((_, index) => index));
      onChange?.(values);
    }
  };

  // 确认选择
  const handleSubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(getValue(select));
  };

  // 取消选择
  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel?.();
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    handleKeyDown,
  }));

  // 过滤并渲染列表项
  const filteredItems = values
    .map((item, index) => ({ ...item, index }))
    .filter(({ name }) => searchFilter(name, searchValue))
    .map(({ index, ...item }) => (
      <div
        key={index}
        className={cn(
          "flex items-center p-2 rounded-md cursor-pointer hover:bg-slate-100 transition-colors",
          curIndex === index + 1 ? "bg-slate-100" : ""
        )}
        onClick={(e) => handleClick(e, index)}
      >
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={select.indexOf(index) >= 0}
            id={`item-${index}`}
            className="data-[state=checked]:bg-blue-500"
          />
          <label
            htmlFor={`item-${index}`}
            className="text-sm cursor-pointer"
            style={item.style || {}}
            title={item.name}
          >
            {itemRender(item.name, item)}
          </label>
        </div>
      </div>
    ));

  return (
    <Card
      className="w-auto border-none shadow-none"
      style={{
        maxWidth: maxWidth || 300,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {searchable && (
        <div className="p-2 border-b">
          <Input
            placeholder="搜索..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-8"
          />
        </div>
      )}

      <CardContent className="p-0">
        <ScrollArea
          className="h-full max-h-[300px]"
          style={{ maxHeight: maxHeight - 50 }}
        >
          <div className="p-1">
            {all && !searchValue && (
              <div
                className={cn(
                  "flex items-center p-2 rounded-md cursor-pointer hover:bg-slate-100 transition-colors",
                  curIndex === 0 ? "bg-slate-100" : ""
                )}
                onClick={handleSelectAll}
              >
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={select.length === values.length}
                    id="select-all"
                    className="data-[state=checked]:bg-blue-500"
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Select All
                  </label>
                </div>
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className="flex items-center justify-center p-4 text-sm text-slate-500">
                没有匹配的结果
              </div>
            ) : (
              filteredItems
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex justify-end p-2 pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={select.length === 0}
            variant="default"
          >
            OK
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
});

export { MultipleValueSelect };
