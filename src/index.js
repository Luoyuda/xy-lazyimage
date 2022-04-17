let func = null
function getEventFunc() {
  // 如果已经判断过，直接返回
  if (func) return func
  // 优先使用 IntersectionObserver
  if (window.IntersectionObserver) {
    func = function () {
      // 这里使用缓存数组，缓存激活元素
      let activeImages = []
      // 使用 setTimeout 做一个防抖
      let timeout
      // 监听
      const observer = new IntersectionObserver((images) => {
        activeImages.push(...images)
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          activeImages
            .filter((image) => image.isIntersecting)
            .map((image) => image.target)
            .forEach((image) => {
              if (this.initImages(image)) {
                // 完成图片加载后移除监听
                observer.unobserve(image)
              }
            })
          // 清空本次激活数组
          activeImages = []
        }, this.wait)
      }, this.observerOption)
      // 对每一项进行监听
      this.images.forEach((image) => observer.observe(image))
      // 返回一个销毁事件监听方法
      return () => {
        this.images.forEach((image) => observer.unobserve(image))
      }
    }
  } else {
    // 否则降级使用 scroll
    func = function () {
      // 这里也做一个防抖
      let timeout = null
      const load = () => {
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          this.images.forEach((image) => this.initImages(image))
        }, this.wait)
      }
      if (this.container !== window) {
        // fix 横向滚动时上下滚动无法触发更新问题
        window.addEventListener('scroll', load)
      }
      this.container.addEventListener('scroll', load)
      // 同样返回一个销毁函数
      return () => {
        this.container.removeEventListener('scroll', load)
        window.removeEventListener('scroll', load)
      }
    }
  }
  return func
}
const util = {
  // 获取容器宽高
  getVwVh(container) {
    return {
      vw:
        container.innerWidth ||
        window.innerWidth ||
        document.documentElement.clientWidth,
      vh:
        container.innerHeight ||
        window.innerHeight ||
        document.documentElement.clientHeight,
    }
  },
  // 获取元素
  querySelector(el = '') {
    return el ? document.querySelector(el) : document.body
  },
  // 获取元素属性值
  getAttribute(el, name) {
    return el.getAttribute(name)
  },
  // 获取全部元素
  querySelectorAll(el, search) {
    return el && search ? el.querySelectorAll(search) : []
  },
}
// 初始化工具函数
;[
  ['src', 'getSrc', util.getAttribute],
  ['data-src', 'getDataSrc', util.getAttribute],
  ['data-background-image', 'getBackgroundSrc', util.getAttribute],
  ['style', 'getStyle', util.getAttribute],
  ['[data-src]', 'queryAllSrc', util.querySelectorAll],
  ['[data-background-image]', 'queryAllImage', util.querySelectorAll],
].forEach(([key, val, fn]) => {
  util[val] = (el) => fn(el, key)
})

class Lazy {
  constructor(options) {
    options = options || {}
    // 从哪个元素下获取节点
    const el = options.el || ''
    this.el = util.querySelector(el)
    // 懒加载 N 秒后执行
    this.wait = options.wait || 500
    // 偏移量
    this.diffTop = 0
    this.diffLeft = 0
    // 容器，是否父容器为滚动元素，相对父容器还是window
    this.isScrollContainer =
      options.isScrollContainer ||
      !(this.el.scrollWidth <= this.el.clientWidth) ||
      !(this.el.scrollHeight <= this.el.clientHeight)
    this.container = this.isScrollContainer ? this.el : window
    // 合并 observerOption IntersectionObserver 使用的配置
    this.observerOption = options.observerOption || {
      thresholds: [1],
      root: this.isScrollContainer ? this.el : null,
    }
    // 待观察图片数组
    this.images = []
    // 初始化监听方式，使用单例模式
    this.initEvents = getEventFunc().bind(this)
    // 初始化销毁函数，避免报错，先使用空函数
    this.destroyEvent = () => {}
    // 更新插件
    this.update()
  }
  _init() {
    // 先销毁
    this.destroyEvent()
    // 获取元素
    this.queryImage()
    // 监听，并到下一次销毁的方法
    this.destroyEvent = this.initEvents()
  }
  update() {
    return this._init()
  }
  queryImage() {
    if (!this.el) return
    // 获取所有符合标准的元素
    this.images = [
      ...util.queryAllSrc(this.el),
      ...util.queryAllImage(this.el),
    ].filter((el) => {
      // 过滤漏网之鱼
      return !!(
        !util.getSrc(el) &&
        (util.getDataSrc(el) || util.getBackgroundSrc(el))
      )
    })
  }
  inViewport(el) {
    // 获取容器宽高
    const { vw, vh } = util.getVwVh(this.container)
    // 获取元素的位置
    const { top, right, bottom, left } = el.getBoundingClientRect()
    // 计算判断是否满足条件
    return (
      top - vh < this.diffTop &&
      bottom > this.diffTop &&
      left - vw < this.diffLeft &&
      right > this.diffLeft
    )
  }
  initImages(image) {
    // 如果不在视窗内，直接返回
    if (!this.inViewport(image)) return null
    // 获取内容
    const src = util.getSrc(image)
    const dataSrc = util.getDataSrc(image)
    const dataBackground = util.getBackgroundSrc(image)
    // 判断是否加载过
    if (src || (!dataSrc && !dataBackground)) return image
    // 存在src
    if (dataSrc) {
      // 修改src
      image.setAttribute('src', dataSrc)
      const load = () => {
        // 初始化结束后从数组中清除该节点
        this.images = this.images.filter((img) => img !== image)
        image.removeAttribute('data-src')
        // 删除事件监听
        image.removeEventListener('load', load)
      }
      image.addEventListener('load', load)
    }
    if (dataBackground) {
      // 获取原有的 style 进行拼接
      image.style = `${util.getStyle(
        image
      )}; background-image:url(${dataBackground});`
      this.images = this.images.filter((img) => img !== image)
      image.removeAttribute('data-background-image')
    }
    return image
  }
}
function LazyImage(...arg) {
  return new Lazy(...arg)
}

export default LazyImage
