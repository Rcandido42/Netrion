# Netrion Roadmap

This document outlines the planned development phases for **Netrion**, an open-source visual computer network simulation and cybersecurity learning desktop application.

---

## 🎯 MVP Milestones

- [x] **Phase 1: Desktop Application Shell & Project System**
  - Native windowing & desktop menus (`Ctrl+N`, `Ctrl+O`, `Ctrl+S`, `Ctrl+Shift+S`)
  - Project file format specification (`.netrion` v1.0.0)
  - Technical Console Anti-Slop Design System (`tokens.css`)
  - Telemetry StatusBar & Action Toolbar

- [ ] **Phase 2: Network Canvas & Devices**
  - Infinite vector grid canvas with smooth pan & zoom
  - Device nodes: PC, Switch (L2), Router (L3), Server
  - Multi-selection, drag & drop, snapping, delete handlers

- [ ] **Phase 3: Connection Infrastructure**
  - Interactive cable connection tool
  - Interface port binding (e.g. `PC-01:eth0` <--> `SW-01:Fa0/1`)
  - Link status evaluation (Up/Down) & cable disconnection

- [ ] **Phase 4: Network Simulation Engine (Core)**
  - Decoupled Discrete Event Simulator (DES) in pure TypeScript
  - Frame queueing & propagation latency
  - MAC Address Learning Table (CAM Table) with switch flooding and aging
  - Real-time event bus dispatching telemetry to UI

- [ ] **Phase 5: L3 Stack (IP, Subnet, MAC, ARP)**
  - IPv4 bitwise subnet calculator
  - ARP Request (Broadcast) & ARP Reply (Unicast) state machines
  - ARP cache table storage & expiration
  - Routing table lookup (Direct Connected, Static Routes, Default Gateway)

- [ ] **Phase 6: Virtual CLI Terminal & ICMP Ping**
  - Dedicated virtual terminal per host
  - Commands: `ping`, `ipconfig`, `arp -a`, `route print`, `clear`, `help`
  - Real round-trip time calculations and ICMP error codes

- [ ] **Phase 7: Vector Packet Flow Visualization**
  - Real-time animated packet particles traversing links
  - Distinct visual encoding per protocol (Ethernet, ARP, IPv4, ICMP)
  - Step-by-step packet inspection panel (L2 / L3 headers)

- [ ] **Phase 8: Challenge & Cybersecurity Learning Hub**
  - Interactive troubleshooting scenarios
  - Goal condition verification engine
  - Challenge 01: "Default Gateway Misconfiguration"
  - Challenge 02: "Subnet Mask Divergence"
  - Challenge 03: "ARP Resolution Blackhole"

- [ ] **Phase 9: Polish, Anti-Slop Audit & Release QA**
  - Heuristic audit matrix validation (Target score ≥ 9.0/10)
  - Full keyboard accessibility
  - Packaging verification for Windows and Linux installers

---

## 🔮 Future Horizons (Post-MVP)
- [ ] DHCP Server & Client auto-configuration
- [ ] DNS resolution simulation
- [ ] Layer 4 TCP / UDP connection states (SYN, ACK, FIN)
- [ ] L3/L4 Stateful Firewall & ACL rule editor
- [ ] PCAP export compatible with Wireshark
- [ ] Custom challenge scenario editor & community sharing
