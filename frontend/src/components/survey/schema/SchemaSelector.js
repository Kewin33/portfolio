'use client';
import { useState } from "react";
import { useTranslations } from 'next-intl';
import { X, Plus, FileJson } from 'lucide-react';
import CollectionGrid from '@/components/content/CollectionGrid';

export default function SchemaSelector({ availableSchemas, onSelect, onCreate }) {
    const t = useTranslations('SurveyTool.schema');
    const [showPopup, setShowPopup] = useState(false);
    const [newFilename, setNewFilename] = useState('');

    const handleCreate = () => {
        if (!newFilename) return alert(t('missingFilename'));
        onCreate(newFilename);
        setShowPopup(false);
        setNewFilename('');
    };

    return (
        <div className="max-w-6xl mx-auto mt-20 p-6">
            <header className="page-section-head">
                <h1 className="page-section-title">{t('pickSchemaTitle')}</h1>
            </header>

            <CollectionGrid
                items={[
                    ...availableSchemas.map((f) => ({
                        id: f,
                        title: f,
                        onClick: () => onSelect(f),
                        badgeIcon: <FileJson className="w-8 h-8" strokeWidth={1.5} />,
                    })),
                    {
                        id: 'create-new-schema',
                        title: t('new'),
                        onClick: () => setShowPopup(true),
                        badgeIcon: <Plus className="w-8 h-8" strokeWidth={1.5} />,
                    },
                ]}
                columns={4}
            />

            {/* Popup für neuen Dateinamen */}
            {showPopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg w-80 relative">
                        <button
                            onClick={() => setShowPopup(false)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-semibold mb-4">{t('createNewSchema')}</h2>
                        <input
                            type="text"
                            placeholder={t('filenamePlaceholder')}
                            value={newFilename}
                            onChange={(e) => setNewFilename(e.target.value)}
                            className="w-full border rounded p-2 mb-4 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowPopup(false)}
                                className="px-3 py-1 rounded border hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleCreate}
                                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                            >
                                {t('create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
