# AUTO INSIGHTS 🚀

**AUTO INSIGHTS** is an AI-powered data analysis platform that transforms raw datasets (CSV, Excel) into interactive, business-ready dashboards. It leverages advanced AI to clean data, identify key performance indicators (KPIs), and generate insightful visualizations with executive summaries.

![AUTO INSIGHTS Logo](https://ais-dev-43lvofwdafjsaf2ue5iwlb-435684326209.asia-southeast1.run.app/logo.png) *Note: Replace with actual logo path if available*

## ✨ Features

- **Automated Data Cleaning**: "God Level" cleaning logic that handles nulls, currency symbols, percentages, and date detection.
- **AI-Driven Insights**: Powered by Groq (Llama 3.3) to generate executive summaries, key business insights, and follow-up questions.
- **Interactive Dashboards**: Dynamic charts (Bar, Line, Pie, Scatter) built with Plotly.js.
- **Global Theming**: Full support for Light and Dark modes with smooth transitions.
- **Secure Authentication**: User management and data isolation via Supabase.
- **File Support**: Upload and analyze CSV and Excel (.xlsx) files.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Lucide React, Framer Motion.
- **Backend**: Node.js, Express, TSX.
- **Database & Auth**: Supabase (PostgreSQL, Auth, Storage).
- **AI Engine**: Groq SDK (Llama 3.3 70B).
- **Visualization**: Plotly.js.

## 🚀 Quick Start

### 1. Prerequisites

- Node.js (v18 or higher)
- A Supabase Project
- A Groq API Key

### 2. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd auto-insights

# Install dependencies
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory and add your credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GROQ_API_KEY=your_groq_api_key
```

### 4. Database Setup (Supabase)

Run the following SQL in your Supabase SQL Editor to create the necessary tables and buckets:

```sql
-- Create datasets table
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  original_filename TEXT NOT NULL,
  storage_path_raw TEXT NOT NULL,
  rows INTEGER,
  cols INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analyses table
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  analysis_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_history table
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can only see their own datasets" ON datasets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own analyses" ON analyses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own chat history" ON chat_history FOR ALL USING (
  EXISTS (
    SELECT 1 FROM datasets d 
    WHERE d.id = chat_history.dataset_id 
    AND d.user_id = auth.uid()
  )
);
```

### 5. Run the App

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

## 📁 Project Structure

- `/src/components`: Reusable UI components.
- `/src/context`: React Context providers (Theme, Auth).
- `/src/pages`: Main application views (Dashboard, Analysis, History).
- `/src/lib`: Utility libraries (Supabase client).
- `/api`: Vercel serverless functions for backend logic.
- `/services`: Modular business logic (AI, Data Processing).
- `server.ts`: Legacy Express backend (refactored to /api).

## 📄 License

MIT License - Copyright (c) 2026 AUTO INSIGHTS
