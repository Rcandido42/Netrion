# Netrion

> **Visual Computer Network Simulation & Cybersecurity Learning Workstation**

Netrion is an open-source desktop application designed for hands-on computer network simulation, protocol experimentation, and cybersecurity learning. Built from the ground up for Windows and Linux, Netrion pairs an interactive vector network canvas with a deterministic, discrete-event network simulation engine and virtual terminal environments.

---

## ⚡ Highlights

- 🖥️ **True Desktop Application**: Runs natively with system menus, global keyboard shortcuts, local `.netrion` project files, and offline-first persistence.
- 🔬 **Real Discrete-Event Simulation Engine**: Decoupled from the UI, simulating real L2 Ethernet framing, CAM MAC learning, ARP resolution, IPv4 subnetting, and L3 routing tables.
- 📦 **Visual Packet Flow & Telemetry**: Watch packets travel from port to port with real timing, hop transitions, and protocol headers.
- 💻 **Integrated Virtual CLI**: Select any host and open an embedded terminal to execute real commands (`ping`, `ipconfig`, `arp -a`, `route print`).
- 🎯 **Cybersecurity & Network Challenge Lab**: Solve interactive troubleshooting challenges (misconfigured subnets, broken gateways, ARP poisoning concepts).
- 🛡️ **Anti-Slop Technical Aesthetic**: Built strictly following the [Anti-Slop Design framework](https://github.com/Rcandido42/design-anti-ai). Zero purple glowing clouds, zero nested card soup, zero bloated marketing copy—designed strictly like a professional network engineer's workstation.

---

## 🏛️ Architecture

Netrion enforces a strict separation between presentation and networking logic:

```
┌────────────────────────────────────────────────────────┐
│               Netrion Desktop Shell (Electron)         │
│         Native Menus · OS File Dialogs · Shortcuts     │
├────────────────────────────────────────────────────────┤
│                 Presentation UI (React + Vite)         │
│      Network Canvas · Inspector Panel · Terminal CLI    │
├────────────────────────────────────────────────────────┤
│             Network Simulation Engine (Core)           │
│       Pure TypeScript · Discrete Event Simulator       │
│    Ethernet II · ARP Table · IPv4 · ICMP · Routing     │
├────────────────────────────────────────────────────────┤
│             Project File Engine (.netrion v1.0)        │
│          Deterministic Serialization & Validation      │
└────────────────────────────────────────────────────────┘
```

The core engine lives in `src/core/` and contains **zero React, DOM, or browser dependencies**, making it 100% testable via unit tests.

---

## 🚀 Installation & Running

### Prerequisites
- [Node.js](https://nodejs.org/) (version 20 or higher)
- [npm](https://www.npmjs.com/) (version 10 or higher)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Rcandido42/Netrion.git
cd Netrion

# 2. Install dependencies
npm install

# 3. Launch Desktop Application (Windows / Linux)
npm run dev:desktop

# Or start in rapid browser dev mode:
npm run dev
```

### Running Unit Tests

```bash
npm run test
```

---

## 📖 Usage Guide

### 1. Creating Topologies
- Select a device from the top toolbar (**PC**, **Switch**, **Router**, **Server**) and click on the canvas to place it.
- Click the **Connect** tool, click a source port (e.g. `PC-01:eth0`) and connect it to a target port (e.g. `Switch-01:port1`).

### 2. Configuring Devices
- Click any device on the canvas to open the **Inspector Panel** on the right.
- Configure IP address, Subnet Mask, Default Gateway, and view live MAC and ARP tables.

### 3. Testing Communication
- Select a host and open the **Terminal**.
- Test reachability:
  ```bash
  $ ping 192.168.1.1
  ```
- Observe the ARP request broadcasting through the switch, the unicast reply, and the subsequent ICMP Echo Request/Reply packets traveling across the links.

### 4. Saving & Loading Projects
- Use `Ctrl+S` to save your topology as a `.netrion` file.
- Use `Ctrl+O` to open an existing project file.

---

## 🗺️ Roadmap

See [ROADMAP.md](./ROADMAP.md) for full phase-by-phase milestones and feature releases.

---

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) to understand the code organization, unit testing requirements, and Anti-Slop UI principles before submitting a Pull Request.

---

## 📄 License

This project is open-source under the [MIT License](./LICENSE).
