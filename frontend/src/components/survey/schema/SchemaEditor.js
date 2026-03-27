'use client';
import { useTranslations } from 'next-intl';
import QuestionEditor from "./QuestionEditor";

export default function SchemaEditor({ filename, questions, setQuestions, onSave, onBack }) {
    const t = useTranslations('SurveyTool.schema');
    const addNewQuestion = () => {
        setQuestions([
            ...questions,
            { question: '', type: 'multiple', choice: [], subquestions: [], results: [] }
        ]);
    };

    const updateQuestion = (index, updatedQuestion) => {
        const newQuestions = [...questions];
        newQuestions[index] = updatedQuestion;
        setQuestions(newQuestions);
    };

    const initializeResults = (q) => {
        if (q.results && q.results.length > 0) return q;
        if (q.type === 'multiple') q.results = q.subquestions.map(() => Array(q.choice.length).fill(0));
        else if (q.type === 'single') q.results = Array(q.choice.length).fill(0);
        else if (q.type === 'text') q.results = [];
        return q;
    };

    const handleSave = () => {
        const prepared = questions.map(q => initializeResults({ ...q }));
        onSave(filename, prepared);
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <h1 className="text-4xl font-extrabold text-center mb-8 text-[#1E40AF] dark:text-[#93c5fd]">
                {t('editingFile', { file: filename })}
            </h1>

            <div className="flex justify-center gap-3 mb-8">
                <button
                    onClick={addNewQuestion}
                    className="px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800 transition"
                >
                    {t('newQuestion')}
                </button>

                <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800 transition"
                >
                    {t('save')}
                </button>

                <button
                    onClick={onBack}
                    className="px-4 py-2 rounded-xl bg-gray-500 text-white hover:bg-gray-600 transition"
                >
                    {t('back')}
                </button>
            </div>

            <div className="space-y-4">
                {questions.map((q, i) => (
                    <QuestionEditor
                        key={i}
                        index={i}
                        question={q}
                        updateQuestion={updateQuestion}
                    />
                ))}
            </div>
        </div>
    );
}
