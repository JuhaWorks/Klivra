<div align="center">

![Klivra Grand Vision](./assets/hero-banner.png)

<br/>

<img src="./frontend/public/logo.png" width="180" alt="Klivra Logo" />

# 🌌 KLIVRA
### **Modern Project Management & Team Collaboration Hub**
*Real-time visibility for engineering teams.*

---

[**🚀 VIEW LIVE APP**](https://klivra.vercel.app/)

---

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-3D--Visuals-ffffff?style=for-the-badge&logo=threedotjs&logoColor=black)](https://threejs.org/)

**Klivra** is a high-performance project management platform built for modern engineering teams. It combines real-time task tracking, instant messaging, and collaborative tools into a sleek, professional interface.

[**Features**](#-features) • [**Tech Stack**](#-tech-stack) • [**Architecture**](#-architecture) • [**Setup**](#-setup)

</div>

---

## ✨ Features

<div align="center">
<table width="100%">
<tr>
<td width="50%">
<details open>
<summary>📊 <b>Interactive Dashboard</b></summary>
<br/>
A central hub for project health, activity narratives, and team updates. Features a daily "Astronomy Picture of the Day" for an inspiring workspace.
<br/><br/>
![Dashboard](./assets/dashboard-preview.png)
<br/><br/>
<a href="./frontend/src/pages/Home.jsx">View Source →</a>
</details>
</td>
<td width="50%">
<details open>
<summary>📋 <b>Real-time Kanban</b></summary>
<br/>
Highly responsive task management. Drag-and-drop cards, track dependencies, and manage complex projects with zero latency.
<br/><br/>
<a href="./frontend/src/pages/Tasks.jsx">View Source →</a>
</details>
</td>
</tr>
<tr>
<td width="50%">
<details open>
<summary>💬 <b>Instant Messaging</b></summary>
<br/>
Real-time chat with teammate mentions, file sharing, and instant notifications to keep everyone in sync.
<br/><br/>
![Messaging](./assets/messaging-preview.png)
<br/><br/>
<a href="./frontend/src/pages/Networking.jsx">View Source →</a>
</details>
</td>
<td width="50%">
<details open>
<summary>🎨 <b>Collaborative Whiteboard</b></summary>
<br/>
A shared canvas for architectural mapping and planning. Visualize ideas together in real-time.
<br/><br/>
![Whiteboard](./assets/whiteboard-preview.png)
<br/><br/>
<a href="./frontend/src/pages/ProjectWhiteboard.jsx">View Source →</a>
</details>
</td>
</tr>
</table>
</div>

---

## 🖼️ Interface Gallery

![Klivra UI Mosaic](./assets/ui-mosaic.png)

---

## 💻 Tech Stack

<div align="center">
<img src="./assets/tech-blueprint.png" width="100%" />
</div>

<br/>

### **Frontend**
*   **Framework**: React 19 & Vite
*   **State**: Zustand & TanStack Query
*   **UI/UX**: Framer Motion, GSAP, Three.js
*   **Styling**: TailwindCSS 4.0 (Glassmorphism)

### **Backend**
*   **Server**: Node.js & Express 5
*   **Database**: MongoDB & Mongoose
*   **Real-time**: Socket.io & Redis
*   **Services**: Cloudinary (Storage), Brevo (Email), Web-Push (Notifications)

---

## 📐 Architecture

Klivra is designed for speed and data integrity:

> [!TIP]
> **Centralized Real-time Logic**: All live updates are managed through a single store (`useSocketStore.js`). This ensures that notifications and messages appear instantly across all tabs without duplication.

*   **Activity Logging**: Every project update is automatically logged into a readable history feed.
*   **Component-Driven Design**: Built with reusable, high-quality components for a consistent professional look.

---

## 🚀 Setup

### 1. Clone Project
```bash
git clone https://github.com/JuhaWorks/Klivra.git
cd Klivra
```

### 2. Backend Setup
```bash
cd backend
npm install
# Add your MONGO_URI and JWT_SECRET to .env
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

---

<div align="center">

<img src="./frontend/public/logo.png" width="80" alt="Klivra Logo" />

**Professional Project Management.**

[Documentation](https://github.com/JuhaWorks/Klivra) • [Support](https://github.com/JuhaWorks/Klivra) • [API Reference](https://github.com/JuhaWorks/Klivra)

</div>
