let func = null;
function getEventFunc(){
  if(func) return func
  if(window.IntersectionObserver) {
    func = function(){
      let activeImages = []
      let timeout
      let observer = new IntersectionObserver(images => {
        activeImages.push(...images)
        if(timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          activeImages.filter(image => image.isIntersecting)
          .map(image => image.target)
          .forEach(image => {
            if(this.initImages(image)){
              observer.unobserve(image)
            }
          })
          activeImages = []
        }, this.wait)
      }, this.observerOption)
      this.images.forEach(image => observer.observe(image))
      return () => {
        this.images.forEach(image => observer.unobserve(image))
      }
    }
  }else{
    func = function(){
      let timeout = null
      let load = () => {
        if(timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          this.images.forEach(image => this.initImages(image))
        }, this.wait)
      }
      if(this.container !== window){
        window.addEventListener('scroll', load)
      }
      this.container.addEventListener('scroll', load)
      return () => {
        this.container.removeEventListener('scroll', load)
        window.removeEventListener('scroll', load)
      }
    }
  }
  return func
}
const util = {
  getAttribute(el, name){
    return el.getAttribute(name)
  },
  getVwVh(container){
    return {
      vw: container.innerWidth || window.innerWidth || document.documentElement.clientWidth,
      vh: container.innerHeight || window.innerHeight || document.documentElement.clientHeight
    }
  },
  querySelector(el = ''){
    return el ? document.querySelector(el) : document.body
  },
  querySelectorAll(el, search){
    return el && search ? el.querySelectorAll(search) : []
  }
}
const map = [
  ['src', 'getSrc'],
  ['data-src', 'getDataSrc'],
  ['data-background-image', 'getBackgroundSrc'],
].forEach(([key, val]) =>{
  util[val] = (el) => {
    return util.getAttribute(el, key)
  }
})

class LazyImage {
  constructor(options){
    options = options || {}
    const el = options.el || ''
    this.wait = options.wait || 500
    this.el = util.querySelector(el)
    this.diffTop = 0
    this.diffLeft = 0
    this.container = this.isScrollContainer ? this.el : window
    this.observerOption = options.observerOption || { thresholds: [1], root: this.isScrollContainer ? this.el : null}
    this.isScrollContainer = options.isScrollContainer || (!(this.el.scrollWidth <= this.el.clientWidth) || !(this.el.scrollHeight <= this.el.clientHeight))
    this.images = []
    this.initEvents = getEventFunc().bind(this)
    this.destroyEvent = () => {}
    this.update()
  }
  _init(){
    this.destroyEvent()
    this.queryImage()
    this.destroyEvent = this.initEvents()
  }
  update(){
    return this._init()
  }
  queryImage(){
    if(!this.el) return
    this.images = [...util.querySelectorAll(this.el, '[data-src]'), 
    ...util.querySelectorAll(this.el, '[data-background-image]')].filter(el => {
      return !!(!util.getSrc(el) && (util.getDataSrc(el) || util.getBackgroundSrc(el)))
    })
  }
  inViewport(el){
    const { vw, vh } = util.getVwVh(this.container)
    const { top, right, bottom, left } = el.getBoundingClientRect()
    return (top - vh < this.diffTop && bottom > this.diffTop) && (left - vw < this.diffLeft && right > this.diffLeft)
  }
  initImages(image) {
    if(!this.inViewport(image)) return null
    const src = util.getSrc(image)
    const dataSrc = util.getDataSrc(image)
    const dataBackground = util.getBackgroundSrc(image)
    if(src || (!dataSrc && !dataBackground)) return image
    if(dataSrc){
      image.setAttribute('src', dataSrc)
      image.addEventListener('load', () => {
        this.images = this.images.filter(img => img !== image)
        image.removeAttribute('data-src')
      })
    }
    if(dataBackground){
      const style = image.getAttribute('style')
      image.style = `background-image:url(${dataBackground});${style}`
      image.removeAttribute('data-background-image')
    }
    return image
  }
}

export default function(...arg){
  return new LazyImage(...arg)
}