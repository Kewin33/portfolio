"use client";

import { motion } from 'framer-motion';

export default function PageLayout({ 
  title, 
  subtitle, 
  children 
}: { 
  title: string, 
  subtitle?: string, 
  children: React.ReactNode 
}) {
  return (
    <div className="min-h-screen p-8 md:p-16 lg:p-24 pt-24 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">{title}</h1>
        {subtitle && <p className="text-xl text-gray-500 dark:text-gray-400 mb-12">{subtitle}</p>}
        {!subtitle && <div className="h-12" />}
        
        <div className="space-y-12">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
