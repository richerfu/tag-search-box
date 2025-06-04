import React from "react";
import onClickOutside from "react-onclickoutside";

/**
 * 高阶组件：添加点击外部区域的处理
 * @param methodName 组件实例上处理点击外部的方法名
 */
export function withOutsideClick(methodName: string) {
  // 为 SVGElement 添加 classList 支持
  if (
    typeof SVGElement !== "undefined" &&
    !("classList" in SVGElement.prototype)
  ) {
    Object.defineProperty(SVGElement.prototype, "classList", {
      get() {
        const self = this;
        return {
          contains(className: string) {
            return self.className.baseVal.split(" ").indexOf(className) !== -1;
          },
        };
      },
    });
  }

  return function (WrappedComponent: React.ComponentType<any>) {
    const Component = onClickOutside(WrappedComponent, {
      handleClickOutside: function (instance: any) {
        return instance[methodName];
      },
    });

    return function (props: any) {
      return React.createElement(Component, {
        ...props,
        outsideClickIgnoreClass: "ignore-outside-click",
      });
    };
  };
}

// 为了保持向后兼容，导出 withOutsideClickHook 作为 withOutsideClick 的别名
export const withOutsideClickHook = withOutsideClick;
