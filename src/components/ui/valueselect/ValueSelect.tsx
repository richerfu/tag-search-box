import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { PureInput } from "./PureInput";
import { SingleValueSelect } from "./SingleValueSelect";
import { MultipleValueSelect } from "./MultipleValueSelect";
import { AttributeValue } from "../AttributeSelect";
import { Value } from "../AttributeSelect";
import { DropdownMenu } from "../dropdown";
import { Loading } from "./Loading";
import { Empty } from "./Empty";

interface ValueSelectProps {
  /**
   * 值选择组件类型，用于选择不同组件
   */
  type: AttributeValue["type"];
  /**
   * 值选择组件可选值的集合
   */
  values?: AttributeValue["values"];
  /**
   * 当前输入值
   */
  inputValue?: string;
  /**
   * 自定义渲染
   */
  render?: AttributeValue["render"];
  onChange?: (value: Value[]) => void;
  onSelect?: (value: Value[]) => void;
  onCancel?: () => void;
  offset: number;
  maxHeight: number;
}

interface ValueSelectRef {
  handleKeyDown: (keyCode: string | number) => boolean | void;
  handleKeyDownForRenderMode: (operationalKey: string) => boolean;
}

const ValueSelect = forwardRef<ValueSelectRef, ValueSelectProps>(
  (props, ref) => {
    const {
      type,
      values: propsValues,
      inputValue,
      onChange,
      onSelect,
      onCancel,
      offset = 0,
      maxHeight,
      render,
    } = props;

    const [values, setValues] = useState<any[]>(
      Array.isArray(propsValues) ? propsValues : []
    );
    const selectRef = useRef<any>(null);
    const operationalKeyDownListenerRef = useRef<(key: string) => void>(
      () => {}
    );

    // 组件挂载状态追踪
    const mountedRef = useRef<boolean>(false);

    useEffect(() => {
      mountedRef.current = true;

      // 处理函数型values
      if (typeof propsValues === "function") {
        const result = propsValues();

        // Promise处理
        if (result && "then" in result) {
          result.then((fetchedValues) => {
            if (mountedRef.current) {
              setValues(fetchedValues);
            }
          });
        } else {
          if (mountedRef.current) {
            setValues(result);
          }
        }
      }

      return () => {
        mountedRef.current = false;
      };
    }, [propsValues]);

    // 处理键盘事件
    const handleKeyDown = (keyCode: string | number) => {
      if (selectRef.current && selectRef.current.handleKeyDown) {
        return selectRef.current.handleKeyDown(keyCode);
      }
      return true;
    };

    // 处理渲染模式的键盘事件
    const handleKeyDownForRenderMode = (operationalKey: string) => {
      if (render) {
        operationalKeyDownListenerRef.current(operationalKey);
      }
      return true;
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      handleKeyDown,
      handleKeyDownForRenderMode,
    }));

    // 如果提供了自定义渲染函数
    if (render) {
      return (
        <DropdownMenu>
          {render({
            onOperationalKeyDown: (listener) => {
              operationalKeyDownListenerRef.current = listener as any;
            },
            inputValue: inputValue!,
            onSelect: onSelect!,
            onCancel: onCancel!,
          })}
        </DropdownMenu>
      );
    }

    // 处理组件类型
    let typeOptions: [string, any];

    if (Array.isArray(type)) {
      typeOptions = type;
    } else {
      typeOptions = [type, {}];
    }

    const commonProps = {
      values,
      inputValue,
      onChange,
      onSelect,
      onCancel,
      offset,
      maxHeight,
    };

    // 根据不同类型渲染不同组件
    switch (typeOptions[0]) {
      case "input":
        // @ts-ignore
        return <PureInput ref={selectRef} {...commonProps} />;

      case "single":
        const singleOptions = typeOptions[1];

        if (!Array.isArray(values)) {
          return <Loading offset={offset} />;
        }

        if (!values.length) {
          return (
            <Empty {...singleOptions} offset={offset} onCancel={onCancel} />
          );
        }

        return (
          <SingleValueSelect
            {...commonProps}
            {...singleOptions}
            ref={selectRef}
          />
        );

      case "multiple":
        const multipleOptions = typeOptions[1];

        if (!Array.isArray(values)) {
          return <Loading offset={offset} />;
        }

        if (!values.length) {
          return (
            <Empty {...multipleOptions} offset={offset} onCancel={onCancel} />
          );
        }

        return (
          <MultipleValueSelect
            {...commonProps}
            {...multipleOptions}
            ref={selectRef}
          />
        );

      default:
        return null;
    }
  }
);

export { ValueSelect };
