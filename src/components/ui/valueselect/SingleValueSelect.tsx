import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { searchFilter } from "../util";

import {
  Card,
  CardContent
} from "@/components/ui/card";
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

interface SingleValueSelectProps {
    values: Value[];
    inputValue: string;
    onChange?: (value: Value[]) => void;
    onSelect?: (value: Value[]) => void;
    offset: number;
    maxHeight: number;
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

interface SingleValueSelectRef {
  handleKeyDown: (keyCode: string | number) => boolean | undefined;
}

const SingleValueSelect = forwardRef<SingleValueSelectRef, SingleValueSelectProps>((props, ref) => {
  const {
    values,
    inputValue,
    offset = 0,
    maxHeight = 300,
    searchable = false,
    maxWidth,
    itemRender = (x) => x,
    onSelect
  } = props;

  // 初始化选择项
  const initSelect = () => {
    let selectIndex = -1;
    values.forEach((item, index) => {
      if (item.name === inputValue) {
        selectIndex = index;
      }
    });
    return selectIndex;
  };

  const [select, setSelect] = useState<number>(initSelect());
  const [searchValue, setSearchValue] = useState("");

  // 处理输入值变更
  useEffect(() => {
    const list = values.map(item => item.name);
    const newSelect = list.indexOf(inputValue);
    setSelect(newSelect);
  }, [inputValue, values]);

  // 初始化时若无选中项则触发 onSelect
  useEffect(() => {
    if (select < 0 && onSelect) {
      onSelect(getValue(select));
    }
  }, []);

  // 获取选中的值
  const getValue = (selectIndex: number) => {
    if (selectIndex < 0) return [];
    
    const list = values;
    
    if (selectIndex < list.length) {
      return [list[selectIndex]];
    } else {
      const newSelectIndex = list.map(item => item.name).indexOf(inputValue);
      setSelect(newSelectIndex);
      
      if (newSelectIndex < 0) return [];
      return [list[newSelectIndex]];
    }
  };

  // 键盘操作处理
  const handleKeyDown = (keyCode: string | number) => {
    if (!keys[keyCode as keyof typeof keys]) return;

    switch (keys[keyCode as keyof typeof keys]) {
      case "enter":
      case "tab":
        if (onSelect) {
          onSelect(getValue(select));
        }
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
    const list = values;
    if (list.length <= 0) return;
    
    setSelect(prevSelect => {
      return (prevSelect + step + list.length) % list.length;
    });
  };

  // 点击列表项
  const handleClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(getValue(index));
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    handleKeyDown
  }));

  // 过滤并渲染列表项
  const filteredItems = values
    .map((item, index) => ({ ...item, index }))
    .filter(({ name }) => searchFilter(name, searchValue))
    .map(({ index, ...item }) => (
      <div 
        key={index} 
        className={cn(
          "px-3 py-2 cursor-pointer text-sm rounded-md transition-colors",
          select === index 
            ? "bg-blue-100 text-blue-900" 
            : "hover:bg-slate-100"
        )}
        onClick={(e) => handleClick(e, index)}
      >
        <span 
          title={item.name} 
          style={item.style || {}}
          className="block truncate"
        >
          {itemRender(item.name, item)}
        </span>
      </div>
    ));

  return (
    <Card 
      className="border shadow-sm"
      style={{ 
        marginLeft: offset, 
        maxWidth: maxWidth || 300
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
      
      <CardContent className="p-1">
        <ScrollArea className="h-full" style={{ maxHeight: maxHeight }}>
          <div className="space-y-1 py-1">
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
    </Card>
  );
});

export { SingleValueSelect };