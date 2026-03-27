'use client';
import { useState } from "react";
import { useTranslations } from 'next-intl';
import { useSchemaManager } from "./useSchemaManager";
import SchemaSelector from "./SchemaSelector";
import SchemaEditor from "./SchemaEditor";

export default function UmfrageSchemaEingeben() {
    const t = useTranslations('SurveyTool.schema');
    const { availableSchemas, loadSchema, saveSchema } = useSchemaManager();
    const [mode, setMode] = useState(null);
    const [filename, setFilename] = useState('');
    const [questions, setQuestions] = useState([]);

    const handleSelect = async (file) => {
        if (!file) return alert(t('pickFileAlert'));
        console.log(file);
        try {
            const data = await loadSchema(file);
            setFilename(file);
            setQuestions(data);
            setMode('edit');
        } catch (err) {
            alert(t('loadError'));
        }
    };

    const handleCreate = (file) => {
        setFilename(file);
        setQuestions([]);
        setMode('edit');
    };

    const handleSave = async (file, data) => {
        try {
            await saveSchema(file, data);
            alert(t('saved', { file }));
        } catch (err) {
            alert(t('saveError'));
        }
    };

    if (mode === null) {
        return (
            <SchemaSelector
                availableSchemas={availableSchemas}
                onSelect={handleSelect}
                onCreate={handleCreate}
            />
        );
    }

    return (
        <SchemaEditor
            filename={filename}
            questions={questions}
            setQuestions={setQuestions}
            onSave={handleSave}
            onBack={() => setMode(null)}
        />
    );
}
