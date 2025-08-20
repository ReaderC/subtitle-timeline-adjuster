[中文版](./README.md)

# Subtitle Timeline Adjuster

A lightweight, web-based tool to adjust the timeline of subtitle files (.srt, .ass) with real-time preview.

![Application Screenshot](./assets/应用截图.png)

---

This tool was built to provide a simple, fast, and lightweight solution for shifting subtitle timestamps without relying on heavy video editing software. It uses a pure JavaScript backend, making it cross-platform and easy to run.

## ✨ Features

- **Real-time Adjustment**: Instantly preview subtitle timing changes in the browser.
- **Multi-file Support**: Upload and manage multiple video and subtitle files.
- **Flexible Controls**:
  - **Quick-step buttons** for fine-tuning (+/- 50ms).
  - **Manual input** for large adjustments.
  - **Variable playback speed** for precise synchronization.
- **Cross-Platform**: Runs on Windows, macOS, and Linux (requires Node.js).
- **Lightweight**: No `ffmpeg` dependency. All processing is done in JavaScript.
- **Automatic Cleanup**: Uploaded files are automatically deleted on server shutdown.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Multer
- **Frontend**: Vanilla JavaScript (HTML5, CSS3)
- **Subtitle Parsing**: `srt-parser-2`, `ass-parser`, `ass-stringify`

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

You must have [Node.js](https://nodejs.org/) (which includes npm) installed on your system.

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/subtitle-timeline-adjuster.git
    cd subtitle-timeline-adjuster
    ```

2.  **Install dependencies:**
    Run `npm install` to download all the required libraries from `package.json`.
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

1.  **Upload Files**: Drag and drop video and subtitle files into their respective upload areas on the left.
2.  **Select Files**: Click on a video and a subtitle from the lists to activate them. The status bar will show your current selection.
3.  **Load Preview**: Click the **"加载/重置预览"** (Load/Reset Preview) button. The video will load in the player, and the subtitles will be parsed for preview.
4.  **Adjust Timing**:
    -   Use the **快捷微调** (Quick-step) buttons (`« -50ms` / `+50ms »`) for small, instant adjustments.
    -   Use the **手动调整** (Manual Adjustment) input for larger shifts, then click **"应用手动调整"** (Apply Manual Adjustment).
    -   Change the **播放速度** (Playback Speed) to slow down the video for more precise alignment.
5.  **Save Subtitle**: Once you are satisfied with the timing, click the **"保存字幕"** (Save Subtitle) button. A download link for the newly adjusted subtitle file will appear in the status area.

## 📄 License

This project is licensed under the ISC License. See the `package.json` file for details.
