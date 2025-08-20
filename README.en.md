[中文版](./README.md)

# Subtitle Timeline Adjuster

A lightweight, web-based tool to adjust the timeline of subtitle files (.srt, .ass), supporting both local files and browsing files directly from a server.

![Application Screenshot](./assets/应用截图.png)

---

This tool provides a simple, fast, and lightweight solution for shifting subtitle timestamps. It supports two modes: uploading local files, or browsing and streaming files from a pre-configured directory on the server.

## ✨ Features

- **Dual Mode**: Handle local files via upload/drag-drop or browse files on the server.
- **Server Mode**: Browse and stream media files directly from a directory on the server.
- **Real-time Adjustment**: Instantly preview subtitle timing changes.
- **Flexible Controls**: Quick-step buttons, manual input, and variable playback speed.
- **Token Authentication**: Server mode can be secured with a token.
- **Cross-Platform**: Runs on Windows, macOS, and Linux (requires Node.js).
- **Lightweight**: No `ffmpeg` dependency.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, PM2, Multer
- **Frontend**: Vanilla JavaScript (HTML5, CSS3)

## 🚀 Getting Started (Development)

1.  **Clone the repo** and `cd` into it.
2.  **Install dependencies**: `npm install`
3.  **Configure (Optional)**: To enable server file browsing, create and edit `config.json` as described in the Deployment section.
4.  **Run the server**: `node src/server.js`
5.  **Open the app**: Navigate to `http://localhost:3000` in your browser.

## 🚢 Deployment (Production)

Using PM2 for persistent deployment is recommended. The project is pre-configured with the necessary scripts.

1.  **Install & Configure**: Ensure you have cloned the repo, installed dependencies (`npm install`), and configured `config.json` if needed.

2.  **Start the Application**:
    ```bash
    npm start
    ```
    This command uses PM2 to start and daemonize the application. It will be automatically restarted on crash or server reboot.

3.  **Setup Startup Hook (One-time command)**:
    To enable PM2 to launch on boot, you need to run a one-time setup command:
    ```bash
    pm2 startup
    ```
    - This will generate another command. **You must copy and paste the command it gives you** to finalize the setup (it may require `sudo` on Linux/macOS).
    - Finally, run `pm2 save` to freeze the current process list for reboot.

4.  **Manage the Application**:
    - `npm stop`: Stop the application.
    - `npm run restart`: Restart the application.
    - `npm run logs`: View application logs.
    - `npm run monit`: Open the performance monitor.
    - `npm run delete`: Remove the app from PM2's management.

## 📝 Usage / Workflow

1.  **(Server Mode)** If you configured a token, enter it in the "Server Settings" section.
2.  **Add Files**: Click "Add File" and choose to upload from your computer or browse from the server.
3.  **Adjust & Save**: Select files from the list to load them, use the controls on the right to adjust, and click "Save Subtitle" when done.

## 📄 License

This project is licensed under the ISC License.
