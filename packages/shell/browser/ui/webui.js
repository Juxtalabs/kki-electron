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
      createTabButton: $('#createtab'),
      goBackButton: $('#goback'),
      goForwardButton: $('#goforward'),
      reloadButton: $('#reload'),
      appButtonsContainer: $('#app-buttons'),

      browserActions: $('#actions'),

      minimizeButton: $('#minimize'),
      maximizeButton: $('#maximize'),
      closeButton: $('#close'),
    }

    this.$.createTabButton.addEventListener('click', () => chrome.tabs.create())
    this.$.goBackButton.addEventListener('click', () => chrome.tabs.goBack())
    this.$.goForwardButton.addEventListener('click', () => chrome.tabs.goForward())
    this.$.reloadButton.addEventListener('click', () => chrome.tabs.reload())

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

    const platformClass = `platform-${navigator.userAgentData.platform.toLowerCase()}`
    document.body.classList.add(platformClass)

    this.initTabs()
    this.initAppButtons()
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
    tabElem.querySelector('.close').addEventListener('click', () => {
      chrome.tabs.remove(tab.id)
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
    // this.$.browserActions.tab = tab.id
  }

  async initAppButtons() {
    try {
      const enabledApps = await window.sejati.getEnabledApps()
      this.renderAppButtons(enabledApps)
    } catch (error) {
      console.error('Failed to load app buttons:', error)
    }
  }

  renderAppButtons(apps) {
    // Clear existing buttons
    this.$.appButtonsContainer.innerHTML = ''

    apps.forEach(app => {
      const button = this.createAppButton(app)
      this.$.appButtonsContainer.appendChild(button)
    })
  }

  createAppButton(appConfig) {
    const button = document.createElement('button')
    button.className = 'app-button'
    button.textContent = appConfig.name
    button.dataset.appId = appConfig.id

    // Apply custom styling from config
    if (appConfig.style) {
      button.style.backgroundColor = appConfig.style.backgroundColor
      button.style.color = appConfig.style.textColor

      // Add hover effects
      button.addEventListener('mouseenter', () => {
        if (!button.disabled && appConfig.style.hoverColor) {
          button.style.backgroundColor = appConfig.style.hoverColor
        }
      })

      button.addEventListener('mouseleave', () => {
        if (!button.disabled) {
          button.style.backgroundColor = appConfig.style.backgroundColor
        }
      })

      button.addEventListener('mousedown', () => {
        if (!button.disabled && appConfig.style.activeColor) {
          button.style.backgroundColor = appConfig.style.activeColor
        }
      })

      button.addEventListener('mouseup', () => {
        if (!button.disabled && appConfig.style.hoverColor) {
          button.style.backgroundColor = appConfig.style.hoverColor
        }
      })
    }

    // Add click handler
    button.addEventListener('click', () => this.handleAppClick(appConfig.id, button))

    return button
  }

  async handleAppClick(appId, buttonElement) {
    try {
      // Disable button to prevent multiple clicks
      buttonElement.disabled = true
      const originalText = buttonElement.textContent
      buttonElement.textContent = 'Loading...'
      
      // Call the main process to handle app launch
      const result = await window.sejati.launchApp(appId)
      
      // Show result to user
      if (result.success) {
        console.log('App action successful:', result.message)
        // Show success indicator
        buttonElement.textContent = result.action === 'launched' ? 'Launched!' : 'Installer Opened'
        setTimeout(() => {
          buttonElement.textContent = originalText
        }, 2000)
      } else {
        console.error('App action failed:', result.message)
        // Show error indicator
        buttonElement.textContent = 'Error'
        setTimeout(() => {
          buttonElement.textContent = originalText
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to launch app:', error)
      buttonElement.textContent = 'Error'
      setTimeout(() => {
        buttonElement.textContent = originalText
      }, 2000)
    } finally {
      // Re-enable button
      buttonElement.disabled = false
    }
  }

  // Legacy Discord support (for backward compatibility)
  async handleDiscordClick() {
    try {
      const result = await window.sejati.launchDiscord()
      console.log('Discord action result:', result)
      return result
    } catch (error) {
      console.error('Failed to launch Discord:', error)
      return { success: false, action: 'error', message: error.message }
    }
  }
}

window.webui = new WebUI()
