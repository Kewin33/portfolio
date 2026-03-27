'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2 } from 'lucide-react';

export default function TextResults({ questionData, onChange, onVoiceEnd, autoStartVoice }) {
    const locale = useLocale();
    const t = useTranslations('SurveyTool.data');
    const [listening, setListening] = useState(false);
    const [debugHeard, setDebugHeard] = useState('');
    const recognitionRef = useRef(null);
    const inputRefs = useRef([]);
    const currentIndexRef = useRef(0);

    const handleTextChange = (index, value) => {
        const newResults = [...questionData.results];
        newResults[index] = value;
        onChange(newResults);
    };

    const handleAdd = () => {
        onChange([...questionData.results, '']);
        setTimeout(() => {
            const lastIndex = questionData.results.length;
            inputRefs.current[lastIndex]?.focus();
        }, 0);
    };

    const handleDelete = (index) => {
        const newResults = questionData.results.filter((_, i) => i !== index);
        onChange(newResults);
    };

    // --- Drag & Drop Handler ---
    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(questionData.results);
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);
        onChange(items);
    };

    // --- Voice Input ---
    const stopVoiceInput = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
            setListening(false);
        }
    };

    const startVoiceInput = () => {
        if (listening) {
            stopVoiceInput();
            return;
        }
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert(t('browserNoVoice'));
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = locale === 'en' ? 'en-US' : 'de-DE';
        recognition.interimResults = false;
        recognition.continuous = true;
        recognitionRef.current = recognition;
        setListening(true);

        currentIndexRef.current = questionData.results.length > 0 ? questionData.results.length - 1 : 0;

        recognition.onresult = (event) => {
            const transcriptRaw = event.results[event.results.length - 1][0].transcript.trim();
            setDebugHeard(transcriptRaw);
            const doneKeyword = t('voiceKeywordDone').toLowerCase();
            const endKeyword = t('voiceKeywordEnd').toLowerCase();
            let text = transcriptRaw.toLowerCase();

            if (text.includes(doneKeyword)) {
                stopVoiceInput();
                if (onVoiceEnd) onVoiceEnd();
                return;
            }

            if (text.includes(endKeyword)) {
                text = text.replace(endKeyword, '').trim();
                handleTextChange(
                    currentIndexRef.current,
                    (questionData.results[currentIndexRef.current] || '') + ' ' + text
                );
                handleAdd();
                currentIndexRef.current++;
            } else {
                handleTextChange(
                    currentIndexRef.current,
                    (questionData.results[currentIndexRef.current] || '') + ' ' + transcriptRaw
                );
            }
        };

        recognition.onerror = (err) => {
            console.error('SpeechRecognition Fehler', err);
            stopVoiceInput();
        };

        recognition.onend = () => stopVoiceInput();
        recognition.start();
    };

    useEffect(() => {
        if (autoStartVoice) startVoiceInput();
    }, [autoStartVoice]);

    return (
        <div className="space-y-3">
            {/* Aufnahme Start/Stop */}
            <div className="flex gap-2">
                <button
                    onClick={startVoiceInput}
                    className={`px-3 py-1 rounded text-white transition ${
                        listening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                    }`}
                >
                    {listening ? t('recordingStop') : t('voiceStart')}
                </button>
                {listening && (
                    <button
                        onClick={() => {
                            stopVoiceInput();
                            if (onVoiceEnd) onVoiceEnd();
                        }}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
                    >
                        {t('debugSayDone')}
                    </button>
                )}
            </div>

            <p className="text-sm text-gray-500">{t('heard')}: {debugHeard || '–'}</p>

            {/* Drag & Drop Liste */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="text-list">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                            {questionData.results.map((text, i) => (
                                <Draggable key={i} draggableId={`text-${i}`} index={i}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="flex items-center gap-2 bg-gray-50 p-1 rounded border shadow-sm"
                                        >
                                            {/* Drag Handle */}
                                            <div
                                                {...provided.dragHandleProps}
                                                className="cursor-grab text-gray-400 hover:text-gray-600"
                                            >
                                                <GripVertical size={18} />
                                            </div>

                                            {/* Eingabefeld */}
                                            <input
                                                ref={(el) => (inputRefs.current[i] = el)}
                                                type="text"
                                                value={text}
                                                onChange={(e) => handleTextChange(i, e.target.value)}
                                                className="p-1 rounded flex-1"
                                            />

                                            {/* Löschen */}
                                            <button
                                                onClick={() => handleDelete(i)}
                                                className="p-2 text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <button
                onClick={handleAdd}
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                {t('newAnswer')}
            </button>
        </div>
    );
}
