# Contributing to Netrion

Thank you for your interest in contributing to **Netrion**! We are building an open-source, high-fidelity visual computer networking and cybersecurity learning desktop application.

---

## 🧭 Core Architectural Guidelines

1. **Simulation Engine Decoupling**:
   - The core network logic inside `src/core/` **must never** import React components, hooks, or DOM APIs.
   - All network events, packets, ARP resolutions, and routing operations must be deterministic and testable via pure unit tests in `src/core/__tests__/`.

2. **Anti-Slop Design Philosophy**:
   - We strictly adhere to the guidelines in [Anti-Slop Design](https://github.com/Rcandido42/design-anti-ai).
   - **No** purple/indigo glowing gradients, **no** card-in-card nesting, **no** gratuitous pill borders, **no** blurred backdrops.
   - Maintain the **Technical / Console + Industrial Utility** archetype. Use design tokens defined in `src/ui/styles/tokens.css`.

3. **Desktop Native Behavior**:
   - The application must always function as a proper desktop application (keyboard shortcuts, local project `.netrion` files, sober menus, clear system status).

---

## 🛠️ Development Setup

### Prerequisites
- Node.js ≥ 20.0.0
- npm ≥ 10.0.0

### Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/Rcandido42/Netrion.git
cd Netrion

# 2. Install dependencies
npm install

# 3. Start development server (Web mode)
npm run dev

# 4. Start desktop application (Electron desktop window)
npm run dev:desktop

# 5. Run the unit test suite
npm run test
```

---

## 🧪 Testing Guidelines

Before submitting a Pull Request, ensure that all tests pass:

```bash
npm run test
npm run build
```

---

## 📝 Commit Convention

We use standard Conventional Commits:
- `feat: add ARP cache timeout expiration`
- `fix: correct subnet mask bitwise validation on classless addresses`
- `test: add ICMP echo reply routing tests`
- `docs: update roadmap and architecture specification`
