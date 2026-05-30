<h1 align="center">
  <a name="logo" href="https://deckbrew.xyz/"><img src="https://deckbrew.xyz/static/icon-45ca1f5aea376a9ad37e92db906f283e.png" alt="Deckbrew logo" width="200"></a>
  <br>
  Decky Loader
  <br>
  <a name="download button" href="https://github.com/SteamDeckHomebrew/decky-installer/releases/latest/download/decky_installer.desktop"><img src="./docs/images/download_button.svg"  alt="Download decky" width="150px" style="padding-top: 15px;"></a>
</h1>

<p align="center">
  <a href="https://github.com/SteamDeckHomebrew/decky-loader/releases"><img src="https://img.shields.io/github/downloads/SteamDeckHomebrew/decky-loader/total" /></a>
  <a href="https://github.com/SteamDeckHomebrew/decky-loader/stargazers"><img src="https://img.shields.io/github/stars/SteamDeckHomebrew/decky-loader" /></a>
  <a href="https://github.com/SteamDeckHomebrew/decky-loader/commits/main"><img src="https://img.shields.io/github/last-commit/SteamDeckHomebrew/decky-loader.svg" /></a>
  <a href="https://weblate.werwolv.net/engage/decky/"><img src="https://weblate.werwolv.net/widgets/decky/-/decky/svg-badge.svg" alt="Translation status" /></a>
  <a href="https://github.com/SteamDeckHomebrew/decky-loader/blob/main/LICENSE"><img src="https://img.shields.io/github/license/SteamDeckHomebrew/decky-loader" /></a>
  <a href="https://deckbrew.xyz/discord"><img src="https://img.shields.io/discord/960281551428522045?color=%235865F2&label=discord" /></a>
  <br>
  <br>
<!--  <img src="https://media.discordapp.net/attachments/966017112244125756/1012466063893610506/main.jpg" alt="Decky screenshot" width="80%">-->
</p>

## 🩵 赞助者

[成为赞助者](https://opencollective.com/steamdeckhomebrew)来支持我们的工作！向我们的集体项目捐款将帮助 Decky Loader 开发者支付网络服务器费用、购买新的开发硬件等。

<a href="https://opencollective.com/steamdeckhomebrew"><img alt="Steam Deck Homebrew sponsors on Open Collective" src="https://opencollective.com/steamdeckhomebrew/sponsors.svg?button=true&avatarHeight=46&width=750"></a>

<a href="https://opencollective.com/steamdeckhomebrew"><img alt="Steam Deck Homebrew backers on Open Collective" src="https://opencollective.com/steamdeckhomebrew/backers.svg?button=false&avatarHeight=46&width=750"></a>

## 📖 关于

Decky Loader 是一款用于 Steam Deck 的自制插件启动器。它可以用来[美化菜单界面](https://github.com/suchmememanyskill/SDH-CssLoader)、[更改系统音效](https://github.com/EMERALD0874/SDH-AudioLoader)、[调整屏幕饱和度](https://github.com/libvibrant/vibrantDeck)、[修改更多系统设置](https://github.com/NGnius/PowerTools)，以及[更多功能](https://plugins.deckbrew.xyz/)。

有关 Decky Loader 的更多信息、文档和开发工具，请访问[我们的维基](https://wiki.deckbrew.xyz)。

### 🎨 功能特性

🧹 干净地注入和加载多个插件。  
🔒 在系统更新和重启后仍然保持安装状态。  
🔗 允许插件与启动器之间进行双向通信。  
🐍 支持从 TypeScript React 中运行 Python 函数。  
🌐 允许插件发起完全绕过 CORS 的 fetch 请求。

### 🤔 常见问题

- Syncthing 可能会占用 Steam Deck 上的 8080 端口，而 Decky Loader 需要该端口才能运行。如果您将 Syncthing 作为服务使用，请将其端口更改为其他端口。
  - 建议将 Syncthing 的端口改为 8384。
- 如果您使用的任何软件占用了 1337 或 8080 端口，请将其端口更改为其他端口或卸载该软件。
- 有时 Decky 会在 SteamOS 更新后消失。只需重新运行安装程序并再次安装稳定版即可轻松解决。如果这不起作用，请尝试安装预发布版。如果还是不行，请[查看现有问题](https://github.com/SteamDeckHomebrew/decky-loader/issues)，如果没有相关问题，您可以[提交一个新问题](https://github.com/SteamDeckHomebrew/decky-loader/issues/new?assignees=&labels=bug&template=bug_report.yml&title=%5BBUG%5D+%3Ctitle%3E)。

## 💾 安装

- 安装过程无需设置管理员/sudo 密码。

1. 如果可能，请准备鼠标和键盘。
   - 键盘和鼠标可以通过 USB-C 或蓝牙连接到 Steam Deck。
   - iOS 和 Android 上有许多蓝牙键盘和鼠标应用可用。（Steam Deck 上预装了 KDE Connect）
   - Steam Link 应用可在 [Windows](https://media.steampowered.com/steamlink/windows/latest/SteamLink.zip)、[macOS](https://apps.apple.com/us/app/steam-link/id1246969117) 和 [Linux](https://flathub.org/apps/details/com.valvesoftware.SteamLink) 上使用。它可以很好地替代远程桌面。
   - 如果您没有其他选择，可以使用右侧触控板作为鼠标，并按 <img src="./docs/images/light/steam.svg#gh-dark-mode-only" height=16><img src="./docs/images/dark/steam.svg#gh-light-mode-only" height=16>+<img src="./docs/images/light/x.svg#gh-dark-mode-only" height=16><img src="./docs/images/dark/x.svg#gh-light-mode-only" height=16> 打开屏幕键盘。
1. 按下 <img src="./docs/images/light/steam.svg#gh-dark-mode-only" height=16><img src="./docs/images/dark/steam.svg#gh-light-mode-only" height=16> 按钮并打开电源菜单。
1. 选择"切换到桌面模式"。
1. 在您选择的浏览器中访问此 GitHub 页面。
1. 下载[安装程序文件](https://github.com/SteamDeckHomebrew/decky-installer/releases/latest/download/decky_installer.desktop)。（如果使用 Firefox，文件将命名为 `decky_installer.desktop.download`，请在运行前将其重命名为 `decky_installer.desktop`）
1. 将文件拖到桌面上，然后双击运行。
1. 输入您的管理员密码或允许 Decky 临时将您的管理员密码设置为 `Decky!`（安装程序完成后将删除此密码）。
1. 选择您要安装的 Decky Loader 版本。
   - **最新正式版**  
     面向大多数用户。这是 Decky Loader 的最新稳定版本。
   - **最新预发布版**  
     面向插件开发者。预发布版可能尚未完全稳定，但包含最新更改。有关插件开发的更多信息，请参阅[维基页面](https://wiki.deckbrew.xyz/en/loader-dev/development)。
1. 打开桌面上的"返回游戏模式"快捷方式。

- 对于可以使用 Konsole 的用户，还有一种快速安装方式。运行 `curl -L https://github.com/SteamDeckHomebrew/decky-installer/releases/latest/download/install_release.sh | sh` 并在提示时输入密码。

### 👋 卸载

很抱歉看到您离开！如果您因为遇到问题而考虑卸载，请考虑[提交问题](https://github.com/SteamDeckHomebrew/decky-loader/issues)或[加入我们的 Discord](https://deckbrew.xyz/discord)，以便我们帮助您和其他用户。

1. 按下 <img src="./docs/images/light/steam.svg#gh-dark-mode-only" height=16><img src="./docs/images/dark/steam.svg#gh-light-mode-only" height=16> 按钮并打开电源菜单。
1. 选择"切换到桌面模式"。
1. 再次运行安装程序文件，然后选择 `uninstall decky loader`。

- 对于可以使用 Konsole 的用户，还有一种快速卸载方式。运行 `curl -L https://github.com/SteamDeckHomebrew/decky-installer/releases/latest/download/uninstall.sh | sh` 并在提示时输入密码。

## 🚀 入门指南

现在您已经安装了 Decky Loader，可以开始使用插件了。每个插件由不同的开发者维护，具有各自的用途，但大多数遵循以下通用结构。

### 📦 插件

1. 按下 <img src="./docs/images/light/qam.svg#gh-dark-mode-only" height=16><img src="./docs/images/dark/qam.svg#gh-light-mode-only" height=16> 按钮并导航到 <img src="./docs/images/light/plug.svg#gh-dark-mode-only" height=16><img src="./docs/images/dark/plug.svg#gh-light-mode-only" height=16> 图标。这是 Decky 菜单，用于与插件和启动器本身交互。
1. 选择 <img src="./docs/images/light/store.svg#gh-dark-mode-only" height=16><img src="./docs/images/dark/store.svg#gh-light-mode-only" height=16> 图标打开插件浏览器。在这里您可以查找和安装插件。
   - 您也可以在设置菜单中通过 URL 安装。我们不建议安装来自不可信来源的插件。
1. 要安装插件，请在您想要的插件上选择"安装"按钮。您也可以从下拉菜单中选择一个版本，但不建议这样做。
1. 要更新、卸载和重新加载插件，请导航到 Decky 菜单并选择 <img src="./docs/images/light/gear.svg#gh-dark-mode-only" height=16><img src="./docs/images/dark/gear.svg#gh-light-mode-only" height=16> 图标。
   - 请注意，卸载插件只会移除其插件文件，而不会删除它可能创建的任何其他文件。

### 🛠️ 插件开发

目前还没有完整的插件开发文档。不过，一个好的起点是[插件模板仓库](https://github.com/SteamDeckHomebrew/decky-plugin-template)。如果您有任何问题，请考虑[加入我们的 Discord](https://deckbrew.xyz/discord)。

### 🤝 贡献

有关安装 Decky Loader 开发版本的更多信息，请参阅[有关开发的维基页面](https://wiki.deckbrew.xyz/en/loader-dev/development)。您还可以通过观看[此 YouTube 教程](https://youtu.be/1IAbZte8e7E?t=112)在 Windows 或 Linux 计算机上安装 Steam Deck UI 进行测试。

1. 在开始您的 PR 之前，使用最新的 main 分支提交克隆仓库。
1. 在您的仓库克隆中，运行以下命令。
   ```bash
   cd frontend
   pnpm i # 注意：您可能需要使用 pnpm approve-builds 批准 esbuild 的构建脚本
   pnpm run build
   ```
1. 如果您正在修改 UI，则需要在部署更改到 Steam Deck 之前运行这些命令。
1. 使用 VS Code 任务或 `deck.sh` 脚本将您的更改部署到 Steam Deck 以进行测试。
1. 您将使用 Python 脚本版本测试您的更改。每次都需要构建、部署和重新加载。

⚠️ 如果您因库过时而收到构建错误，请在仓库内运行此命令。

```bash
pnpm update @decky/ui --latest
```

源代码管理和插件部署留给克隆仓库的各自贡献者处理，以保持依赖项为最新版本。

## 📜 鸣谢

插件加载器概念的最初想法基于 [marios8543 的 Steam Deck UI Inject 项目](https://github.com/marios8543/steamdeck-ui-inject)的工作。
