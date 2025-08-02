// Simple date utility functions for the application
export const safeTimestamp = (date) => {
    if (!date) return null;
    if (date instanceof Date) return date;
    return new Date(date);
};

export const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

export const isToday = (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
};

export const isThisWeek = (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    const diffTime = Math.abs(today - checkDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
};

export const isThisMonth = (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return today.getMonth() === checkDate.getMonth() &&
           today.getFullYear() === checkDate.getFullYear();
};

export const getRelativeTimeString = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const past = new Date(date);
    const diffTime = now - past;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays/7)} weeks ago`;
    if (diffDays <= 365) return `${Math.ceil(diffDays/30)} months ago`;
    return `${Math.ceil(diffDays/365)} years ago`;
};
