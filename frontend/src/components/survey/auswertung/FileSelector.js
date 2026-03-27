'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import useSchemas from './hooks/useSchemas';
import { FileJson } from 'lucide-react';
import CollectionGrid from '@/components/content/CollectionGrid';

export default function FileSelector({ onLoad }) {
    const t = useTranslations('SurveyTool.analysis');
    const { files, loading } = useSchemas();

    const handleClick = (file) => {
        onLoad(file);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-gray-500">
                {t('loadingFiles')}
            </div>
        );
    }

    if (!files || files.length === 0) {
        return (
            <div className="text-center text-gray-500 mt-10">
                {t('noSchemas')}
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6">
            <header className="page-section-head">
                <h1 className="page-section-title">{t('pickFileTitle')}</h1>
                <p className="page-section-subtitle">{t('pickFileHint')}</p>
            </header>

            <CollectionGrid
                items={files.map((file) => ({
                    id: file,
                    title: file,
                    onClick: () => handleClick(file),
                    badgeIcon: <FileJson className="w-8 h-8" strokeWidth={1.5} />,
                }))}
                columns={3}
            />
        </div>
    );
}
