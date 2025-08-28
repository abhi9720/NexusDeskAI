import * as React from 'react';
import { Habit, HabitType, HabitFrequency } from '../types';
import { XMarkIcon } from './icons';
import * as Hi2 from 'react-icons/hi2';

const icons = [
    'HiBookOpen', 'HiBeaker', 'HiCake', 'HiChatBubbleLeftEllipsis', 'HiCodeBracket', 'HiCurrencyDollar', 
    'HiFire', 'HiGift', 'HiGlobeAlt', 'HiHeart', 'HiHome', 'HiMap', 'HiMusicalNote', 'HiPaintBrush', 
    'HiPhone', 'HiPuzzlePiece', 'HiQueueList', 'HiSparkles', 'HiSun', 'HiTrophy', 'HiVideoCamera', 'HiUserGroup'
];

const colors = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#10B981',
  '#06B6D4', '#3B82F6', '#8b64fd', '#A78BFA', '#EC4899', '#78716C'
];

const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];


interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habit: Omit<Habit, 'id' | 'createdAt'> & { id?: number }) => void;
  habitToEdit: Habit | null;
}

const AddHabitModal = ({ isOpen, onClose, onSave, habitToEdit }: AddHabitModalProps) => {
    const [name, setName] = React.useState('');
    const [icon, setIcon] = React.useState(icons[0]);
    const [color, setColor] = React.useState(colors[8]);
    const [type, setType] = React.useState<HabitType>('binary');
    const [goalValue, setGoalValue] = React.useState<number | undefined>(undefined);
    const [goalUnit, setGoalUnit] = React.useState('');
    const [frequency, setFrequency] = React.useState<HabitFrequency>('daily');
    const [targetDays, setTargetDays] = React.useState<number[]>([]);
    const [frequencyValue, setFrequencyValue] = React.useState<number | undefined>(3);
    const [reminderTime, setReminderTime] = React.useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (habitToEdit) {
                setName(habitToEdit.name);
                setIcon(habitToEdit.icon);
                setColor(habitToEdit.color);
                setType(habitToEdit.type);
                setGoalValue(habitToEdit.goalValue);
                setGoalUnit(habitToEdit.goalUnit || '');
                setFrequency(habitToEdit.frequency);
                setTargetDays(habitToEdit.targetDays || []);
                setFrequencyValue(habitToEdit.frequencyValue);
                setReminderTime(habitToEdit.reminderTime || '');
            } else {
                // Reset to defaults
                setName('');
                setIcon(icons[0]);
                setColor(colors[8]);
                setType('binary');
                setGoalValue(undefined);
                setGoalUnit('');
                setFrequency('daily');
                setTargetDays([]);
                setFrequencyValue(3);
                setReminderTime('');
            }
        }
    }, [isOpen, habitToEdit]);

    if (!isOpen) return null;

    const handleToggleDay = (dayIndex: number) => {
        setTargetDays(prev => 
            prev.includes(dayIndex) 
                ? prev.filter(d => d !== dayIndex) 
                : [...prev, dayIndex]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const habitPayload: Omit<Habit, 'id' | 'createdAt'> & { id?: number } = {
            name,
            icon,
            color,
            type,
            goalValue: type === 'quantitative' ? (goalValue || 0) : undefined,
            goalUnit: type === 'quantitative' ? goalUnit : undefined,
            frequency,
            targetDays: frequency === 'weekly' ? targetDays : undefined,
            frequencyValue: frequency === 'x_times_per_week' ? (frequencyValue || 1) : undefined,
            reminderTime: reminderTime || null,
            isArchived: habitToEdit?.isArchived || false,
        };
        
        if (habitToEdit) {
            habitPayload.id = habitToEdit.id;
        }

        onSave(habitPayload);
        onClose();
    };

    const IconComponent = Hi2[icon as keyof typeof Hi2];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-md" onClick={onClose}>
            <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-all animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">{habitToEdit ? 'Edit Habit' : 'Create New Habit'}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><XMarkIcon className="w-6 h-6" /></button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full form-input rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-primary"/>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-2">Icon & Color</label>
                            <div className="flex items-center gap-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-800/50">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: color }}>
                                    {IconComponent && <IconComponent className="w-8 h-8 text-white" />}
                                </div>
                                <div className="flex-grow grid grid-cols-6 gap-2">
                                    {colors.map(c => <button type="button" key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-gray-100 dark:ring-offset-gray-800/50' : ''}`} style={{backgroundColor: c}} />)}
                                </div>
                            </div>
                             <div className="mt-2 grid grid-cols-8 gap-1">
                                {icons.map(iconName => {
                                    const Ico = Hi2[iconName as keyof typeof Hi2];
                                    return <button type="button" key={iconName} onClick={() => setIcon(iconName)} className={`p-2 rounded-md ${icon === iconName ? 'bg-primary/20 text-primary' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{Ico && <Ico/>}</button>
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Habit Type</label>
                            <div className="flex gap-2 p-1 rounded-lg bg-gray-200 dark:bg-gray-700">
                                <button type="button" onClick={() => setType('binary')} className={`flex-1 p-2 text-sm font-semibold rounded-md ${type === 'binary' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}>Yes / No</button>
                                <button type="button" onClick={() => setType('quantitative')} className={`flex-1 p-2 text-sm font-semibold rounded-md ${type === 'quantitative' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}>Quantitative</button>
                            </div>
                            {type === 'quantitative' && (
                                <div className="mt-2 flex gap-2">
                                    <input type="number" placeholder="Goal" value={goalValue ?? ''} onChange={e => setGoalValue(e.target.valueAsNumber)} required className="w-1/2 form-input rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-primary" />
                                    <input type="text" placeholder="Unit (e.g., pages)" value={goalUnit} onChange={e => setGoalUnit(e.target.value)} className="w-1/2 form-input rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-primary" />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Frequency</label>
                            <div className="flex gap-2 p-1 rounded-lg bg-gray-200 dark:bg-gray-700">
                                <button type="button" onClick={() => setFrequency('daily')} className={`flex-1 p-2 text-sm font-semibold rounded-md ${frequency === 'daily' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}>Daily</button>
                                <button type="button" onClick={() => setFrequency('weekly')} className={`flex-1 p-2 text-sm font-semibold rounded-md ${frequency === 'weekly' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}>Specific Days</button>
                                <button type="button" onClick={() => setFrequency('x_times_per_week')} className={`flex-1 p-2 text-sm font-semibold rounded-md ${frequency === 'x_times_per_week' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}>Times a Week</button>
                            </div>
                             {frequency === 'weekly' && (
                                <div className="mt-2 flex justify-between gap-1">
                                    {daysOfWeek.map((day, i) => (
                                        <button type="button" key={i} onClick={() => handleToggleDay(i)} className={`w-10 h-10 rounded-full text-sm font-semibold ${targetDays.includes(i) ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{day}</button>
                                    ))}
                                </div>
                             )}
                             {frequency === 'x_times_per_week' && (
                                 <div className="mt-2 flex items-center gap-2">
                                     <input type="number" min="1" max="7" value={frequencyValue} onChange={e => setFrequencyValue(e.target.valueAsNumber)} className="w-20 form-input rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"/>
                                     <span className="text-sm">times per week</span>
                                 </div>
                             )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reminder Time (optional)</label>
                            <input
                                type="time"
                                value={reminderTime}
                                onChange={e => setReminderTime(e.target.value)}
                                className="w-full form-input rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-6">
                        <button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark">
                            {habitToEdit ? 'Save Changes' : 'Create Habit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddHabitModal;
