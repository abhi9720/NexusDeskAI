import { Task, Goal, Status, Habit, CustomReminder, HabitLog } from '../types';
import { getMotivationalNudge } from './geminiService';
// FIX: Import 'isPast' from its submodule to fix module not found error.
// FIX: Consolidate `isPast` import with other `date-fns` imports to resolve module resolution error.
import { isToday, format, isPast } from 'date-fns';
import { isDesktop } from './storageService';

const NUDGE_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours
const REMINDER_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

const canShowNotification = (key: string, cooldown: number): boolean => {
    const lastShown = localStorage.getItem(key);
    if (!lastShown) return true;
    return Date.now() - parseInt(lastShown, 10) > cooldown;
};

const notificationShown = (key: string) => {
    localStorage.setItem(key, Date.now().toString());
};

const sendNotification = (title: string, options: NotificationOptions) => {
    // Standard system notification logic
    if (isDesktop) {
        window.desktopStorage.sendNotification({ title, body: options.body as string });
    } else {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { ...options, icon: '/favicon.svg' });
        }
    }

    // NEW: In-app notification fallback for development reliability
    // Dispatches an event that the main App component can listen to.
    window.dispatchEvent(new CustomEvent('show-in-app-notification', { 
        detail: { id: Date.now(), title, body: options.body } 
    }));
};

const REMINDER_SENT_KEY_PREFIX = 'reminder_sent_';

const hasReminderBeenSentToday = (id: string | number): boolean => {
    const key = `${REMINDER_SENT_KEY_PREFIX}${id}`;
    const lastSentStr = localStorage.getItem(key);
    if (!lastSentStr) return false;
    return isToday(new Date(parseInt(lastSentStr, 10)));
};

const markReminderAsSent = (id: string | number) => {
    const key = `${REMINDER_SENT_KEY_PREFIX}${id}`;
    localStorage.setItem(key, Date.now().toString());
};

const checkTaskReminders = (tasks: Task[]) => {
    const now = new Date();
    tasks.forEach(task => {
        if (task.reminder && task.status !== Status.Done) {
            try {
                const reminderTime = new Date(task.reminder);
                // The original logic using a narrow 60-second window was unreliable.
                // This new logic ensures that any reminder scheduled for today that has already passed
                // will trigger a notification, but only once per day.
                if (isToday(reminderTime) && reminderTime <= now && !hasReminderBeenSentToday(`task-${task.id}`)) {
                    sendNotification(`Task Reminder: ${task.title}`, {
                        body: `This task is scheduled for you now. Don't forget!`
                    });
                    markReminderAsSent(`task-${task.id}`);
                }
            } catch (e) {
                console.error(`Invalid reminder date for task ${task.id}:`, task.reminder);
            }
        }
    });
};

const checkHabitReminders = (habits: Habit[], habitLogs: HabitLog[]) => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    habits.forEach(habit => {
        if (habit.reminderTime) {
            const [hours, minutes] = habit.reminderTime.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return;

            const reminderTimeToday = new Date();
            reminderTimeToday.setHours(hours, minutes, 0, 0);

            const habitIsDoneToday = habitLogs.some(log => log.habitId === habit.id && log.date === todayStr);

            // The original logic using a narrow 60-second window was unreliable.
            // This new logic ensures that if the reminder time has passed today, it will fire once.
            if (reminderTimeToday <= now && !habitIsDoneToday && !hasReminderBeenSentToday(`habit-${habit.id}`)) {
                sendNotification(`Habit Reminder: ${habit.name}`, {
                    body: `It's time for your daily habit. Keep up the great work!`
                });
                markReminderAsSent(`habit-${habit.id}`);
            }
        }
    });
};

const checkCustomReminders = (customReminders: CustomReminder[]) => {
    const now = new Date();
    customReminders.forEach(reminder => {
        if (!reminder.isCompleted) {
             try {
                const reminderTime = new Date(reminder.remindAt);
                // The original logic using a narrow 60-second window was unreliable.
                // This new logic ensures that any reminder scheduled for today that has already passed
                // will trigger a notification, but only once per day.
                if (isToday(reminderTime) && reminderTime <= now && !hasReminderBeenSentToday(`custom-${reminder.id}`)) {
                    sendNotification(`Reminder: ${reminder.title}`, {
                        body: `Just a friendly reminder for you.`
                    });
                    markReminderAsSent(`custom-${reminder.id}`);
                }
            } catch (e) {
                console.error(`Invalid reminder date for custom reminder ${reminder.id}:`, reminder.remindAt);
            }
        }
    });
};

const checkTaskDueReminders = (tasks: Task[]) => {
    if (!canShowNotification('lastTaskReminder', REMINDER_COOLDOWN)) return;

    const overdueTasks = tasks.filter(t => t.status !== Status.Done && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)));
    const dueTodayTasks = tasks.filter(t => t.status !== Status.Done && isToday(new Date(t.dueDate)));

    if (overdueTasks.length > 0) {
        sendNotification('Overdue Tasks!', {
            body: `You have ${overdueTasks.length} overdue task(s), including "${overdueTasks[0].title}". Don't forget them!`
        });
        notificationShown('lastTaskReminder');
    } else if (dueTodayTasks.length > 0) {
        sendNotification('Tasks for Today', {
            body: `You have ${dueTodayTasks.length} task(s) due today. You can do it!`
        });
        notificationShown('lastTaskReminder');
    }
};

const triggerAiNudge = async (tasks: Task[], goals: Goal[]) => {
    if (!canShowNotification('lastAiNudge', NUDGE_COOLDOWN)) return;

    const message = await getMotivationalNudge(tasks, goals);
    if (message) {
        sendNotification('Prodify AI Nudge', {
            body: message
        });
        notificationShown('lastAiNudge');
    }
};

export const notificationService = {
    async requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    },
    runAllReminderChecks(tasks: Task[], habits: Habit[], customReminders: CustomReminder[], habitLogs: HabitLog[], goals: Goal[]) {
        if (!('Notification' in window) && Notification.permission !== 'granted' && !isDesktop) {
            return;
        }
        // Specific time-based reminders (runs every minute)
        checkTaskReminders(tasks);
        checkHabitReminders(habits, habitLogs);
        checkCustomReminders(customReminders);

        // General, less frequent reminders (with internal cooldowns)
        checkTaskDueReminders(tasks);
        triggerAiNudge(tasks, goals);
    },
    send: sendNotification,
};
