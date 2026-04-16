# Dastyaab — Local Service Provider Platform

<div align="center">

![Dastyaab Banner](images/home.png)

**A full-stack web platform connecting users with verified local service professionals.**

[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-47A248?style=flat&logo=mongodb&logoColor=white)](https://mongodb.com)
[![HTML5](https://img.shields.io/badge/HTML5-CSS3-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat)](LICENSE)

</div>

---

## Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Roadmap](#roadmap)
- [Author](#author)

---

## About the Project

**Dastyaab** (دستیاب — meaning *"Available"* in Urdu) is a full-stack web platform that bridges the gap between everyday users and local service professionals in Pakistan.

Whether you need an electrician at midnight or a plumber on a weekend, Dastyaab makes it effortless to find, compare, and contact verified local experts — in seconds.

> Built as a real-world full-stack project demonstrating end-to-end web development skills including RESTful API design, MongoDB database modeling, and responsive UI/UX design.

---

## Key Features

### For Users
- **Account Registration & Login** — Secure user authentication with form validation and feedback messages
- **Service Search** — Search providers by service category with instant dynamic results
- **Provider Cards** — Browse verified providers with name, service, location, experience, and contact info
- **Quick Filters** — One-click category chips for Electrician, Plumber, Carpenter, Painter, and more
- **Save Providers** — Bookmark providers for later reference

### For Service Providers
- **Provider Profile Creation** — List your service with full professional details
- **Live Card Preview** — See exactly how your listing looks as you fill the form
- **Instant Visibility** — Appear in search results immediately after listing
- **Direct Contact** — Customers can call you directly from your provider card

### Platform
- **Responsive Design** — Fully works on desktop, tablet, and mobile
- **Professional UI** — Warm editorial design with a cohesive color system and custom typography
- **RESTful API** — Clean, structured backend endpoints
- **MongoDB Integration** — Persistent data storage with Mongoose ODM

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose ODM |
| Typography | Playfair Display + DM Sans (Google Fonts) |
| Dev Tools | Nodemon, MongoDB Compass |

---

## Web Pages

### Home Page
![Home Page](images/home.png)

### Search & Browse Providers
![Search Page](images/Services.png)

### User Registration
![Register Page](images/signup.png)

### User Login
![Login Page](images/login.png)

### Join as Provider
![Provider Page](images/ProviderAccount.png)

---

## Project Structure
```text
Dastyaab/
│
├── backend/
│   ├── models/
│   │   ├── User.js              # User schema (name, email, password)
│   │   └── Provider.js          # Provider schema (name, service, location, experience, contact)
│   │
│   ├── routes/
│   │   ├── auth.js              # POST /api/register, POST /api/login
│   │   └── provider.js          # POST /api/provider, GET /api/providers
│   │
│   ├── server.js                # Express server entry point
│   └── package.json             # Backend dependencies
│
└── frontend/
├── index.html               # Landing page
├── register.html            # User registration
├── login.html               # User login
├── search.html              # Search and browse providers
├── provider.html            # Provider profile creation
│
└── css/
├── style.css            # Shared design system (variables, navbar, buttons, footer)
├── index.css            # Homepage specific styles
├── register.css         # Registration page styles
├── login.css            # Login page styles
├── search.css           # Search page styles
└── provider.css         # Provider page styles
```
## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org) v18 or higher
- [MongoDB](https://mongodb.com) Community Edition (local)
- A modern web browser

### Installation

**Step 1 — Clone or download the repository**

Download the ZIP from GitHub and extract it, or clone it:
```bash
git clone https://github.com/yourusername/dastyaab.git
cd dastyaab
```
**Step 2 — Install backend dependencies**
```bash
cd backend
npm install
```
**Step 3 — Start MongoDB**

Make sure MongoDB is running on your machine:
```bash
# Windows
net start MongoDB
```
**Step 4 — Start the backend server**
```bash
node server.js
```
## Roadmap

### Sprint 1 — Core MVP ✅ Complete
- [x] User registration and login
- [x] Provider profile creation
- [x] Service provider search with dynamic results
- [x] Responsive frontend — 5 fully designed pages
- [x] Separated CSS architecture with shared design system
- [x] MongoDB database integration

### Sprint 2 — Security 🔄 Upcoming
- [ ] Password hashing with bcrypt
- [ ] JWT authentication tokens
- [ ] Protected API routes middleware
- [ ] Logout with token clearing

### Sprint 3 — User Experience
- [ ] User dashboard after login
- [ ] Individual provider detail page
- [ ] Toast notifications
- [ ] Mobile hamburger menu
- [ ] Real-time form validation

### Sprint 4 — Advanced Features
- [ ] Ratings and reviews system
- [ ] Provider edit and delete listing
- [ ] Search filters by location, experience, rating
- [ ] Pagination for search results
- [ ] Profile photo upload

### Sprint 5 — Deployment
- [ ] Environment variables with .env
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Netlify
- [ ] Production testing across devices

---

## Author

**Haris Ahmed Khan**
BS Data Science — 4th Semester
FAST-NUCES Islamabad

[![GitHub](https://img.shields.io/badge/GitHub-yourusername-181717?style=flat&logo=github)](https://github.com/HarisAhmed786)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Haris_Ahmed_Khan-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/haris-ahmed-khan313)

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

Made with ❤️ in Pakistan &nbsp;·&nbsp; Dastyaab © 2025

</div>
