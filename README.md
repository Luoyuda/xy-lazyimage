# 懒加载插件 LazyImage

自动获取`data-src || data-background-src`属性的元素进行懒加载

## 下载

`npm i xy-lazyimage`

## 使用

UMD `<script src="../xy-lazyimage.min.js"></script>`

ESM `import LazyImage from 'xy-lazyimage'`


```js
const lazy = LazyImage()
```

### options

* `el(string)`: querySelector，不传默认为body
* `wait(number)`: 延迟毫秒数，默认为500毫秒
* `observerOption`: 自定义`IntersectionObserver` 选项

### 方法

* `update`: 重新获取`data-src || data-background-src`属性的元素
* `destroyEvent`: 清除当前实例的监听方法


## 原理

优先使用 `IntersectionObserver` 不支持降级使用 `onScroll`