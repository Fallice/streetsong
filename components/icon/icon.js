// components/icon/icon.js
Component({
  properties: {
    name: {
      type: String,
      value: ''
    },
    size: {
      type: String,
      value: '40rpx'
    },
    color: {
      type: String,
      value: ''
    }
  },

  data: {
    iconMap: {
      'music': '/images/icon-music.svg',
      'note': '/images/icon-note.svg',
      'mic': '/images/icon-mic.svg',
      'qr': '/images/icon-qr.svg',
      'plus': '/images/icon-plus.svg',
      'save': '/images/icon-save.svg',
      'share': '/images/icon-share.svg',
      'list': '/images/icon-list.svg',
      'arrow-right': '/images/icon-arrow-right.svg',
      'edit': '/images/icon-edit.svg',
      'delete': '/images/icon-delete.svg',
      'heart': '/images/icon-heart.svg',
      'heart-outline': '/images/icon-heart-outline.svg',
      'stop': '/images/icon-stop.svg',
      'pause': '/images/icon-pause.svg',
      'check': '/images/icon-check.svg',
      'message': '/images/icon-message.svg',
      'theater': '/images/icon-theater.svg',
      'arrow-up': '/images/icon-arrow-up.svg',
      'arrow-down': '/images/icon-arrow-down.svg',
      'arrow-top': '/images/icon-arrow-top.svg',
      'arrow-bottom': '/images/icon-arrow-bottom.svg',
      'sort': '/images/icon-sort.svg',
      'more': '/images/icon-more.svg',
      'close': '/images/icon-close.svg'
    }
  },

  lifetimes: {
    attached() {
      const iconPath = this.data.iconMap[this.data.name] || ''
      this.setData({ iconPath })
    }
  },

  observers: {
    'name': function(name) {
      const iconPath = this.data.iconMap[name] || ''
      this.setData({ iconPath })
    }
  }
})
