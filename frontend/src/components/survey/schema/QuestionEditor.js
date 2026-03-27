'use client'
import React from 'react';
import { useTranslations } from 'next-intl';

export default function QuestionEditor({ question = {}, index, updateQuestion }) {
    const t = useTranslations('SurveyTool.schema');
    const choices = Array.isArray(question.choice) ? question.choice : [];
    const subs = Array.isArray(question.subquestions) ? question.subquestions : [];

    const handleChange = (field, value) => {
        updateQuestion(index, { ...question, [field]: value });
    };

    const handleChoiceChange = (i, value) => {
        const newChoices = [...choices];
        newChoices[i] = value;
        handleChange('choice', newChoices);
    };

    const handleSubquestionChange = (i, value) => {
        const newSubs = [...subs];
        newSubs[i] = value;
        handleChange('subquestions', newSubs);
    };

    const addChoice = () => handleChange('choice', [...choices, '']);
    const addSubquestion = () => handleChange('subquestions', [...subs, '']);

    const removeChoice = (i) => {
        const newChoices = choices.filter((_, idx) => idx !== i);
        handleChange('choice', newChoices);
    };
    const removeSub = (i) => {
        const newSubs = subs.filter((_, idx) => idx !== i);
        handleChange('subquestions', newSubs);
    };

    return (
        <div className="w-full bg-white/70 dark:bg-[#071029]/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-xl transition transform hover:-translate-y-0.5">
            <div className="flex items-center gap-3 mb-3">
                <input
                    type="text"
                    value={question.question || ''}
                    onChange={(e) => handleChange('question', e.target.value)}
                    placeholder={t('questionPlaceholder')}
                    className="flex-1 p-2 rounded-xl bg-white border border-gray-200 dark:bg-[#071029] dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/40 transition placeholder-gray-400 dark:placeholder-gray-500"
                />
                <select
                    value={question.type || 'multiple'}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="p-2 rounded-xl bg-white border border-gray-200 dark:bg-[#071029] dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/40 transition"
                >
                    <option value="multiple">{t('multiple')}</option>
                    <option value="single">{t('single')}</option>
                    <option value="text">{t('text')}</option>
                </select>
            </div>

            {/* inline choices */}
            {(question.type === 'multiple' || question.type === 'single') && (
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-[#1E40AF] dark:text-[#93c5fd]">{t('choices')}</h4>
                        <button
                            onClick={addChoice}
                            className="text-xs px-3 py-1 rounded-full bg-[#1E40AF] text-white hover:brightness-90 transition transform hover:scale-105"
                        >
                            {t('addChoice')}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {choices.map((c, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 bg-gray-50 dark:bg-[#0b1220] border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1 shadow-sm transition transform hover:scale-[1.02]"
                            >
                                <input
                                    value={c}
                                    onChange={(e) => handleChoiceChange(i, e.target.value)}
                                    className="min-w-[90px] w-auto max-w-xs bg-transparent focus:outline-none text-sm text-gray-800 dark:text-gray-100"
                                    placeholder={t('choiceN', { n: i + 1 })}
                                />
                                <button
                                    onClick={() => removeChoice(i)}
                                    aria-label={t('removeChoice')}
                                    className="text-xs px-2 py-0.5 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* inline subquestions for multiple */}
            {question.type === 'multiple' && (
                <div className="mb-1">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-[#1E40AF] dark:text-[#93c5fd]">{t('subquestions')}</h4>
                        <button
                            onClick={addSubquestion}
                            className="text-xs px-3 py-1 rounded-full bg-[#1E40AF] text-white hover:brightness-90 transition transform hover:scale-105"
                        >
                            {t('addSub')}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {subs.map((s, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 bg-gray-50 dark:bg-[#0b1220] border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1 shadow-sm transition transform hover:scale-[1.02]"
                            >
                                <input
                                    value={s}
                                    onChange={(e) => handleSubquestionChange(i, e.target.value)}
                                    className="min-w-[120px] w-auto max-w-[240px] bg-transparent focus:outline-none text-sm text-gray-800 dark:text-gray-100"
                                    placeholder={t('subN', { n: i + 1 })}
                                />
                                <button
                                    onClick={() => removeSub(i)}
                                    aria-label={t('removeSubquestion')}
                                    className="text-xs px-2 py-0.5 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
