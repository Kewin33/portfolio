"use client";

import { motion } from 'framer-motion';
import SectionHeader from '@/components/content/SectionHeader';

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
        <SectionHeader title={title} subtitle={subtitle} />
        
        <div className="space-y-12">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
