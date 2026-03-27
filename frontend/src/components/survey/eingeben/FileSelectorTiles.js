'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import { FileJson } from 'lucide-react';
import CollectionGrid from '@/components/content/CollectionGrid';

export default function FileSelectorTiles({ files, onSelect }) {
    const t = useTranslations('SurveyTool.data');
    if (!files || files.length === 0) {
        return (
            <div className="text-center text-gray-500 mt-10">
                {t('noSchemas')}
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <header className="page-section-head">
                <h1 className="page-section-title">{t('pickSchemaTitle')}</h1>
            </header>

            <CollectionGrid
                items={files.map((file) => ({
                    id: file,
                    title: file,
                    onClick: () => onSelect(file),
                    badgeIcon: <FileJson className="w-8 h-8" strokeWidth={1.5} />,
                }))}
                columns={3}
            />
        </div>
    );
}
