# Batch Video Compression Scripts

This repository contains two PowerShell scripts designed to recursively scan your directories, find large video files, and compress them into highly efficient H.265 (HEVC) formats. 

Choose the script that best matches your system hardware and compression goals:
1. **`batch_compress.ps1` (GPU Accelerated)**: Best for raw speed and keeping CPU usage at 0%.
2. **`batch_compress_cpu.ps1` (CPU Optimized)**: Best for achieving the absolute smallest file sizes and maximum storage savings using high-quality CRF encoding.

---

## 🚀 Key Features Comparison

| Feature | `batch_compress.ps1` (GPU) | `batch_compress_cpu.ps1` (CPU) |
| :--- | :--- | :--- |
| **Engine** | NVIDIA NVENC (`hevc_nvenc`) | Software x265 (`libx265`) |
| **Hardware Reqs** | NVIDIA Graphics Card | Modern Multi-core CPU |
| **Encoding Speed** | **Extremely Fast** (Hardware matrix blocks) | **Slower** (Deep software calculations) |
| **Compression Efficiency** | Great size reduction | **Max Space Savings** (20%-40% smaller than GPU) |
| **Encoding Mode** | Adaptive Target Bitrate | Constant Rate Factor (CRF) Quality Engine |
| **Resolution Downscale** | Hardware-native (`scale_cuda`) | Software-native (`scale`) |

### Shared Intelligent Logic:
* **Anti-Bloat Bitrate Clamping**: Both scripts evaluate the original file's true bitrate via `ffprobe`. If your target settings calculate a bitrate higher than the original file, the script **automatically clamps the bitrate down** to prevent up-sampling file bloating.
* **Auto-Downscaling**: Both scripts automatically identify videos larger than 720p (like 1080p or 4K) and scale them down to 720p. Files already at 720p or lower are processed at their native resolution.
* **Smart JSON Metadata Parsing**: Uses robust `ffprobe -of json` mappings to cleanly pull resolutions and codecs without failing on unusual file names or system language barriers.
* **Session Auditing**: Tracks individual processing stopwatches per file alongside a running session runtime counter.

---

## 🛠️ Prerequisites

* **Operating System**: Windows 10 or 11 with PowerShell.
* **Dependencies**: `ffmpeg` and `ffprobe` must be installed on your machine and added to your system environment `PATH` variable.
* **For GPU Script Only**: An NVIDIA graphics card supporting HEVC hardware encoding.
* **PowerShell Execution Policy**: By default, Windows blocks script execution. **Before running the scripts**, you must allow script execution for your current session by running:
```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```
---

## 💻 Configuration & Usage Guide

### Script Parameters

| Parameter | Position | Data Type | Default Value | Description |
| :--- | :---: | :---: | :---: | :--- |
| `MinSize` | 0 | String | `"2GB"` | File size threshold. Smaller files are skipped. (e.g., `"500M"`, `"1G"`, `"2GB"`) |
| `MBPerMinute` | 1 | Integer | `12` | Target storage allowed per minute of video. Acts as the target bitrate for GPU, or the absolute maximum cap ceiling for CPU. |
| `CRF` *(CPU Only)* | 2 | Integer | `26` | Constant Rate Factor. Lower = better quality/larger file. Standard range is `24`-`28`. |

### Practical Examples

Open **PowerShell**, navigate (`cd`) to your video library root path, and execute your chosen script format:

#### Option A: Running the GPU Version (`batch_compress.ps1`)

**Default Execution (Files > 2GB at 12MB/min target):**
```powershell
.\batch_compress.ps1

```

**Targeting smaller files with higher quality margins (Files > 1GB at 25MB/min):**

```powershell
.\batch_compress.ps1 -MinSize "1GB" -MBPerMinute 25

```

#### Option B: Running the CPU Version (`batch_compress_cpu.ps1`)

**Default Execution (CRF 26 balanced profile, 12MB/min hard cap ceiling):**

```powershell
.\batch_compress_cpu.ps1

```

**Aggressive Compression Mode (CRF 28 for extremely tiny file sizes):**

```powershell
.\batch_compress_cpu.ps1 -MinSize "1GB" -MBPerMinute 10 -CRF 28

```

**High-Fidelity Archival Mode (CRF 23 for crisp details, lifting the cap ceiling to 20MB/min):**

```powershell
.\batch_compress_cpu.ps1 "2GB" 20 23

```

---

## 📊 Technical Processing Pipeline

When a file enters the compression pipeline, it undergoes the following automated stages:

1. **Scan**: Discovers `.mp4`, `.mkv`, `.avi`, and `.ts` files inside the target tree matching your `MinSize`.
2. **Deduplication Check**: Instantly skips any files with `_x265` in the title or items where the output file already exists.
3. **Inspection**: Extracts stream tracks, height profiles, and container bitrates natively in clean JSON.
4. **Safety Verification**: Compares target values against source bitrates and applies safety clamping if required.
5. **Transcode Execution**: Spawns your chosen encoder context:
* **GPU**: `Source File ──> CUDA Decode ──> scale_cuda ──> hevc_nvenc ──> Output`
* **CPU**: `Source File ──> Software Decode ──> scale ──> libx265 (CRF) ──> Output`


6. **Reporting**: Computes exact Megabytes saved, prints session timers, and cleans up the thread pipeline for the next file.


