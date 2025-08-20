[中文版](./README.md)

# Subtitle Timeline Adjuster

A lightweight, web-based tool to adjust the timeline of subtitle files (.srt, .ass), supporting both local files and browsing files directly from a server/NAS.

![Application Screenshot](./assets/应用截图.png)

---

This tool provides a simple, fast, and lightweight solution for shifting subtitle timestamps. It supports two modes: uploading local files, or browsing and streaming files from a pre-configured directory on the server, making it ideal for use on a home NAS.

## ✨ Features

- **Dual Mode**: 
  - **Local Mode**: Upload files directly from your computer via drag-and-drop or a file picker.
  - **NAS Mode**: Browse and stream media files directly from a directory on the server.
- **Real-time Adjustment**: Instantly preview subtitle timing changes in the browser.
- **Flexible Controls**:
  - **Quick-step buttons** for fine-tuning (+/- 50ms).
  - **Manual input** for large adjustments.
  - **Variable playback speed** for precise synchronization.
- **Token Authentication**: File access in NAS mode can be secured with a token.
- **Cross-Platform**: Runs on Windows, macOS, and Linux (requires Node.js).
- **Lightweight**: No `ffmpeg` dependency. All processing is done in JavaScript.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Multer
- **Frontend**: Vanilla JavaScript (HTML5, CSS3)
- **Subtitle Parsing**: `srt-parser-2`, `ass-parser`, `ass-stringify`

## 🚀 Getting Started

### 1. Configuration (Important)

The project supports two modes, controlled by a configuration file.

- **Local-Only Mode (Default)**: 
  - No configuration is needed. Proceed to the installation step. The "Browse from NAS" feature will be disabled.

- **Enabling NAS Mode**:
  1.  Copy the `config.example.json` file in the project root to a new file named `config.json`.
  2.  Open `config.json` with a text editor and modify its contents:
      ```json
      {
        "mediaDirectory": "/path/to/your/media/folder",
        "nasToken": "a-very-secret-token"
      }
      ```
      - `mediaDirectory`: **Required**. The absolute path to your media library on the server. Use forward slashes `/` or escaped backslashes `\` for the path.
      - `nasToken`: **Optional**. A secret token. If set, the frontend must provide this token to access files in NAS mode.

> **Advanced Usage**: You can also configure the application by setting the `MEDIA_DIR` and `NAS_TOKEN` environment variables, which will override the `config.json` file.

### 2. Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ReaderC/subtitle-timeline-adjuster.git
    cd subtitle-timeline-adjuster
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the server:**
    ```bash
    node src/server.js
    ```

4.  **Open the application:**
    Open your web browser and navigate to `http://localhost:3000`.

## 📝 Usage / Workflow

1.  **(NAS Mode)** If you have configured a token, enter it in the "NAS Settings" section on the top left.
2.  **Add Files**: Click the "Add Video" or "Add Subtitle" button. A modal will appear, allowing you to choose:
    - **Upload from Computer**: Opens the system file picker.
    - **Browse from NAS**: Opens the server file browser.
    - You can also **drag and drop local files** directly onto the Video or Subtitle list areas.
3.  **Select Files**: Click on a video and a subtitle from the lists to activate them. The `(LOCAL)` or `(NAS)` tag indicates the file source.
4.  **Load Preview**: Click the **"Load/Reset Preview"** button to load the selected files into the player.
5.  **Adjust & Save**: Use the controls on the right to adjust timing in real-time. When satisfied, click **"Save Subtitle"** to download the adjusted file.

## 📄 License

This project is licensed under the ISC License.