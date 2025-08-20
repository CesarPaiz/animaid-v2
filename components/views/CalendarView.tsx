import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ScheduledMediaList, Media } from '../../types';
import Spinner from '../Spinner';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon as CalendarIconOutline, CloseIcon } from '../icons';

const DayDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    items: ScheduledMediaList[];
    onMediaSelect: (media: Media) => void;
    onRemove: (scheduleId: number) => void;
}> = ({ isOpen, onClose, date, items, onMediaSelect, onRemove }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <h3 className="text-lg font-bold text-white">{date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800"><CloseIcon className="w-5 h-5" /></button>
                </header>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {items.length > 0 ? (
                        <ul className="space-y-3">
                            {items.map(item => (
                                <li key={item.scheduleId} className="flex items-center gap-3 bg-gray-800/50 p-2 rounded-lg">
                                    <img 
                                        src={item.media.coverImage.large} 
                                        alt={item.media.title.romaji}
                                        className="w-12 h-[72px] object-cover rounded-md cursor-pointer"
                                        onClick={() => onMediaSelect(item.media)}
                                    />
                                    <div className="flex-grow min-w-0">
                                        <p 
                                            className="font-semibold text-white truncate cursor-pointer"
                                            onClick={() => onMediaSelect(item.media)}
                                        >
                                            {item.media.title.english || item.media.title.romaji}
                                        </p>
                                        <p className="text-sm text-gray-400 capitalize">{item.media.format?.replace(/_/g, ' ').toLowerCase()}</p>
                                    </div>
                                    <button onClick={() => onRemove(item.scheduleId)} className="p-2 text-gray-500 hover:text-red-400 rounded-full hover:bg-red-500/10 transition-colors">
                                        <CloseIcon className="w-5 h-5"/>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No hay nada agendado para este día.</p>
                    )}
                </div>
            </div>
        </div>
    );
};


const CalendarView: React.FC<{ onMediaSelect: (media: Media) => void }> = ({ onMediaSelect }) => {
    const [displayDate, setDisplayDate] = useState(new Date());
    const [scheduledItems, setScheduledItems] = useState<ScheduledMediaList[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalState, setModalState] = useState<{ isOpen: boolean, date: Date, items: ScheduledMediaList[] }>({ isOpen: false, date: new Date(), items: [] });
    const { getScheduledForDateRange, removeMediaFromSchedule } = useAuth();

    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    
    useEffect(() => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        setIsLoading(true);
        getScheduledForDateRange(formatDate(firstDay), formatDate(lastDay))
            .then(data => {
                setScheduledItems(data);
            })
            .catch(err => console.error("Failed to fetch schedule", err))
            .finally(() => setIsLoading(false));

    }, [year, month, getScheduledForDateRange]);

    const itemsByDate = useMemo(() => {
        return scheduledItems.reduce<Record<string, ScheduledMediaList[]>>((acc, item) => {
            const day = new Date(item.scheduledDate + 'T00:00:00').getDate();
            if (!acc[day]) acc[day] = [];
            acc[day].push(item);
            return acc;
        }, {});
    }, [scheduledItems]);

    const changeMonth = (offset: number) => {
        setDisplayDate(prev => {
            const newDate = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
            newDate.setHours(0,0,0,0);
            return newDate;
        });
    };

    const handleDayClick = (day: number) => {
        const date = new Date(year, month, day);
        const items = itemsByDate[day] || [];
        setModalState({ isOpen: true, date, items });
    };

    const handleRemove = async (scheduleId: number) => {
        const success = await removeMediaFromSchedule(scheduleId);
        if (success) {
            setScheduledItems(prev => prev.filter(item => item.scheduleId !== scheduleId));
            setModalState(prev => ({
                ...prev,
                items: prev.items.filter(item => item.scheduleId !== scheduleId)
            }));
        }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, () => null);
    const allCells = [...blanks, ...calendarDays];

    return (
        <div className="pt-8 md:px-6 lg:px-8">
             <DayDetailModal 
                isOpen={modalState.isOpen}
                onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                date={modalState.date}
                items={modalState.items}
                onMediaSelect={onMediaSelect}
                onRemove={handleRemove}
            />

            <header className="px-4 md:px-0 mb-6">
                <h1 className="text-4xl font-black tracking-tighter text-white"><span className="animated-gradient">Animaid</span></h1>
                <p className="text-gray-400 mt-1">Tu agenda de anime y manga.</p>
            </header>

            <div className="max-w-4xl mx-auto px-4 md:px-0">
                <div className="bg-gray-900 rounded-2xl shadow-lg p-4">
                    <header className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-800"><ChevronLeftIcon className="w-6 h-6"/></button>
                        <h2 className="text-xl font-bold text-white capitalize">{displayDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-800"><ChevronRightIcon className="w-6 h-6"/></button>
                    </header>
                    
                    {isLoading ? <Spinner /> : (
                        <div className="grid grid-cols-7 gap-1">
                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d} className="font-bold text-xs text-center text-gray-500 pb-2">{d}</div>)}
                            {allCells.map((day, i) => {
                                if (!day) return <div key={`blank-${i}`} className="border-t border-gray-800"></div>;
                                const currentDate = new Date(year, month, day);
                                const isToday = currentDate.getTime() === today.getTime();
                                const dayItems = itemsByDate[day] || [];

                                return (
                                    <div key={day} className="relative aspect-square border-t border-gray-800 flex flex-col p-1">
                                        <button onClick={() => handleDayClick(day)} className="absolute inset-0 z-10" aria-label={`Ver detalles para el día ${day}`}></button>
                                        <time dateTime={currentDate.toISOString()} className={`font-semibold text-xs ${isToday ? 'bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-gray-300'}`}>
                                            {day}
                                        </time>
                                        <div className="flex-grow mt-1 overflow-hidden">
                                            {dayItems.length > 0 && (
                                                <div className="flex flex-wrap gap-0.5">
                                                    {dayItems.slice(0, 4).map(item => (
                                                        <img key={item.scheduleId} src={item.media.coverImage.large} alt="" className="w-4 h-4 object-cover rounded-sm"/>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
             <div className="text-center py-16 px-4">
                <CalendarIconOutline className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                <h3 className="text-xl font-semibold text-white">Organiza tu Lista</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    Ve a la página de detalles de cualquier anime o manga y presiona el ícono del calendario para añadirlo a una fecha específica.
                </p>
            </div>
        </div>
    );
};

export default CalendarView;
