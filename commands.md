# Commands to Run Locally 💻

Follow these steps to get **AUTO INSIGHTS** running on your local machine.

### 1. Install Dependencies
Open your terminal in the project folder and run:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
# On Mac/Linux:
cp .env.example .env

# On Windows:
copy .env.example .env
```
**Important:** Open the `.env` file in a text editor and add your **Supabase** and **Groq** API keys.

### 3. Start the Application
Run the following command to start both the backend server and the frontend:
```bash
npm run dev
```

### 4. Access the Website
Once the terminal says "Server running", open your browser and go to:
**http://localhost:3000**

---

### Troubleshooting
- **Port 3000 busy?** Make sure no other apps are using port 3000.
- **Database errors?** Ensure you have run the SQL migrations found in `README.md` in your Supabase SQL Editor.
- **AI errors?** Check that your `GROQ_API_KEY` is valid and has credits.
