'use client';
import React from 'react';
import { useTranslations } from 'next-intl';

/**
 * Bereinigt und zählt Textantworten
 * @param {string[]} results
 * @returns {[text: string, count: number][]} - sortiert nach Häufigkeit
 */
function summarizeTextResults(results) {
    if (!results || !results.length) return [];

    // normalize: trim + lower case
    const cleaned = results
        .map(r => r.trim().toLowerCase())
        .filter(r => r.length > 0);

    // count occurrences
    const counts = {};
    cleaned.forEach(r => {
        counts[r] = (counts[r] || 0) + 1;
    });

    // sort by frequency descending
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    return sorted;
}

/**
 * Komponente zur Darstellung einer Textfrage
 */
export default function TextQuestionCard({ questionData, qi }) {
    const t = useTranslations('SurveyTool.analysis');
    const summary = summarizeTextResults(questionData.results);
    const total = questionData.results.filter(r => r.trim().length > 0).length || 1; // für Balken

    return (
        <article className="border rounded-xl p-4 bg-white shadow-sm mb-6">
            <div className="mb-4">
                <div className="text-xs text-gray-400">{t('question')} {qi + 1}</div>
                <h2 className="text-lg font-semibold">{questionData.question}</h2>
                <div className="text-xs text-gray-500 mt-1">{t('textAnswers')}</div>
            </div>

            <div className="space-y-2">
                {summary.length === 0 ? (
                    <div className="text-gray-400 italic">{t('noAnswers')}</div>
                ) : (
                    summary.map(([text, count], idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <div className="flex-1 text-gray-700">{text}</div>
                            <div className="text-xs text-gray-500">×{count}</div>
                            <div className="flex-1 bg-gray-100 h-2 rounded overflow-hidden">
                                <div
                                    style={{ width: `${(count / total) * 100}%` }}
                                    className="h-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded"
                                ></div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </article>
    );
}
