import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "../styles/globals.css";
import { AuthProvider } from '../context/AuthContext';
import { WorkspaceProvider } from '../context/WorkspaceContext';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PyBlocks - Visual Python Programming",
  description: "Learn Python programming through visual blocks. Drag, drop, and create amazing programs without typing code.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* jQuery - Required by BlockPy */}
        <Script src="/blockpy/libs/jquery/jquery-3.4.1.min.js" strategy="beforeInteractive" />
        {/* Bootstrap - Required for BlockPy UI */}
        <link rel="stylesheet" href="/blockpy/libs/bootstrap/bootstrap.min.css" />
        <Script src="/blockpy/libs/bootstrap/popper.min.js" strategy="beforeInteractive" />
        <Script src="/blockpy/libs/bootstrap/bootstrap.min.js" strategy="beforeInteractive" />
        {/* Knockout - Required by BlockPy for data binding */}
        <Script src="/blockpy/libs/knockout/knockout-3.5.0.js" strategy="beforeInteractive" />
        {/* EasyMDE - Markdown editor */}
        <link rel="stylesheet" href="/blockpy/libs/easymde/easymde.css" />
        <Script src="/blockpy/libs/easymde/easymde.min.js" strategy="beforeInteractive" />
        {/* CodeMirror - Text editor */}
        <link rel="stylesheet" href="/blockpy/libs/codemirror/codemirror.css" />
        <Script src="/blockpy/libs/codemirror/codemirror.js" strategy="beforeInteractive" />
        <Script src="/blockpy/libs/codemirror/python.js" strategy="beforeInteractive" />
        {/* Blockly - Block editor */}
        <Script src="/blockly/blockly_compressed.js" strategy="beforeInteractive" />
        <Script src="/blockly/blocks_compressed.js" strategy="beforeInteractive" />
        <Script src="/blockly/msg/en.js" strategy="beforeInteractive" />
        <Script src="/blockly/python_compressed.js" strategy="beforeInteractive" />
        {/* Skulpt - Python-to-JavaScript compiler */}
        <Script src="/skulpt/skulpt.js" strategy="beforeInteractive" />
        <Script src="/skulpt/skulpt-stdlib.js" strategy="beforeInteractive" />
        {/* BlockMirror - Bidirectional block/text editor */}
        <link rel="stylesheet" href="/BlockMirror/block_mirror.css" />
        <Script src="/BlockMirror/block_mirror.js" strategy="beforeInteractive" />
        {/* BlockPy - Main application */}
        <link rel="stylesheet" href="/blockpy/blockpy.css" />
        <Script src="/blockpy/blockpy.js" strategy="beforeInteractive" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
