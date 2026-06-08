import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    const userDataDir = app.getPath('userData')
    const dataDir = path.join(userDataDir, 'data')
    const uploadsDir = path.join(userDataDir, 'uploads')
    const appRoot = app.getAppPath()

    process.env.DATA_DIR = dataDir
    process.env.UPLOADS_DIR = uploadsDir
    process.env.ELECTRON_MODE = 'true'
    process.env.APP_ROOT = appRoot

    import('./server-entry.js')

    await new Promise<void>((resolve) => {
      const checkServer = setInterval(() => {
        const http = require('http')
        const req = http.get('http://127.0.0.1:6666/api/health', (res: any) => {
          res.resume()
          clearInterval(checkServer)
          resolve()
        })
        req.on('error', () => {
          req.destroy()
        })
        req.setTimeout(500, () => {
          req.destroy()
        })
      }, 300)
    })

    createWindow()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '时光簿',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
    show: false,
  })

  mainWindow.loadURL('http://localhost:6666')

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  process.exit(0)
})
