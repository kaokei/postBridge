# 官网

- [documentation](https://github.com/kaokei/postBridge)

## 简介

灵感来自 angular 中的服务的概念。在 angular 中不需要全局唯一的数据源 store。而是通过声明服务，以及向组件中注入服务来达到数据管理以及数据共享的。

本库也是实现了类似的效果，可以通过依赖注入实现面向服务编程、实现领域驱动开发。从而可以代替 vuex。

本库通过类来声明服务，对 typescript 支持非常棒。

## 常用命令

- 运行 demo 网站 `npm run dev`
- 运行单元测试 `npm run unit`
- 发布新版本 `npm run release patch`
- 发布 npm 包 `npm publish`

## 项目技术特点

- 自带单元测试
- 自带示例 demo 网站
- 使用 typescript
- 使用 editconfig 配置通用编辑器规范
- 使用 eslint 配合编辑器作语法检查
- 使用 eslint 配合 prettier 来格式化代码
- 使用 eslint 配合 husky 以及 lint-stage 自动格式化提交的代码，保证 git 仓库代码的规范性
- 使用 rollup 打包源码

## bug 记录

1. vue-class-component 和 vue-test-utils 似乎配合有点问题

观察到的现象是 vue-class-component 定义的组件中，template 中访问到的变量似乎在组件创建之前就访问了，此时访问到的数据还没有定义
