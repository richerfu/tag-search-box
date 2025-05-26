import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import clone from "clone";
import { Tag, TagValue } from "./Tag";
import { TagInput } from "./TagInput";
import { withOutsideClickHook } from "./util";
import { TagSearchBoxContext } from "./TagSearchboxContext";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { X, Info, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttributeValue } from "./AttributeSelect";

export type { AttributeValue };

/**
 * 焦点所在位置类型
 */
export enum FocusPosType {
  INPUT = 0,
  INPUT_EDIT = 1,
  TAG = 2,
}

let COUNTER = 0;

interface TagSearchBoxProps {
  /**
   * 要选择过滤的资源属性的集合
   */
  attributes?: AttributeValue[];
  /**
   * 搜索框中默认包含的标签值的集合
   */
  defaultValue?: TagValue[];
  /**
   * 配合 onChange 作为受控组件使用
   */
  value?: TagValue[];
  /**
   * 当新增/修改/减少标签时调用此函数
   *
   * **💡 用于触发搜索**
   */
  onChange?: (tags: TagValue[]) => void;
  /**
   * 搜索框收起后宽度
   * @default 210
   */
  minWidth?: string | number;
  /**
   * 是否禁用
   * @default false
   * @since 2.4.1
   */
  disabled?: boolean;
  /**
   * 搜索框中提示语
   *
   * @default "多个关键字用竖线 "|" 分隔，多个过滤标签用回车键分隔" （已处理国际化）
   */
  tips?: string;
  /**
   * 资源属性选择下拉框提示
   *
   * @default "选择资源属性进行过滤" （已处理国际化）
   */
  attributesSelectTips?: string;
  /**
   * 隐藏帮助按钮
   *
   * @default false
   */
  hideHelp?: boolean;
  /**
   * 清空按钮点击回调
   *
   * @since 2.2.2
   */
  onClearButtonClick?: (e: React.MouseEvent) => void;
  /**
   * 帮助按钮点击回调
   *
   * 返回 `false` 阻止默认提示行为
   *
   * @since 2.2.2
   */
  onHelpButtonClick?: (e: React.MouseEvent) => void | false;
  /**
   * 搜索按钮点击回调
   *
   * @since 2.2.2
   */
  onSearchButtonClick?: (e: React.MouseEvent, value: TagValue[]) => void;
  /**
   * 禁用根据输入值过滤资源属性选项
   *
   * **新增或修改标签时将展示全部资源属性**
   *
   * @since 2.4.0
   * @default false
   */
  disableAttributesFilter?: boolean;
  /**
   * 删除单个标签的回调
   *
   * 返回 `false` 阻止删除
   *
   * @since 2.7.4
   */
  onDeleteTag?: (tag: TagValue) => Promise<boolean> | boolean;
}

// 使用高阶组件转换为带外部点击检测的组件
const ITagSearchBox = forwardRef<any, TagSearchBoxProps>((props, ref) => {
  const {
    attributes = [],
    hideHelp,
    tips = 'Separate keywords with "|"; press Enter to separate filter tags',
    attributesSelectTips = "Select a filter",
    disableAttributesFilter,
    disabled,
    defaultValue,
    value,
    onChange = () => {},
    onClearButtonClick = () => {},
    onHelpButtonClick = () => {},
    onSearchButtonClick = () => {},
    onDeleteTag,
    minWidth = 210,
  } = props;

  // 状态拆分为独立的useState钩子
  const [active, setActive] = useState(false);
  const [dialogActive, setDialogActive] = useState(false);
  const [curPos, setCurPos] = useState(0);
  const [curPosType, setCurPosType] = useState(FocusPosType.INPUT);
  const [showSelect, setShowSelect] = useState(true);
  const [tags, setTagsState] = useState(() =>
    defaultValue
      ? defaultValue.map((item) => {
          const newItem = clone(item);
          // @ts-ignore
          newItem["_key"] = COUNTER++;
          return newItem;
        })
      : []
  );
  const [lastValue, setLastValue] = useState(value);

  // 引用存储
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef<{ [key: string]: any }>({});

  // 状态更新函数，替代原来的setState
  const updateState = (updates: {
    active?: boolean;
    dialogActive?: boolean;
    curPos?: number;
    curPosType?: FocusPosType;
    showSelect?: boolean;
  }) => {
    if ("active" in updates) setActive(updates.active!);
    if ("dialogActive" in updates) setDialogActive(updates.dialogActive!);
    if ("curPos" in updates) setCurPos(updates.curPos!);
    if ("curPosType" in updates) setCurPosType(updates.curPosType!);
    if ("showSelect" in updates) setShowSelect(updates.showSelect!);
  };

  // 重置标签状态
  const resetTagsState = (props: TagSearchBoxProps, callback?: () => void) => {
    if ("value" in props) {
      const tagValue =
        props.value?.map((item) => {
          const newItem = clone(item);
          if (!("_key" in newItem)) {
            // @ts-ignore
            newItem["_key"] = COUNTER++;
          }
          return newItem;
        }) || [];

      setTagsState(clone(tagValue));
      if (callback) setTimeout(callback, 0);
    }
  };

  // 外部 value 变更时更新内部状态
  useEffect(() => {
    if (value !== lastValue) {
      const tagValue =
        value?.map((item) => {
          const newItem = clone(item);
          if (!("_key" in newItem)) {
            // @ts-ignore
            newItem["_key"] = COUNTER++;
          }
          return newItem;
        }) || [];

      setTagsState(clone(tagValue));
      setLastValue(value);
    }
  }, [value, lastValue]);

  // 打开搜索框
  const open = () => {
    if (disabled) {
      return;
    }

    if (!active) {
      updateState({
        active: true,
        curPosType: FocusPosType.INPUT,
        curPos: tags.length,
        showSelect: true,
      });
    } else {
      handleTagEvent("click-input", tags.length);
    }

    setTimeout(() => {
      tagRefs.current[`tag-${tags.length}`]?.moveToEnd();
    }, 100);
  };

  // 关闭搜索框
  const close = () => {
    // 编辑未完成的取消编辑
    const updatedTags = tags.map((item, index) => {
      const newItem = clone(item);
      // @ts-ignore
      if (newItem["_edit"]) {
        tagRefs.current[`tag-${index}`]?.editDone();
        // @ts-ignore
        newItem["_edit"] = false;
      }
      return newItem;
    });

    setTags(
      updatedTags,
      () => {
        setShowSelect(false);

        if (active) {
          setCurPos(-1);
          setActive(false);

          if (searchBoxRef.current) {
            searchBoxRef.current.scrollLeft = 0;
          }
        }
      },
      false
    );
  };

  // 获取标签值
  const getValue = (tags: any[]) => {
    const result: any[] = [];

    tags.forEach((item) => {
      const { values, attr = null } = item;
      if (values.length > 0) {
        result.push({
          attr,
          values,
          _key: item["_key"],
          _edit: item["_edit"],
        });
      }
    });

    return result;
  };

  // 通知变更
  const notify = (tags: any[]) => {
    onChange(getValue(tags));
  };

  // 设置标签状态
  const setTags = (
    newTags: any[],
    callback?: (() => void) | null,
    shouldNotify = true
  ) => {
    const cb = () => {
      shouldNotify && notifyChange(newTags);
      callback && callback();
    };

    // 受控模式
    if (shouldNotify && value) {
      resetTagsState(props, cb);
    } else {
      setTagsState(newTags);
      setTimeout(cb, 0);
    }
  };

  // 通知标签变更
  const notifyChange = (tags: any[]) => {
    notify(tags);
  };

  // 处理清除按钮点击
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClearButtonClick(e);

    const nextTags = tags.filter((i) => i.attr && i.attr.removeable === false);
    const index = `tag-${nextTags.length}`;

    if (tags.length <= 0) {
      tagRefs.current[index]?.setInputValue("");
      return;
    }

    setTags(nextTags, () => {
      return setTimeout(() => {
        tagRefs.current[index]?.setInputValue("");
        tagRefs.current[index]?.focusInput();
      }, 0);
    });

    setCurPos(0);
    setCurPosType(FocusPosType.INPUT);

    // 刷新下拉列表位置
    const input = tagRefs.current[`tag-${tags.length}`];
    if (input) {
      input?.scheduleUpdate?.();
    }
  };

  // 处理帮助按钮点击
  const handleHelp = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (onHelpButtonClick(e) === false) {
      return;
    }

    setDialogActive(true);
  };

  // 处理搜索按钮点击
  const handleSearch = (e: React.MouseEvent) => {
    if (!active) {
      // 如果监听了按钮点击，此时点击按钮不激活搜索框
      if ("onSearchButtonClick" in props) {
        e.stopPropagation();
        onSearchButtonClick(e, getValue(tags));
      }
      return;
    }

    e.stopPropagation();

    // 输入值生成标签操作会异步改变 tags
    // 此处保证 tags 状态变化完成后再进行回调
    setTimeout(() => {
      onSearchButtonClick(e, getValue(tags));
    }, 100);

    let flag = false;

    const input = tagRefs.current[`tag-${tags.length}`];
    if (input && input.addTagByInputValue) {
      if (input.addTagByInputValue()) {
        flag = true;
      }
    }

    for (let i = 0; i < tags.length; ++i) {
      const tagInput = tagRefs.current[`tag-${i}`];
      if (!tagInput || !tagInput.addTagByEditInputValue) return;

      // @ts-ignore
      if (tags[i]["_edit"] && tagInput.addTagByEditInputValue()) {
        flag = true;
      }
    }

    if (flag) return;

    notify(tags);
    input.focusInput();
  };

  // 处理标签事件
  const handleTagEvent = async (type: string, index: number, payload?: any) => {
    const newTags = clone(tags);

    switch (type) {
      case "add":
        payload["_key"] = COUNTER++;
        newTags.splice(++index, 0, payload);
        setTags(newTags, () => {
          tagRefs.current[`tag-${index}`]?.focusInput();
        });
        setShowSelect(false);
        break;

      case "edit":
        tagRefs.current[`tag-${index}`]?.editDone();
        newTags[index].attr = payload.attr;
        newTags[index].values = payload.values;
        // @ts-ignore
        newTags[index]["_edit"] = false;
        setTags(newTags);
        index++;
        setShowSelect(false);
        setCurPosType(FocusPosType.INPUT);
        break;

      case "edit-cancel":
        tagRefs.current[`tag-${index}`]?.editDone();
        setTags(newTags, () => null, false);
        setShowSelect(false);
        setCurPosType(FocusPosType.INPUT);
        break;

      case "editing":
        if ("attr" in payload && newTags[index])
          newTags[index].attr = payload.attr;
        if ("values" in payload && newTags[index])
          newTags[index].values = payload.values;
        setTags(newTags, null, false);
        break;

      case "del":
        if (payload === "keyboard") index--;
        if (!newTags[index]) break;

        const canDelteTag = await onDeleteTag?.(newTags[index]);
        if (onDeleteTag && !Boolean(canDelteTag)) break;

        const attr = newTags[index].attr;
        if (attr && attr?.removeable === false) {
          break;
        }

        newTags.splice(index, 1);
        setTags(newTags, () => {
          setCurPosType(FocusPosType.INPUT);
        });

        if (payload !== "edit") {
          setShowSelect(false);
        }
        break;

      case "click":
        if (!active) {
          open();
          return;
        }

        const pos = payload;
        // @ts-ignore
        newTags[index]["_edit"] = true;
        setTags(
          newTags,
          () => {
            setShowSelect(true);
            setTimeout(() => {
              tagRefs.current[`tag-${index}`]?.edit(pos);
            }, 0);
          },
          false
        );

        setCurPosType(FocusPosType.INPUT_EDIT);
        break;

      case "click-input":
        if (payload === "edit") {
          setCurPosType(FocusPosType.INPUT_EDIT);
        } else {
          setCurPosType(FocusPosType.INPUT);
        }

        if (!active) {
          setActive(true);
        }

        setShowSelect(true);
        break;
    }

    setCurPos(index);
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setDialogActive(false);
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    open,
    close,
    getValue: () => getValue(tags),
  }));

  // 用于计算 focused 及 isFocused, 判断是否显示选择组件
  let focusedInputIndex = -1;
  if (
    curPosType === FocusPosType.INPUT ||
    curPosType === FocusPosType.INPUT_EDIT
  ) {
    focusedInputIndex = curPos;
  }

  // 渲染标签列表
  const tagList = tags.map((item, index) => {
    // 补全 attr 属性
    attributes.forEach((attrItem) => {
      if (item.attr && attrItem.key && attrItem.key == item.attr.key) {
        item.attr = Object.assign({}, item.attr, attrItem);
      }
    });

    const selectedAttrKeys: string[] = [];
    tags.forEach((tag) => {
      if (
        tag.attr &&
        item.attr &&
        // @ts-ignore
        item["_edit"] &&
        item.attr.key === tag.attr.key
      ) {
        return null;
      }
      if (tag.attr && tag.attr.key && !tag.attr.reusable) {
        selectedAttrKeys.push(tag.attr.key);
      }
    });

    const useableAttributes = attributes.filter(
      (item) => selectedAttrKeys.indexOf(item.key) < 0
    );

    return (
      <Tag
        ref={(tag) => (tagRefs.current[`tag-${index}`] = tag)}
        active={active}
        // @ts-ignore
        key={item["_key"]}
        attributes={useableAttributes}
        attr={item.attr}
        values={item.values}
        maxWidth={
          searchWrapRef.current ? searchWrapRef.current.clientWidth : null
        }
        focused={focusedInputIndex === index && showSelect ? curPosType : null}
        dispatchTagEvent={(type, payload) =>
          handleTagEvent(type, index, payload)
        }
      />
    );
  });

  // 过滤可用属性
  const selectedAttrKeys = tags
    .map((item) => (item.attr && !item.attr.reusable ? item.attr.key : null))
    .filter((item) => !!item);

  const useableAttributes = attributes.filter(
    (item) => selectedAttrKeys.indexOf(item.key) < 0
  );

  // 添加输入标签
  tagList.push(
    <TagInput
      key="__input__"
      ref={(input) => (tagRefs.current[`tag-${tags.length}`] = input)}
      active={active}
      maxWidth={
        searchWrapRef.current ? searchWrapRef.current.clientWidth : null
      }
      attributes={useableAttributes}
      isFocused={focusedInputIndex === tags.length && showSelect}
      dispatchTagEvent={(type, payload) =>
        handleTagEvent(type, tags.length, payload)
      }
    />
  );

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex h-10 w-full items-center",
          "rounded-md border border-input",
          "bg-background text-sm shadow-sm",
          "ring-offset-background",
          "transition-colors duration-200",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !disabled && [
            "cursor-text",
            "hover:border-primary/50",
            active && "border-primary",
            active && "ring-2 ring-primary/20",
          ]
        )}
        onClick={open}
        ref={searchBoxRef}
      >
        <div className="flex items-center flex-1 px-3 py-1">
          <TagSearchBoxContext.Provider
            value={{
              attributesSelectTips,
              disableAttributesFilter,
              close,
            }}
          >
            <div className="flex items-center gap-1">
              {tagList}
              {tags.length === 0 && !active && (
                <div className="pointer-events-none text-muted-foreground/70 text-sm whitespace-nowrap">
                  {tips}
                </div>
              )}
            </div>
          </TagSearchBoxContext.Provider>
        </div>

        <div className="flex items-center border-l border-input h-full">
          {!!active && tags.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-muted rounded-none border-0"
                    onClick={handleClear}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Clear all tags
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {!!active && !hideHelp && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-muted rounded-none border-0"
                    onClick={handleHelp}
                  >
                    <Info className="h-4 w-4" />
                    <span className="sr-only">Help</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Show help
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 hover:bg-muted rounded-none rounded-r-md border-0",
                    active && "text-primary"
                  )}
                  disabled={disabled}
                  onClick={handleSearch}
                >
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Search</span>
                </Button>
              </TooltipTrigger>
              {active && (
                <TooltipContent side="bottom" className="text-xs">
                  Search
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Dialog open={dialogActive} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-base">Help</DialogTitle>
          </DialogHeader>
          {/* <TagSearchBoxHelp /> */}
        </DialogContent>
      </Dialog>
    </div>
  );
});

// 使用高阶组件添加外部点击检测
const EnhancedTagSearchBox = withOutsideClickHook(ITagSearchBox);

// 导出最终组件
export const TagSearchBox = React.forwardRef<any, TagSearchBoxProps>(
  (props, ref) => {
    return <EnhancedTagSearchBox {...props} ref={ref} />;
  }
);

TagSearchBox.displayName = "TagSearchBox";
