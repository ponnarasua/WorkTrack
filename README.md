# WorkTrack

A web-based application to manage and track your tasks efficiently in Organization. This project is structured with a dedicated backend API and a modern frontend interface, providing create, read, update, and delete (CRUD) functionality for tasks.

## Features

- User-friendly interface for managing tasks
- Add, edit, and delete tasks
- Responsive design
- RESTful backend API
- Modular codebase (frontend & backend)

## Project Structure

- `backend/` - Backend REST API (Node.js/Express)
- `frontend/task-manager` - Frontend application (React)
  
## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository:**
    ```
    git clone https://github.com/ponnarasua/TASKMANAGER.git
    cd TASKMANAGER
    ```

2. **Install backend dependencies:**
    ```
    cd backend
    npm install
    ```

3. **Install frontend dependencies:**
    ```
    cd ../frontend/task-manager
    npm install
    ```

## Running the Application

1. **Start the backend:**
    ```
    cd backend
    npm run dev
    ```

2. **Start the frontend:**
    ```
    cd ../frontend/task-manager
    npm run dev
    ```

- Frontend runs on: `http://localhost:5173`
- Backend runs on: `http://localhost:5000` (or as configured)

## Contributing

1. Fork it
2. Create your feature branch (git checkout -b feature/fooBar)
3. Commit your changes (git commit -am 'Add some fooBar')
4. Push to the branch (git push origin feature/fooBar)
5. Create a new Pull Request

## License

MIT License
