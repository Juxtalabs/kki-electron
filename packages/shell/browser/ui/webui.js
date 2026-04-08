class WebUI {
  windowId = -1
  activeTabId = -1
  /** @type {chrome.tabs.Tab[]} */
  tabList = []

  constructor() {
    const $ = document.querySelector.bind(document)

    this.$ = {
      tabList: $('#tabstrip .tab-list'),
      tabTemplate: $('#tabtemplate'),
      goBackButton: $('#goback'),
      goForwardButton: $('#goforward'),
      reloadButton: $('#reload'),
      urlBar: $('#urlbar'),
      browserActions: $('#actions'),

      exitButton: $('#exit'),
      networkStatus: $('#network-status'),

      minimizeButton: $('#minimize'),
      maximizeButton: $('#maximize'),
      closeButton: $('#close'),
    }

    // Disable native context menu in the WebUI (tab/toolbar area)
    window.addEventListener('contextmenu', (event) => {
      event.preventDefault()
    })

    this.$.goBackButton.addEventListener('click', () => chrome.tabs.goBack())
    this.$.goForwardButton.addEventListener('click', () => chrome.tabs.goForward())
    this.$.reloadButton.addEventListener('click', () => chrome.tabs.reload())

    // this.$.urlBar.addEventListener('keydown', (event) => {
    //   if (event.key === 'Enter') {
    //     this.handleUrlEnter()
    //   }
    // })

    // this.$.urlBar.addEventListener('focus', () => {
    //   // Select all text for quick editing
    //   this.$.urlBar.select()
    // })

    this.$.minimizeButton.addEventListener('click', () =>
      chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, (win) => {
        chrome.windows.update(win.id, { state: win.state === 'minimized' ? 'normal' : 'minimized' })
      }),
    )
    this.$.maximizeButton.addEventListener('click', () =>
      chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, (win) => {
        chrome.windows.update(win.id, { state: win.state === 'maximized' ? 'normal' : 'maximized' })
      }),
    )
    this.$.closeButton.addEventListener('click', () => chrome.windows.remove())

    this.$.exitButton.addEventListener('click', () => this.handleExitClick())

    const platformClass = `platform-${navigator.userAgentData.platform.toLowerCase()}`
    document.body.classList.add(platformClass)

    this.initTabs()
    this.setupNetworkMonitoring()
  }

  async initTabs() {
    const tabs = await new Promise((resolve) => chrome.tabs.query({ windowId: -2 }, resolve))
    this.tabList = [...tabs]
    this.renderTabs()

    const activeTab = this.tabList.find((tab) => tab.active)
    if (activeTab) {
      this.setActiveTab(activeTab)
    }

    // Wait to setup tabs and windowId prior to listening for updates.
    this.setupBrowserListeners()
  }

  setupBrowserListeners() {
    if (!chrome.tabs.onCreated) {
      throw new Error(`chrome global not setup. Did the extension preload not get run?`)
    }

    const findTab = (tabId) => {
      const existingTab = this.tabList.find((tab) => tab.id === tabId)
      return existingTab
    }

    const findOrCreateTab = (tabId) => {
      const existingTab = findTab(tabId)
      if (existingTab) return existingTab

      const newTab = { id: tabId }
      this.tabList.push(newTab)
      return newTab
    }

    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.windowId !== this.windowId) return
      const newTab = findOrCreateTab(tab.id)
      Object.assign(newTab, tab)
      this.renderTabs()
    })

    chrome.tabs.onActivated.addListener((activeInfo) => {
      if (activeInfo.windowId !== this.windowId) return

      this.setActiveTab(activeInfo)
    })

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, details) => {
      const tab = findTab(tabId)
      if (!tab) return
      Object.assign(tab, details)
      this.renderTabs()
      if (tabId === this.activeTabId) this.renderToolbar(tab)
    })

    chrome.tabs.onRemoved.addListener((tabId) => {
      const tabIndex = this.tabList.findIndex((tab) => tab.id === tabId)
      if (tabIndex > -1) {
        this.tabList.splice(tabIndex, 1)
        this.$.tabList.querySelector(`[data-tab-id="${tabId}"]`).remove()
      }
    })
  }

  setActiveTab(activeTab) {
    this.activeTabId = activeTab.id || activeTab.tabId
    this.windowId = activeTab.windowId

    for (const tab of this.tabList) {
      if (tab.id === this.activeTabId) {
        tab.active = true
        this.renderTab(tab)
        this.renderToolbar(tab)
      } else {
        if (tab.active) {
          tab.active = false
          this.renderTab(tab)
        }
      }
    }
  }


  createTabNode(tab) {
    const tabElem = this.$.tabTemplate.content.cloneNode(true).firstElementChild
    tabElem.dataset.tabId = tab.id

    tabElem.addEventListener('click', () => {
      chrome.tabs.update(tab.id, { active: true })
    })
    const faviconElem = tabElem.querySelector('.favicon')
    faviconElem?.addEventListener('load', () => {
      faviconElem.classList.toggle('loaded', true)
    })
    faviconElem?.addEventListener('error', () => {
      faviconElem.classList.toggle('loaded', false)
    })

    this.$.tabList.appendChild(tabElem)
    return tabElem
  }

  renderTab(tab) {
    let tabElem = this.$.tabList.querySelector(`[data-tab-id="${tab.id}"]`)
    if (!tabElem) tabElem = this.createTabNode(tab)

    if (tab.active) {
      tabElem.dataset.active = ''
    } else {
      delete tabElem.dataset.active
    }

    const favicon = tabElem.querySelector('.favicon')
    if (tab.favIconUrl) {
      favicon.src = tab.favIconUrl
    } else {
      delete favicon.src
    }

    tabElem.querySelector('.title').textContent = tab.title
    tabElem.querySelector('.audio').disabled = !tab.audible
  }

  renderTabs() {
    this.tabList.forEach((tab) => {
      this.renderTab(tab)
    })
  }

  renderToolbar(tab) {
    if (!tab) {
      if (this.$.urlBar) {
        this.$.urlBar.value = ''
      }
      return
    }

    if (this.$.urlBar) {
      this.$.urlBar.value = tab.url || ''
    }
  }

  handleUrlEnter() {
    if (!this.$.urlBar || !this.activeTabId) return

    let url = this.$.urlBar.value.trim()
    if (!url) return

    // If user types something without scheme, assume https
    if (!/^https?:\/\//i.test(url) && !/^file:\/\//i.test(url)) {
      url = 'https://' + url
    }

    chrome.tabs.update(this.activeTabId, { url })
  }

  setupNetworkMonitoring() {
    // Update network status immediately
    this.updateNetworkStatus()

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.updateNetworkStatus()
      this.showNetworkNotification('online')
    })

    window.addEventListener('offline', () => {
      this.updateNetworkStatus()
      this.showNetworkNotification('offline')
    })

    // Check network status periodically (every 10 seconds)
    setInterval(() => {
      this.updateNetworkStatus()
    }, 10000)
  }

  updateNetworkStatus() {
    const isOnline = navigator.onLine
    
    if (this.$.networkStatus) {
      if (isOnline) {
        this.$.networkStatus.classList.remove('offline')
        this.$.networkStatus.classList.add('online')
        this.$.networkStatus.title = 'Internet Connected'
      } else {
        this.$.networkStatus.classList.remove('online')
        this.$.networkStatus.classList.add('offline')
        this.$.networkStatus.title = 'No Internet Connection'
      }
    }
  }

  showNetworkNotification(status) {
    const isOnline = status === 'online'
    const message = isOnline 
      ? 'Internet connection restored' 
      : 'Internet connection lost'
    const icon = isOnline ? '✓' : '⚠'
    const bgColor = isOnline ? '#52c41a' : '#ff4d4f'

    // Get notification container
    const container = document.getElementById('notification-container')
    if (!container) return

    // Create notification element
    const notification = document.createElement('div')
    notification.style.cssText = `
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
      margin-bottom: 10px;
    `
    
    notification.innerHTML = `
      <span style="font-size: 18px;">${icon}</span>
      <span>${message}</span>
    `

    container.appendChild(notification)

    // Remove notification after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 5000)
  }

  handleExitClick() {
    // Trigger exit password prompt via IPC
    // This does NOT kill the app, only shows the password overlay
    // App will only exit if password is correct
    if (window.kioskAPI && window.kioskAPI.promptExit) {
      window.kioskAPI.promptExit()
    } else {
      console.error('kioskAPI not available - cannot trigger exit prompt')
    }
  }
}

window.webui = new WebUI()
