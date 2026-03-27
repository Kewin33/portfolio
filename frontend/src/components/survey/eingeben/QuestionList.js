'use client';
import React, { useRef, useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Pencil, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import MultipleChoiceTable from './MultipleChoiceTable';
import SingleChoiceTable from './SingleChoiceTable';
import TextResults from './TextResults';

export default function QuestionList({ data, onChange, onReorder, onDelete, onUpdateQuestion }) {
    const t = useTranslations('SurveyTool.data');
    const questionRefs = useRef([]);
    const [voiceActiveIndex, setVoiceActiveIndex] = useState(null);
    const [editIndex, setEditIndex] = useState(null);
    const [tempText, setTempText] = useState('');
    const [collapsed, setCollapsed] = useState({}); // 🔹 speichert Ein-/Ausklappzustand je Frage

    useEffect(() => {
        if (voiceActiveIndex !== null && questionRefs.current[voiceActiveIndex]) {
            questionRefs.current[voiceActiveIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [voiceActiveIndex]);

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(data);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        onReorder(reordered);
    };

    const handleDelete = (index) => {
        const confirmDelete = window.confirm(
            t('confirmDeleteQuestion', { question: data[index].question })
        );
        if (!confirmDelete) return;

        const newData = data.filter((_, i) => i !== index);
        onDelete(newData);
    };

    const handleEditStart = (index, text) => {
        setEditIndex(index);
        setTempText(text);
    };

    const handleEditSave = (index) => {
        const updated = [...data];
        updated[index].question = tempText;
        onUpdateQuestion(updated);
        setEditIndex(null);
    };

    const toggleCollapse = (index) => {
        setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="questions">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {data.map((q, i) => {
                            const isCollapsed = collapsed[i];
                            return (
                                <Draggable key={i} draggableId={`question-${i}`} index={i}>
                                    {(provided) => (
                                        <div
                                            ref={(el) => {
                                                provided.innerRef(el);
                                                questionRefs.current[i] = el;
                                            }}
                                            {...provided.draggableProps}
                                            className={`p-5 rounded-xl shadow border transition-all bg-white relative ${
                                                voiceActiveIndex === i ? 'border-yellow-400 bg-yellow-50' : ''
                                            }`}
                                        >
                                            {/* Header-Zeile */}
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center gap-2 w-full">
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className="cursor-grab text-gray-400 hover:text-gray-600"
                                                    >
                                                        <GripVertical size={18} />
                                                    </div>

                                                    {/* 🔹 Editierbarer Titel */}
                                                    {editIndex === i ? (
                                                        <div className="flex items-center gap-2 w-full">
                                                            <input
                                                                type="text"
                                                                value={tempText}
                                                                onChange={(e) => setTempText(e.target.value)}
                                                                className="border px-2 py-1 rounded text-lg font-medium min-w-full"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => handleEditSave(i)}
                                                                className="text-green-600 hover:text-green-800 z-5"
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <h2
                                                                className="text-lg font-semibold cursor-text hover:bg-gray-100 px-1 rounded"
                                                                onClick={() => handleEditStart(i, q.question)}
                                                            >
                                                                {i + 1}. {q.question}
                                                            </h2>
                                                            <button
                                                                onClick={() => handleEditStart(i, q.question)}
                                                                className="text-gray-400 hover:text-gray-600"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* 🔽 Einklappen / Ausklappen */}
                                                    <button
                                                        onClick={() => toggleCollapse(i)}
                                                        className="text-gray-500 hover:text-gray-700 ml-8"
                                                        title={isCollapsed ? t('expand') : t('collapse')}
                                                    >
                                                        {isCollapsed ? (
                                                            <ChevronRight size={20} />
                                                        ) : (
                                                            <ChevronDown size={20} />
                                                        )}
                                                    </button>

                                                    {/* 🗑️ Löschen mit Bestätigung */}
                                                    <button
                                                        onClick={() => handleDelete(i)}
                                                        className="text-red-500 hover:text-red-700"
                                                        title={t('deleteQuestion')}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Inhalt */}
                                            {!isCollapsed && (
                                                <div className="mt-3">
                                                    {q.type === 'multiple' && (
                                                        <MultipleChoiceTable
                                                            questionData={q}
                                                            onChange={(res) => onChange(i, res)}
                                                            autoStartVoice={voiceActiveIndex === i}
                                                            onVoiceEnd={() => setVoiceActiveIndex(i + 1)}
                                                        />
                                                    )}
                                                    {q.type === 'single' && (
                                                        <SingleChoiceTable
                                                            questionData={q}
                                                            onChange={(res) => onChange(i, res)}
                                                            autoStartVoice={voiceActiveIndex === i}
                                                            onVoiceEnd={() => setVoiceActiveIndex(i + 1)}
                                                        />
                                                    )}
                                                    {q.type === 'text' && (
                                                        <TextResults
                                                            questionData={q}
                                                            onChange={(res) => onChange(i, res)}
                                                            autoStartVoice={voiceActiveIndex === i}
                                                            onVoiceEnd={() => setVoiceActiveIndex(i + 1)}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Draggable>
                            );
                        })}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}
