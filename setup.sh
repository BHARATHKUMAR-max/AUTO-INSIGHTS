#!/bin/bash

# AUTO INSIGHTS Setup Script

echo "🚀 Starting AUTO INSIGHTS setup..."

# 1. Check for Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install it from https://nodejs.org/"
    exit
fi

# 2. Install Dependencies
echo "📦 Installing npm dependencies..."
npm install

# 3. Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file template..."
    cat <<EOT >> .env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
EOT
    echo "✅ .env file created. Please fill in your credentials."
else
    echo "ℹ️ .env file already exists. Skipping creation."
fi

# 4. Final Instructions
echo ""
echo "---------------------------------------------------"
echo "🎉 Setup complete!"
echo "---------------------------------------------------"
echo "Next steps:"
echo "1. Open the '.env' file and add your Supabase and Groq keys."
echo "2. Run the SQL migrations provided in README.md in your Supabase dashboard."
echo "3. Start the app with: npm run dev"
echo "---------------------------------------------------"
