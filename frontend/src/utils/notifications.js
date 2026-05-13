import { API_BASE } from './helpers';

/**
 * Utility to create a system notification that will appear in the NotificationPanel
 * @param {number} userId - The current user ID
 * @param {string} title - Title of the notification
 * @param {string} message - Content of the notification
 * @param {string} type - 'info', 'success', 'warning', 'error'
 */
export const createNotification = async (userId, title, message, type = 'info') => {
  if (!userId) return;
  
  try {
    const res = await fetch(`${API_BASE}/notifications/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        title,
        message,
        type
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};
