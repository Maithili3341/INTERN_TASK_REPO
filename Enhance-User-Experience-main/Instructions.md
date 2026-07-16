Setup Instructions
1. Download/Export the Project
Export all the files from this Figma Make project to a folder on your computer
2. Open in VS Code
# Open terminal and navigate to your project folder
cd path/to/your/project

# Open VS Code
code .
3. Install Dependencies
Open the integrated terminal in VS Code (Terminal → New Terminal or Ctrl+`) and run:

# If you have npm (comes with Node.js)
npm install

# OR if you have pnpm (faster)
npm install -g pnpm
pnpm install

# OR if you have yarn
npm install -g yarn
yarn install
4. Run the Development Server
# With npm
npm run dev

# OR with pnpm
pnpm dev

# OR with yarn
yarn dev
5. Open in Browser
The terminal will show a URL like: http://localhost:5173
Hold Ctrl (or Cmd on Mac) and click the link, or manually open it in your browser
The application will automatically reload when you make changes to the code
Project Structure
your-project/
├── src/
│   ├── app/
│   │   ├── App.tsx              # Main app component
│   │   └── components/
│   │       ├── GraphExplorer.tsx  # Graph visualization component
│   │       └── ui/               # UI components (buttons, cards, etc.)
│   ├── styles/
│   │   ├── tailwind.css
│   │   └── theme.css
│   └── imports/                  # Your original files
├── package.json                  # Dependencies
└── vite.config.ts               # Vite configuration
Useful VS Code Extensions (Optional)
ES7+ React/Redux/React-Native snippets - For React snippets
Tailwind CSS IntelliSense - For Tailwind class autocomplete
ESLint - For code linting
Prettier - For code formatting
Common Commands
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
Troubleshooting
If you get "command not found" errors:

Make sure Node.js is installed: node --version
Restart your terminal/VS Code after installing Node.js
If port 5173 is already in use:

The dev server will automatically use the next available port (5174, 5175, etc.)
If you see dependency errors:

# Delete node_modules and reinstall
rm -rf node_modules
npm install