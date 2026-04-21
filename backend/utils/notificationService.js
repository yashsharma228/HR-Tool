const Notification = require('../models/Notification');
const User = require('../models/User');
const Admin = require('../models/Admin');

async function createNotification({ recipientId, actorId = null, type, title, message, link = '', metadata = {} }) {
  if (!recipientId || !type || !title || !message) {
    return null;
  }

  return Notification.create({
    recipient: recipientId,
    actor: actorId,
    type,
    title,
    message,
    link,
    metadata,
  });
}

async function getAdminRecipientIds() {
  const [legacyAdmins, userAdmins] = await Promise.all([
    Admin.find({ role: 'admin' }).select('_id').lean(),
    User.find({ role: 'admin' }).select('_id').lean(),
  ]);

  return [...new Set([...legacyAdmins, ...userAdmins].map((admin) => admin._id.toString()))];
}

async function notifyAdmins({ actorId = null, type, title, message, link = '/admin', metadata = {} }) {
  const adminIds = await getAdminRecipientIds();
  if (!adminIds.length) {
    return [];
  }

  const notifications = adminIds.map((recipientId) => ({
    recipient: recipientId,
    actor: actorId,
    type,
    title,
    message,
    link,
    metadata,
  }));

  return Notification.insertMany(notifications, { ordered: false });
}

module.exports = {
  createNotification,
  notifyAdmins,
};