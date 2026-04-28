# 🚀 Operations-Research-Final-Project 2026 | Simplex Solver Space   

Simplex Solver is a web application developed for the Operations Research course, focused on solving Linear Programming problems using the Simplex method.

## Team

| Teammate    | Function         |
|-------------|------------------|
|Giovana     | Project Manager & QA |
|Guilherme   | Backend Developer|
|João Pedro  | UI UX Designer & Frontend Developer |
| Tamires    | Data Visualization & Integration Engineer|
---

## About the Project

This project was developed as part of an academic assignment in Operations Research. Its goal is to provide an intuitive and interactive tool to understand and solve Linear Programming problems.

The system focuses on:

- Mathematical modeling of real-world problems  
- Solving optimization problems using the Simplex method  
- Visualizing feasible regions and optimal solutions graphically  

---

## Features

- Input of Linear Programming problems (objective function + constraints)
- Automatic transformation to standard form
- Simplex method (tabular solution)
- Step-by-step iteration visualization
- Graphical representation of:
  - Constraints (lines)
  - Feasible region
  - Optimal solution point
- Responsive interface
---

## Tech Stack

| Layer        | Technology        |
|-------------|------------------|
| Frontend    | React + Vite     |
| Language    | JavaScript       |
| Charts      | Plotly.js        |
| Styling     | CSS / Tailwind   |
| Deployment  | Vercel / Netlify |

---

## Setup

### 1. Clone this repository

```bash
git clone https://github.com/your-username/simplex-solver.git
cd simplex-solver
````

### 2. Install dependencies

```bash
npm install
```

### 3. Run the project

```bash
npm run dev
```

The application will be available at:

```bash
http://localhost:5173
```
# Project Structure
```bash
src/
├── components/
│   ├── InputForm.jsx 
│   ├── SimplexTable.jsx 
│   ├── Graph.jsx 
│
├── utils/
│   ├── simplex.js
│
├── pages/
│   ├── Home.jsx
│   ├── Result.jsx
│
├── App.jsx
├── main.jsx
```

---
# Simplex Algorithm

The system implements the Simplex method following these steps:

- Convert inequalities into equations (standard form)
- Add slack variables
- Build the initial simplex tableau
- Identify entering variable (largest positive coefficient in Z row)
- Apply minimum ratio test to determine leaving variable
- Perform pivot operation
- Repeat until optimality condition is reached

---
# Graph Visualization

The application uses Plotly.js to display:

- Constraint lines
- Feasible region (polygon)
- Optimal solution point

This allows a geometric interpretation of the problem, complementing the algebraic Simplex solution.

---
# How to Run
```bash
npm run dev
```
Or access the deployed app following the link:
```bash
insert link here
```
---
# Objective

The main objective of this project is to:

- Reinforce understanding of Linear Programming
- Connect graphical and algebraic methods
- Demonstrate how optimization problems can be solved computationally

---
