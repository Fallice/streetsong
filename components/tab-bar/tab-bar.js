// 底部导航栏组件 tab-bar.js
Component({
  properties: {
    current: {
      type: String,
      value: 'index'
    }
  },

  data: {
    selected: 0,
    color: '#666666',
    selectedColor: '#FF4D4F',
    backgroundColor: '#ffffff',
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconPath: '/images/home.png',
        selectedIconPath: '/images/home-active.png',
        iconType: 'home'
      },
      {
        pagePath: '/pages/playlists/playlists',
        text: '我的歌单',
        iconPath: '/images/playlist.png',
        selectedIconPath: '/images/playlist-active.png',
        iconType: 'playlist'
      },
      {
        pagePath: '/pages/create-playlist/create-playlist',
        text: '创建歌单',
        iconPath: '/images/add.png',
        selectedIconPath: '/images/add-active.png',
        iconType: 'add'
      }
    ]
  },

  lifetimes: {
    attached() {
      this.setSelectedIndex()
    }
  },

  observers: {
    'current'(val) {
      this.setSelectedIndex()
    }
  },

  methods: {
    setSelectedIndex() {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1].route
      const index = this.data.list.findIndex(item => item.pagePath === `/${currentPage}`)
      if (index !== -1) {
        this.setData({
          selected: index
        })
      }
    },

    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path

      if (url === `/${getCurrentPages()[0].route}`) {
        return
      }

      wx.switchTab({
        url
      })
    },

    // 渲染图标（使用文字图标作为占位）
    getIcon(type, selected) {
      const iconMap = {
        home: selected ? '🏠' : '🏠',
        playlist: selected ? '📜' : '📜',
        add: selected ? '➕' : '➕'
      }
      return iconMap[type] || '●'
    }
  }
})