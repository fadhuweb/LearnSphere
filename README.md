# Course Management System

🚀 A full-stack  Course Management System that allows Teachers to manage courses, create topics, add lessons (PDFs, videos, links, and text), add quizzes and track student progress.

---

## 📌 Features

✅ User Roles: Teacher ,Students  and admins
✅ Course Management: Create, edit, and delete courses  
✅ Topics & Lessons: Add topics, lessons (PDFs, videos, links, text) and quizzes 
✅ Authentication: Secure login system  
✅ Real-Time Updates: Fetch courses dynamically  

---

## 📂 Tech Stack

### Frontend  
- **React.js** – Modern UI with Hooks  
- **Tailwind CSS** – Styling  
- **React Router** – Navigation  
- **Axios** – API Requests  

### Backend  
- **Django & Django REST Framework** – Backend API  
- **PostgreSQL / SQLite** – Database  
- **JWT Authentication** – Secure Login  
- **Django ORM** – Data Management  

---

## 🛠 Setup Instructions

### ⿡ Clone the Repository
```bash
git clone https://github.com/fadhuweb/LearnSphere.git

cd Learnsphere
```
### ⿢ Backend Setup

Navigate to the backend directory and set up a virtual environment.

```bash
cd backend
python -m venv venv  # Create virtual environment
source venv/bin/activate  # (Mac/Linux)
venv\Scripts\activate  # (Windows)
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run database migrations:

```bash
python manage.py migrate
python manage.py createsuperuser  # Create admin user
```

Start the backend server:

```bash
python manage.py runserver
```

---

### ⿣ Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd ../frontend
npm install
```

Start the frontend server:

```bash
npm start
```

The React app should now be running. to access the app click the link created by the react app



