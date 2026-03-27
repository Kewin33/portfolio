'use client';
import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import FileSelectorTiles from './FileSelectorTiles';
import QuestionList from './QuestionList';
import { listSchemas, loadSchema, saveSchema } from '../api';

function DatenEingebenCore() {
    const t = useTranslations('SurveyTool.data');
    const [mode, setMode] = useState(null); // null = Auswahl, 'edit' = Fragen bearbeiten
    const [filename, setFilename] = useState('');
    const [newFilename, setNewFilename] = useState('');
    const [data, setData] = useState([]);
    const [availableSchemas, setAvailableSchemas] = useState([]);

    useEffect(() => {
        listSchemas()
            .then((files) => setAvailableSchemas(files))
            .catch(console.error);
    }, []);

    const handleLoadSchema = async (file) => {
        if (!file) return;
        try {
            const json = await loadSchema(file);
            setData(json);
            setFilename(file);
            setNewFilename(file);
            setMode('edit');
        } catch (err) {
            console.error(err);
            alert(t('loadError'));
        }
    };

    const handleQuestionChange = (idx, results) => {
        const newData = [...data];
        newData[idx].results = results;
        setData(newData);
    };

    const handleSave = async () => {
        if (!newFilename) return alert(t('missingFilename'));
        try {
            const json = await saveSchema({
                oldFilename: filename,
                filename: newFilename,
                data,
            });
            alert(t('saved'));
            console.log('Ergebnisse gespeichert', json);
            setFilename(newFilename);
        } catch (err) {
            console.error(err);
            alert(t('saveError'));
        }
    };

    // --- Auswahlbildschirm ---
    if (mode === null) {
        return <FileSelectorTiles files={availableSchemas} onSelect={handleLoadSchema} />;
    }

    // --- Editor ---
    if (!data.length) return <div className="text-center mt-10">{t('loadingData')}</div>;

    return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold text-center md:text-left mb-4 md:mb-0">{t('editorTitle')}</h1>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">{t('filenameLabel')}</label>
                        <input
                            type="text"
                            value={newFilename}
                            onChange={(e) => setNewFilename(e.target.value)}
                            className="border rounded px-2 py-1"
                        />
                    </div>
                </div>

                <QuestionList
                    data={data}
                    onChange={handleQuestionChange}
                    onReorder={(newData) => setData(newData)}
                    onDelete={(newData) => setData(newData)}
                    onUpdateQuestion={(newData) => setData(newData)} // 🔹 hier speichern sich Text-Änderungen direkt
                />


                <div className="flex justify-center gap-3 mt-6">
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                    >
                        {t('saveButton')}
                    </button>

                    <button
                        onClick={() => setMode(null)}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                    >
                        {t('backButton')}
                    </button>
                </div>
            </div>

    );
}

export default function DatenEingeben(){
    return <DatenEingebenCore />;
}
