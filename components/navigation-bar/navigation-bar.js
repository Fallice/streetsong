Component({
  options: {
    multipleSlots: true // 在组件定义时的选项中启用多slot支持
  },
  /**
   * 组件的属性列表
   */
  properties: {
    extClass: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: ''
    },
    color: {
      type: String,
      value: ''
    },
    back: {
      type: Boolean,
      value: true
    },
    loading: {
      type: Boolean,
      value: false
    },
    homeButton: {
      type: Boolean,
      value: false,
    },
    animated: {
      // 显示隐藏的时候opacity动画效果
      type: Boolean,
      value: true
    },
    show: {
      // 显示隐藏导航，隐藏的时候navigation-bar的高度占位还在
      type: Boolean,
      value: true,
      observer: '_showChange'
    },
    // back为true的时候，返回的页面深度
    delta: {
      type: Number,
      value: 1
    },
  },
  /**
   * 组件的初始数据
   */
  data: {
    displayStyle: ''
  },
  lifetimes: {
    attached() {
      try {
        // 获取系统信息
        const systemInfo = wx.getSystemInfoSync()
        const rect = wx.getMenuButtonBoundingClientRect()
        const platform = systemInfo.platform
        const isAndroid = platform === 'android'
        const isDevtools = platform === 'devtools'
        const windowWidth = systemInfo.windowWidth
        const safeAreaTop = systemInfo.safeArea.top || 0

        this.setData({
          ios: !isAndroid,
          innerPaddingRight: `padding-right: ${windowWidth - rect.left}px`,
          leftWidth: `width: ${windowWidth - rect.left}px`,
          safeAreaTop: `height: calc(var(--height) + ${safeAreaTop}px); padding-top: ${safeAreaTop}px`
        })
      } catch (error) {
        console.error('获取导航栏信息失败:', error)
        // 设置默认值，避免UI崩溃
        this.setData({
          ios: false,
          innerPaddingRight: 'padding-right: 20px',
          leftWidth: 'width: 20px',
          safeAreaTop: 'height: calc(var(--height) + 20px); padding-top: 20px'
        })
      }
    },
  },
  /**
   * 组件的方法列表
   */
  methods: {
    _showChange(show) {
      const animated = this.data.animated
      let displayStyle = ''
      if (animated) {
        displayStyle = `opacity: ${show ? '1' : '0'
          };transition:opacity 0.5s;`
      } else {
        displayStyle = `display: ${show ? '' : 'none'}`
      }
      this.setData({
        displayStyle
      })
    },
    back() {
      console.log('返回按钮点击事件触发')
      const data = this.data
      if (data.delta) {
        wx.navigateBack({
          delta: data.delta,
          success: () => {
            console.log('返回上一页成功')
          },
          fail: (err) => {
            console.error('返回上一页失败:', err)
            // 如果没有上一页，则跳转到首页
            wx.switchTab({
              url: '/pages/index/index'
            })
          }
        })
      }
      this.triggerEvent('back', { delta: data.delta }, {})
    }
  },
})
