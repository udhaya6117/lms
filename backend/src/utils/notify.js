const Notification = require('../models/Notification');

const notify = async ({ user, title, body, type = 'info' }) => {
  if (!user) return;
  await Notification.create({
    user: user._id || user,
    title,
    body,
    type,
    read: false,
  });
};

module.exports = notify;
