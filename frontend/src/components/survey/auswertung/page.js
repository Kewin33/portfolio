'use client';
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import Header from './Header';
import FileSelector from './FileSelector';
import QuestionCard from './QuestionCard';
import TextQuestionCard from './TextAnswerCard';
import { loadSchema } from '../api';


export default function AnalyseListCompact() {
    const t = useTranslations('SurveyTool.analysis');
    const [data, setData] = useState(null);
    const [filename, setFilename] = useState('');
    const [weights, setWeights] = useState({mean:1, sd:0});
    const [expandedMap, setExpandedMap] = useState({});


    const handleLoad = async (file) => {
        if (!file) return alert(t('pickFileAlert'));
        try {
            const json = await loadSchema(file);
            if (!json) throw new Error(t('noData'));
            setData(json);
            setFilename(file);
            setExpandedMap({});
        } catch (e) {
            console.error('Fehler beim Laden:', e);
            alert(`${t('loadError')}: ${e.message}`);
        }
    };



    if (!data) return <FileSelector onLoad={handleLoad} />;


    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <Header filename={filename} onReset={() => { setData(null); setFilename(''); }} weights={weights} setWeights={setWeights} />


            <main className="space-y-5">
                {data.map((q, qi) => (
                    q.type === 'text' ?
                        <TextQuestionCard key={qi} questionData={q} qi={qi} /> :
                        <QuestionCard
                            key={qi}
                            q={q}
                            qi={qi}
                            weights={weights}
                            expandedMap={expandedMap}
                            setExpandedMap={setExpandedMap}
                        />
                ))}

            </main>


            <footer className="text-sm text-gray-500">{t('footerHint')}</footer>
        </div>
    );
}